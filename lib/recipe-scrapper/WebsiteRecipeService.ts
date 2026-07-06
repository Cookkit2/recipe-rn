/**
 * Website Recipe Service
 *
 * Fetches and extracts recipe content from websites using a layered
 * extraction chain (highest accuracy / lowest cost first):
 * 1. JSON-LD structured data (schema.org Recipe)  -> extractStructuredData
 * 2. Microdata (itemprop=...)                     -> extractMicrodata
 * 3. RDFa (property="schema:...")                 -> extractRdfa
 * 4. AI extraction from readable HTML             -> extractRecipeFromHtml
 *
 * The three structured-data strategies return the shared `StructuredRecipeData`
 * shape; the AI strategy returns a fully-formed recipe directly. Strategies 1-3
 * are regex-based on purpose (no DOM/parser dependency) to avoid inflating the
 * RN bundle, at the cost of narrower coverage than a real parser. Strategy 4 is
 * the accuracy fallback that turns previously-unimportable pages into editable
 * recipes (see issue #730).
 */

import { log } from "~/utils/logger";
import { GeminiAPI, DEFAULT_GEMINI_MODEL } from "~/utils/gemini-api";
import { fetchWithTimeout } from "~/utils/fetch-with-timeout";
import { isValidRecipe } from "./validation-utils";
import type { GeneratedRecipe } from "~/types/ScrappedRecipe";

/**
 * The structured-data strategy that produced a `StructuredRecipeData`.
 * Recorded in logs/Sentry breadcrumbs so import-failure rate is observable
 * per source (issue #730 acceptance criteria).
 */
export type StructuredDataSource = "json-ld" | "microdata" | "rdfa";

const WEBSITE_FETCH_TIMEOUT_MS = 20_000;

// Constants for default values
const DEFAULT_PREP_MINUTES = 15;
const DEFAULT_COOK_MINUTES = 30;
const DEFAULT_SERVINGS = 4;
const DEFAULT_DIFFICULTY_STARS = 3;
const MAX_CONTENT_LENGTH = 20000;

export interface WebsiteContent {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  htmlContent: string;
  structuredData?: StructuredRecipeData;
  hasStructuredData: boolean;
  /** Which structured-data strategy produced `structuredData` (undefined when AI fallback). */
  structuredDataSource?: StructuredDataSource;
}

export interface StructuredRecipeData {
  name: string;
  description?: string;
  image?: string | string[];
  author?: string | { name: string };
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string;
  recipeIngredient?: string[];
  recipeInstructions?: RecipeInstruction[] | string[] | string;
  nutrition?: {
    calories?: string;
    [key: string]: string | undefined;
  };
  recipeCategory?: string | string[];
  recipeCuisine?: string | string[];
  keywords?: string;
}

interface RecipeInstruction {
  "@type"?: string;
  text?: string;
  name?: string;
}

/**
 * Parse ISO 8601 duration to minutes
 * e.g., "PT30M" -> 30, "PT1H30M" -> 90
 */
export function parseIsoDuration(duration: string | undefined): number | undefined {
  if (!duration) return undefined;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 60 + minutes + Math.ceil(seconds / 60);
}

/**
 * Extract structured recipe data from HTML
 * Looks for JSON-LD schema.org Recipe data
 */
function extractStructuredData(html: string): StructuredRecipeData | undefined {
  try {
    // Find JSON-LD scripts
    const jsonLdMatches = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );

    if (!jsonLdMatches) return undefined;

    for (const match of jsonLdMatches) {
      const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, "");

      try {
        const data = JSON.parse(jsonContent);

        // Handle @graph format
        if (data["@graph"]) {
          const recipe = data["@graph"].find(
            (item: { "@type"?: string | string[] }) =>
              item["@type"] === "Recipe" ||
              (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))
          );
          if (recipe) return recipe as StructuredRecipeData;
        }

        // Direct Recipe object
        if (data["@type"] === "Recipe") {
          return data as StructuredRecipeData;
        }

        // Array of objects
        if (Array.isArray(data)) {
          const recipe = data.find(
            (item) =>
              item["@type"] === "Recipe" ||
              (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))
          );
          if (recipe) return recipe as StructuredRecipeData;
        }
      } catch {
        // Continue to next match
      }
    }

    return undefined;
  } catch (error) {
    log.warn("Error extracting structured data:", error);
    return undefined;
  }
}

