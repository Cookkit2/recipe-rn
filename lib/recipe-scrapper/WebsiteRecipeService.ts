/**
 * Website Recipe Service
 *
 * Fetches and extracts recipe content from websites.
 * Uses multiple strategies:
 * 1. JSON-LD structured data (Recipe schema)
 * 2. Microdata/RDFa
 * 3. HTML content extraction for AI analysis
 */

import { log } from "~/utils/logger";
import { GeminiAPI } from "~/utils/gemini-api";
import { fetchWithTimeout } from "~/utils/fetch-with-timeout";
import { isValidRecipe } from "./validation-utils";

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

    // Extract structured data
    const structuredData = extractStructuredData(html);
    const hasStructuredData = !!structuredData;

    if (hasStructuredData) {
      log.info("WebsiteRecipeService: Found structured recipe data");
    }

    // Extract page metadata
    const metadata = extractPageMetadata(html);

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

      const response = await gemini.generateContent("gemini-2.0-flash", requestBody);
      const cleanedRecipe = JSON.parse(response);

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
};