/**
 * Decode the most common HTML entities to plain text. Used by the microdata/RDFa
 * extractors so extracted ingredient/step text matches what JSON-LD would carry.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "") // strip any nested tags inside an item's content
    .trim();
}

/**
 * Attribute-value extractor. Given an HTML string and an attribute name
 * (e.g. "itemprop", "property"), returns the raw attribute value for the
 * first matching element, or undefined.
 */
function getAttrValue(html: string, attr: string): string | undefined {
  // Matches attr="value", attr='value', and unquoted attr=value
  const re = new RegExp(`${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const match = html.match(re);
  if (!match) return undefined;
  return (match[1] ?? match[2] ?? match[3] ?? "").trim();
}

/**
 * Collect every element carrying one of `names` in the given attribute, across
 * the whole document. Each entry is `{ outer, content }` where `content` is the
 * element's inner HTML (tag-stripped + entity-decoded by the caller as needed).
 *
 * Regex-based (no DOM parser) to keep the RN bundle small. This handles the
 * common self-closing and paired forms; deeply nested same-tag structures are
 * not guaranteed, which is an accepted tradeoff documented in issue #730.
 */
function findElementsByAttr(
  html: string,
  attr: string,
  names: string[]
): { outer: string; content: string }[] {
  const namePattern = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  // Match an opening tag whose `attr` value is one of `names` (allowing
  // space-separated token lists like itemprop="recipeIngredient name").
  const openTagRe = new RegExp(
    `<([a-zA-Z][\\w-]*)[^>]*\\b${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)')[^>]*>`,
    "gi"
  );

  const results: { outer: string; content: string }[] = [];
  const lowerNames = names.map((n) => n.toLowerCase());
  // Case-insensitive alternation so e.g. "schema:recipeIngredient" matches
  // the lowercased attribute value ("schema:recipeingredient").
  const tokenRe = new RegExp(`^(?:${namePattern})$`, "i");
  let match: RegExpExecArray | null;
  while ((match = openTagRe.exec(html)) !== null) {
    const tagName = match[1] ?? "";
    const attrValue = (match[2] ?? match[3] ?? "").toLowerCase();
    const tokens = attrValue.split(/\s+/);
    if (!tokens.some((t) => lowerNames.includes(t) || tokenRe.test(t))) {
      continue;
    }

    const tagStart = match.index;
    const tagEnd = tagStart + match[0].length;
    // Self-closing form (e.g. <meta itemprop=... content=... />)
    if (match[0].endsWith("/>") || isVoidTag(tagName)) {
      results.push({ outer: match[0], content: getAttrValue(match[0], "content") ?? "" });
      continue;
    }

    // Paired form: find the matching close tag at the same depth.
    const closeRe = new RegExp(`</${tagName}\\s*>`, "gi");
    closeRe.lastIndex = tagEnd;
    const closeMatch = closeRe.exec(html);
    if (closeMatch) {
      const inner = html.slice(tagEnd, closeMatch.index);
      results.push({
        outer: html.slice(tagStart, closeMatch.index + closeMatch[0].length),
        content: inner,
      });
    } else {
      // No closing tag found; treat the opening tag's content attr (if any) as the value.
      results.push({ outer: match[0], content: getAttrValue(match[0], "content") ?? "" });
    }
  }
  return results;
}

const VOID_TAGS = new Set([
  "meta",
  "link",
  "img",
  "input",
  "br",
  "hr",
  "source",
  "track",
  "area",
  "base",
  "col",
  "embed",
  "param",
  "wbr",
]);

function isVoidTag(tagName: string): boolean {
  return VOID_TAGS.has(tagName.toLowerCase());
}

/**
 * Shared builder: turn a set of microdata/RDFa elements (keyed by recipe property)
 * into the `StructuredRecipeData` shape. Returns undefined when no
 * recipeIngredient AND no recipeInstructions were found (i.e. the page has
 * microdata/RDFa but not a recipe).
 */
function buildStructuredDataFromElements(
  byProp: Record<string, { outer: string; content: string }[]>,
  fallbackName?: string,
  fallbackDescription?: string,
  fallbackImage?: string
): StructuredRecipeData | undefined {
  const ingredients = (byProp.recipeIngredient || [])
    .map((el) => decodeEntities(el.content))
    .filter((s) => s.length > 0);

  const instructions = (byProp.recipeInstructions || [])
    .map((el) => decodeEntities(el.content))
    .filter((s) => s.length > 0);

  // Require at least ingredients or instructions to consider this a recipe.
  if (ingredients.length === 0 && instructions.length === 0) {
    return undefined;
  }

  const name =
    (byProp.name && byProp.name[0] && decodeEntities(byProp.name[0].content)) ||
    (byProp.recipeName && byProp.recipeName[0] && decodeEntities(byProp.recipeName[0].content)) ||
    fallbackName ||
    "";

  const description =
    (byProp.description &&
      byProp.description[0] &&
      decodeEntities(byProp.description[0].content)) ||
    fallbackDescription;

  const imageEl = byProp.image && byProp.image[0];
  const image =
    (imageEl && (getAttrValue(imageEl.outer, "content") || getAttrValue(imageEl.outer, "src"))) ||
    fallbackImage;

  const recipeYield =
    byProp.recipeYield && byProp.recipeYield[0]
      ? decodeEntities(byProp.recipeYield[0].content)
      : undefined;
  const prepTime =
    byProp.prepTime && byProp.prepTime[0] ? decodeEntities(byProp.prepTime[0].content) : undefined;
  const cookTime =
    byProp.cookTime && byProp.cookTime[0] ? decodeEntities(byProp.cookTime[0].content) : undefined;
  const totalTime =
    byProp.totalTime && byProp.totalTime[0]
      ? decodeEntities(byProp.totalTime[0].content)
      : undefined;

  const keywords =
    byProp.keywords && byProp.keywords[0] ? decodeEntities(byProp.keywords[0].content) : undefined;
  const recipeCategory =
    byProp.recipeCategory && byProp.recipeCategory[0]
      ? decodeEntities(byProp.recipeCategory[0].content)
      : undefined;
  const recipeCuisine =
    byProp.recipeCuisine && byProp.recipeCuisine[0]
      ? decodeEntities(byProp.recipeCuisine[0].content)
      : undefined;

  return {
    name,
    description,
    image,
    prepTime,
    cookTime,
    totalTime,
    recipeYield,
    recipeIngredient: ingredients,
    // Keep instructions as plain strings; convertStructuredDataToRecipe handles string[].
    recipeInstructions: instructions,
    keywords,
    recipeCategory,
    recipeCuisine,
  };
}

/** Recipe properties we look for, mapped to their microdata itemprop names. */
const MICRODATA_PROPS: Record<string, string[]> = {
  name: ["name"],
  recipeName: ["name"],
  description: ["description"],
  image: ["image"],
  recipeIngredient: ["recipeIngredient", "ingredients"],
  recipeInstructions: ["recipeInstructions", "instructions"],
  recipeYield: ["recipeYield", "yield"],
  prepTime: ["prepTime"],
  cookTime: ["cookTime"],
  totalTime: ["totalTime"],
  keywords: ["keywords"],
  recipeCategory: ["recipeCategory"],
  recipeCuisine: ["recipeCuisine"],
};

/**
 * Extract recipe data from HTML Microdata (itemprop attributes).
 *
 * Supported itemprop subset: recipeIngredient/ingredients,
 * recipeInstructions/instructions, name, description, image, recipeYield,
 * prepTime/cookTime/totalTime, keywords, recipeCategory, recipeCuisine.
 *
 * Returns undefined when no recipe properties are present. Regex-based — no
 * DOM/parser dependency (bundle-size tradeoff, see issue #730).
 */
export function extractMicrodata(
  html: string,
  fallbacks?: { name?: string; description?: string; image?: string }
): StructuredRecipeData | undefined {
  try {
    const byProp: Record<string, { outer: string; content: string }[]> = {};
    for (const [key, names] of Object.entries(MICRODATA_PROPS)) {
      const els = findElementsByAttr(html, "itemprop", names);
      if (els.length > 0) byProp[key] = els;
    }

    // Only treat as a recipe if the page actually uses recipe-scoped microdata.
    const hasRecipeItemprop = byProp.recipeIngredient?.length || byProp.recipeInstructions?.length;
    if (!hasRecipeItemprop) return undefined;

    return buildStructuredDataFromElements(
      byProp,
      fallbacks?.name,
      fallbacks?.description,
      fallbacks?.image
    );
  } catch (error) {
    log.warn("Error extracting microdata:", error);
    return undefined;
  }
}

/** Recipe properties we look for, mapped to their RDFa property names. */
const RDFA_PROPS: Record<string, string[]> = {
  name: ["schema:name", "name"],
  recipeName: ["schema:name", "name"],
  description: ["schema:description", "description"],
  image: ["schema:image", "image"],
  recipeIngredient: ["schema:recipeIngredient", "recipeIngredient"],
  recipeInstructions: ["schema:recipeInstructions", "recipeInstructions"],
  recipeYield: ["schema:recipeYield", "recipeYield", "schema:yield", "yield"],
  prepTime: ["schema:prepTime", "prepTime"],
  cookTime: ["schema:cookTime", "cookTime"],
  totalTime: ["schema:totalTime", "totalTime"],
  keywords: ["schema:keywords", "keywords"],
  recipeCategory: ["schema:recipeCategory", "recipeCategory"],
  recipeCuisine: ["schema:recipeCuisine", "recipeCuisine"],
};

/**
 * Extract recipe data from RDFa (property attributes, e.g. property="schema:recipeIngredient").
 *
 * Same supported subset as microdata. Returns undefined when no recipe
 * properties are present. Regex-based — no DOM/parser dependency.
 */
export function extractRdfa(
  html: string,
  fallbacks?: { name?: string; description?: string; image?: string }
): StructuredRecipeData | undefined {
  try {
    const byProp: Record<string, { outer: string; content: string }[]> = {};
    for (const [key, names] of Object.entries(RDFA_PROPS)) {
      const els = findElementsByAttr(html, "property", names);
      if (els.length > 0) byProp[key] = els;
    }

    const hasRecipeProperty = byProp.recipeIngredient?.length || byProp.recipeInstructions?.length;
    if (!hasRecipeProperty) return undefined;

    return buildStructuredDataFromElements(
      byProp,
      fallbacks?.name,
      fallbacks?.description,
      fallbacks?.image
    );
  } catch (error) {
    log.warn("Error extracting RDFa:", error);
    return undefined;
  }
}

/**
 * Run the structured-data extraction chain in priority order and return the
 * first hit plus which strategy produced it. Used by fetchWebsiteContent.
 */
function extractStructuredRecipe(
  html: string,
  fallbacks: { name?: string; description?: string; image?: string }
): { data: StructuredRecipeData; source: StructuredDataSource } | undefined {
  const jsonLd = extractStructuredData(html);
  if (jsonLd) return { data: jsonLd, source: "json-ld" };

  const microdata = extractMicrodata(html, fallbacks);
  if (microdata) return { data: microdata, source: "microdata" };

  const rdfa = extractRdfa(html, fallbacks);
  if (rdfa) return { data: rdfa, source: "rdfa" };

  return undefined;
}

/**
 * Extract basic page metadata from HTML
 */
function extractPageMetadata(html: string): {
  title: string;
  description?: string;
  imageUrl?: string;
} {
  let title = "";
  let description: string | undefined;
  let imageUrl: string | undefined;

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1]?.trim() ?? "";
  }

  // Try og:title as fallback
  const ogTitleMatch = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogTitleMatch && !title) {
    title = ogTitleMatch[1]?.trim() ?? "";
  }

  // Extract description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) {
    description = descMatch[1]?.trim();
  }

  // Try og:description as fallback
  const ogDescMatch = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogDescMatch && !description) {
    description = ogDescMatch[1]?.trim();
  }

  // Extract image
  const ogImageMatch = html.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogImageMatch) {
    imageUrl = ogImageMatch[1]?.trim();
  }

  return { title, description, imageUrl };
}

/**
 * Clean HTML to extract readable text content
 */
function extractReadableContent(html: string): string {
  // Remove scripts, styles, and other non-content elements
  let content = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Convert common elements to text with structure
  content = content
    .replace(/<h[1-6][^>]*>/gi, "\n\n## ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

  // Limit content length for AI processing
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.substring(0, MAX_CONTENT_LENGTH) + "... [truncated]";
  }

  return content;
}

export const websiteRecipeService = {
  /**
   * Fetch and parse recipe content from a website URL
   */
  async fetchWebsiteContent(url: string): Promise<WebsiteContent> {
    log.info("WebsiteRecipeService: Fetching URL:", url);

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CookkitBot/1.0; +https://cookkit.app)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
      WEBSITE_FETCH_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    log.debug("WebsiteRecipeService: Fetched", html.length, "bytes");

    // Extract page metadata first so structured-data extractors can fall back
    // to it for name/description/image when the markup omits them.
    const metadata = extractPageMetadata(html);

    // Extract structured data via the layered chain: JSON-LD -> microdata -> RDFa.
    const fallbacks = {
      name: metadata.title,
      description: metadata.description,
      image: metadata.imageUrl,
    };
    const structuredHit = extractStructuredRecipe(html, fallbacks);
    const structuredData = structuredHit?.data;
    const structuredDataSource = structuredHit?.source;
    const hasStructuredData = !!structuredData;

    if (hasStructuredData) {
      log.info(
        `WebsiteRecipeService: Found structured recipe data (source: ${structuredDataSource})`
      );
    }

    // Use structured data to enhance metadata if available
    const title = structuredData?.name || metadata.title;
    const description = structuredData?.description || metadata.description;
    let imageUrl = metadata.imageUrl;

    if (structuredData?.image) {
      if (typeof structuredData.image === "string") {
        imageUrl = structuredData.image;
      } else if (Array.isArray(structuredData.image) && structuredData.image.length > 0) {
        imageUrl = structuredData.image[0];
      }
    }

    // Extract readable content for AI analysis
    const htmlContent = extractReadableContent(html);

    return {
      url,
      title,
      description,
      imageUrl,
      htmlContent,
      structuredData,
      hasStructuredData,
      structuredDataSource,
    };
  },

  /**
   * Convert structured recipe data to our GeneratedRecipe format
   * This is used when the website has proper schema.org data
   */
  convertStructuredDataToRecipe(data: StructuredRecipeData, sourceUrl: string) {
    // Parse ingredients with improved parsing
    const ingredients = (data.recipeIngredient || []).map((ing) => {
      // Try to parse common ingredient formats:
      // "2 cups flour", "1/2 cup sugar", "3-4 tablespoons butter"
      const match = ing.match(/^([\d./\-\s]+)?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)?\s+(.+)$/);
      if (match) {
        const quantityStr = match[1]?.trim();
        let quantity = 1;

        // Handle fractions and ranges (e.g., "1/2", "3-4")
        if (quantityStr) {
          if (quantityStr.includes("/")) {
            const parts = quantityStr.split("/");
            quantity = parseFloat(parts[0] || "1") / parseFloat(parts[1] || "1");
          } else if (quantityStr.includes("-")) {
            // Take average of range
            const parts = quantityStr.split("-");
            quantity = (parseFloat(parts[0] || "1") + parseFloat(parts[1] || "1")) / 2;
          } else {
            quantity = parseFloat(quantityStr) || 1;
          }
        }

        return {
          name: match[3]?.trim().toLowerCase() || ing.toLowerCase(),
          quantity,
          unit: match[2]?.trim().toLowerCase() || "piece",
        };
      }
      // Fallback for ingredients without quantities
      return {
        name: ing.toLowerCase().trim(),
        quantity: 1,
        unit: "piece",
      };
    });

    // Parse instructions
    let steps: { step: number; title: string; description: string }[] = [];

    if (data.recipeInstructions) {
      if (typeof data.recipeInstructions === "string") {
        steps = data.recipeInstructions
          .split(/\n|(?:\d+\.\s)/)
          .filter(Boolean)
          .map((text, index) => ({
            step: index + 1,
            title: `Step ${index + 1}`,
            description: text.trim(),
          }));
      } else if (Array.isArray(data.recipeInstructions)) {
        steps = data.recipeInstructions.map((inst, index) => {
          const text = typeof inst === "string" ? inst : inst.text || "";
          const name = typeof inst === "object" ? inst.name : undefined;
          return {
            step: index + 1,
            title: name || `Step ${index + 1}`,
            description: text.trim(),
          };
        });
      }
    }

    // Parse times
    const prepMinutes = parseIsoDuration(data.prepTime) || DEFAULT_PREP_MINUTES;
    const cookMinutes = parseIsoDuration(data.cookTime) || DEFAULT_COOK_MINUTES;

    // Parse servings
    let servings = DEFAULT_SERVINGS;
    if (data.recipeYield) {
      // Handle both string and array formats (some sites use arrays like ["5"])
      const yieldValue = Array.isArray(data.recipeYield) ? data.recipeYield[0] : data.recipeYield;
      if (typeof yieldValue === "string") {
        const match = yieldValue.match(/(\d+)/);
        if (match) {
          servings = parseInt(match[1] || "0", 10);
        }
      } else if (typeof yieldValue === "number") {
        servings = yieldValue;
      }
    }

    // Parse calories
    let calories: number | undefined;
    if (data.nutrition?.calories) {
      const match = data.nutrition.calories.match(/(\d+)/);
      if (match) {
        calories = parseInt(match[1] || "0", 10);
      }
    }

    // Parse tags
    const tags: string[] = [];
    if (data.recipeCategory) {
      const categories = Array.isArray(data.recipeCategory)
        ? data.recipeCategory
        : [data.recipeCategory];
      tags.push(...categories.map((c) => c.toLowerCase()));
    }
    if (data.recipeCuisine) {
      const cuisines = Array.isArray(data.recipeCuisine)
        ? data.recipeCuisine
        : [data.recipeCuisine];
      tags.push(...cuisines.map((c) => c.toLowerCase()));
    }
    if (data.keywords) {
      tags.push(...data.keywords.split(",").map((k) => k.trim().toLowerCase()));
    }

    return {
      title: data.name,
      description: data.description || "",
      prepMinutes,
      cookMinutes,
      servings,
      difficultyStars: DEFAULT_DIFFICULTY_STARS,
      ingredients,
      steps,
      tags: [...new Set(tags)], // Remove duplicates
      sourceUrl,
      calories,
    };
  },

  /**
   * Clean and normalize recipe data using Gemini Flash
   * This improves the quality of structured data from websites by:
   * - Normalizing ingredient names to singular, standardized forms
   * - Improving step titles and descriptions
   * - Estimating missing values
   * - Adding relevant tags
   */
  async cleanRecipeWithGemini(recipe: {
    title: string;
    description: string;
    prepMinutes: number;
    cookMinutes: number;
    servings: number;
    difficultyStars: number;
    ingredients: { name: string; quantity: number; unit: string }[];
    steps: { step: number; title: string; description: string }[];
    tags: string[];
    sourceUrl: string;
    calories?: number;
  }): Promise<{
    title: string;
    description: string;
    prepMinutes: number;
    cookMinutes: number;
    servings: number;
    difficultyStars: number;
    ingredients: { name: string; quantity: number; unit: string }[];
    steps: { step: number; title: string; description: string }[];
    tags: string[];
    sourceUrl: string;
    calories?: number;
  }> {
    try {
      log.info("WebsiteRecipeService: Cleaning recipe with Gemini...");

      const gemini = new GeminiAPI();

      const prompt = `
You are a recipe data cleaning assistant. Clean and normalize the following recipe data.

INPUT RECIPE:
${JSON.stringify(recipe, null, 2)}

CLEANING INSTRUCTIONS:
1. **Ingredients**: 
   - Normalize names to singular form (e.g., "onions" → "onion", "tomatoes" → "tomato")
   - Standardize common names (e.g., "bell pepper" not "capsicum")
   - Keep names lowercase
   - Ensure units are standardized (cup, tablespoon, teaspoon, gram, oz, pound, piece, etc.)
   - Convert fractions in quantities to decimals (e.g., 1/2 → 0.5)
   - Remove any HTML entities or special characters from names

2. **Steps**:
   - Create concise, action-oriented titles (e.g., "Sauté the aromatics", "Simmer the sauce")
   - Ensure descriptions are clear and complete
   - Remove any HTML entities or formatting artifacts
   - Include temperatures and times where mentioned

3. **Tags**:
   - Add relevant cuisine tags if missing (e.g., "italian", "asian", "mexican")
   - Add meal type tags (e.g., "dinner", "lunch", "breakfast")
   - Add dietary tags if applicable (e.g., "vegetarian", "gluten-free")
   - Keep tags lowercase
   - Remove duplicate or redundant tags

4. **Other fields**:
   - Keep title properly capitalized and without punctuation
   - Remove emotional/subjective terms from title (e.g., "Delicious", "Best Ever", "Juicy", "Authentic")
   - Ensure description is a clean 1-2 sentence summary
   - Estimate difficultyStars (1-5) based on technique complexity if it seems wrong
   - Estimate calories if not provided (based on common nutritional data)

Return the cleaned recipe as valid JSON with the exact same structure as the input.
      `.trim();

      const requestBody = JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              prepMinutes: { type: "integer" },
              cookMinutes: { type: "integer" },
              servings: { type: "integer" },
              difficultyStars: { type: "integer" },
              calories: { type: "integer" },
              tags: {
                type: "array",
                items: { type: "string" },
              },
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    quantity: { type: "number" },
                    unit: { type: "string" },
                  },
                  required: ["name", "quantity", "unit"],
                },
              },
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    step: { type: "integer" },
                    title: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["step", "title", "description"],
                },
              },
            },
            required: [
              "title",
              "description",
              "prepMinutes",
              "cookMinutes",
              "servings",
              "difficultyStars",
              "ingredients",
              "steps",
              "tags",
            ],
          },
          temperature: 0.2,
        },
      });

      const response = await gemini.generateContent(DEFAULT_GEMINI_MODEL, requestBody);
      let cleanedRecipe;
      try {
        cleanedRecipe = JSON.parse(response);
      } catch (parseError) {
        log.warn("WebsiteRecipeService: Failed to parse Gemini response as JSON", parseError);
        return recipe;
      }

      // Validate cleaned recipe
      if (!isValidRecipe(cleanedRecipe)) {
        log.warn("WebsiteRecipeService: Gemini produced invalid recipe, falling back to original");
        return recipe;
      }

      log.info("WebsiteRecipeService: Recipe cleaned successfully");

      return {
        ...cleanedRecipe,
        sourceUrl: recipe.sourceUrl, // Preserve original source URL
      };
    } catch (error) {
      log.warn(
        "WebsiteRecipeService: Failed to clean recipe with Gemini, using original data",
        error
      );
      // Return original recipe if cleaning fails
      return recipe;
    }
  },

  /**
   * AI fallback for pages with NO structured data of any kind.
   *
   * Feeds the readable HTML content (already stripped of nav/footer/scripts and
   * capped at MAX_CONTENT_LENGTH by extractReadableContent) to Gemini via the
   * existing RecipeAnalyzer.analyzeWebsiteForRecipe path, which produces a
   * confidence-scored RecipeAnalysisResult. The recipe is validated through the
   * shared isValidRecipe gate before being returned.
   *
   * Returns the GeneratedRecipe and its confidence so the caller (recipeImportApi)
   * can apply the MIN_RECIPE_CONFIDENCE gate. This is the "isolate + validate the
   * recognition layer" lesson from the SnapChef prototype (issue #730, [F4]).
   *
   * RecipeAnalyzer is loaded via dynamic import to preserve the recipe-scrapper
   * layer's static-import boundary (it must not statically import into data/db,
   * per the CLAUDE.md dynamic-import discipline).
   */
  async extractRecipeFromHtml(
    websiteContent: WebsiteContent,
    sourceUrl: string
  ): Promise<{ recipe: GeneratedRecipe | undefined; confidence: number }> {
    try {
      log.info("WebsiteRecipeService: Falling back to AI extraction from readable HTML");

      // Dynamic import keeps the recipe-scrapper <-> data/db boundary intact.
      const { RecipeAnalyzer } = await import("./youtube/RecipeAnalyzer");
      const analyzer = new RecipeAnalyzer();

      const analysisResult = await analyzer.analyzeWebsiteForRecipe(websiteContent, sourceUrl);

      if (!analysisResult.isCookingVideo || !analysisResult.recipe) {
        log.warn(
          `WebsiteRecipeService: AI fallback did not detect a recipe (confidence: ${analysisResult.confidence})`
        );
        return { recipe: undefined, confidence: analysisResult.confidence };
      }

      // Route every branch through the shared validation gate.
      if (!isValidRecipe(analysisResult.recipe)) {
        log.warn("WebsiteRecipeService: AI fallback produced an invalid recipe");
        return { recipe: undefined, confidence: analysisResult.confidence };
      }

      return { recipe: analysisResult.recipe, confidence: analysisResult.confidence };
    } catch (error) {
      log.warn("WebsiteRecipeService: AI extraction from HTML failed:", error);
      return { recipe: undefined, confidence: 0 };
    }
  },
};
