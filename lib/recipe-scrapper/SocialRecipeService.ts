/**
 * Social Media Recipe Service
 *
 * Handles recipe extraction from TikTok and Instagram videos/posts.
 * Uses Gemini's video understanding capabilities.
 */

import { GeminiAPI, DEFAULT_GEMINI_MODEL } from "~/utils/gemini-api";
import { log } from "~/utils/logger";
import type { RecipeAnalysisResult, GeneratedRecipe } from "~/types/ScrappedRecipe";
import { isValidRecipe } from "./validation-utils";

export interface SocialMediaContent {
  platform: "tiktok" | "instagram";
  url: string;
  postId?: string;
}

export class SocialRecipeService {
  private gemini: GeminiAPI;

  constructor() {
    this.gemini = new GeminiAPI();
  }

  /**
   * Analyze a TikTok or Instagram video for recipe content
   *
   * strategy:
   * 1. Fetch the page HTML
   * 2. Extract metadata (title, description, etc.)
   * 3. Send metadata to Gemini for analysis
   * (We don't send the video file directly because Gemini often can't access social URLs)
   */
  async analyzeForRecipe(content: SocialMediaContent): Promise<RecipeAnalysisResult> {
    try {
      log.info(`SocialRecipeService: Analyzing ${content.platform} content...`);

      // 1. Fetch page content to get metadata
      const metadata = await this.fetchPageMetadata(content.url);
      log.info("SocialRecipeService: Extracted metadata title:", metadata.title);

      // 2. Build prompt with metadata
      const prompt = this.buildAnalysisPrompt(content, metadata);

      // 3. Send to Gemini (Text-only analysis based on metadata)
      // Note: We are NOT sending fileData anymore because typical social URLs
      // are not direct video files and Gemini fails to access them.
      // We rely on the metadata/description extracted from the page.
      const requestBody = JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: this.getRecipeSchema(),
          temperature: 0.4, // Slightly higher creativity for inferring from text
        },
      });

      const response = await this.gemini.generateContent(DEFAULT_GEMINI_MODEL, requestBody);

      const result = this.parseResponse(response, content.url);
      return result;
    } catch (error) {
      log.error(`Error analyzing ${content.platform} content:`, error);

      return {
        isCookingVideo: false,
        confidence: 0,
        errorMessage:
          error instanceof Error ? error.message : `Failed to analyze ${content.platform} content`,
      };
    }
  }

  /**
   * Fetch page HTML and extract metadata
   */
  private async fetchPageMetadata(url: string): Promise<{
    title: string;
    description: string;
    image?: string;
  }> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const html = await response.text();

      // Helper to extract meta tags
      const getMeta = (property: string) => {
        const match = html.match(
          new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i")
        );
        return match ? match[1] : "";
      };

      let title = getMeta("og:title") || getMeta("twitter:title") || "";
      let description =
        getMeta("og:description") || getMeta("twitter:description") || getMeta("description") || "";
      const image = getMeta("og:image") || getMeta("twitter:image");

      // Instagram-specific scraping to get the full caption
      // Often hidden in <script type="application/ld+json">
      if (url.includes("instagram.com")) {
        // Try Schema.org JSON-LD which often contains the caption
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (jsonLdMatch && jsonLdMatch[1]) {
          try {
            const data = JSON.parse(jsonLdMatch[1]);
            // Schema.org/SocialMediaPosting often stores caption in 'articleBody' or 'headline' or 'text'
            // Sometimes it's a generic object with 'name' or 'description'

            // Helper to recursively find relevant text in JSON structure
            const findText = (obj: any): string => {
              if (!obj) return "";
              if (obj.articleBody) return obj.articleBody;
              if (obj.text) return obj.text;
              if (obj.headline) return obj.headline;
              if (obj.description && obj.description.length > description.length)
                return obj.description;
              return "";
            };

            const extractedText = findText(data);
            if (extractedText) {
              description = extractedText;
            }

            if (data.name) title = data.name;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      return { title, description, image };
    } catch (error) {
      log.warn("SocialRecipeService: Failed to fetch metadata", error);
      return { title: "", description: "" };
    }
  }

  /**
   * Build the analysis prompt for social media videos
   */
  private buildAnalysisPrompt(
    content: SocialMediaContent,
    metadata: { title: string; description: string }
  ): string {
    const platformName = content.platform === "tiktok" ? "TikTok" : "Instagram";

    return `
You are a recipe extraction assistant. Analyze this ${platformName} post to extract the recipe.

URL: ${content.url}
PLATFORM: ${platformName}
POST TITLE: ${metadata.title}
POST DESCRIPTION: ${metadata.description}

INSTRUCTIONS:
1. Analyze the title and description to determine if this is a cooking/recipe post (isCookingVideo: true/false).
   - NOTE: Since you cannot view the video, rely HEAVILY on the text. If it mentions food, cooking, or ingredients, assume it IS a recipe video.

2. Provide a confidence score (0-1).
   - If the description clearly contains ingredients and steps -> High confidence (0.8-1.0)
   - If the description describes a dish but lacks quantities -> Medium confidence (0.6-0.8)
   - If the description is empty or generic -> Low confidence (0.0-0.4)

3. Extract the recipe from the text context:
   - Title: Use the post title or infer a descriptive title
   - Description: Summarize the dish
   - Ingredients & Steps:
     - CAREFULLY PARSE the description for ingredients and instructions.
     - Instagram citations often put the full recipe in the caption/description.
     - If the full recipe is NOT in the text, do NOT make up "Unknown Ingredient" or generic steps.
     - You may estimate quantities if the ingredient is named (e.g. "salt" -> "1 tsp salt"), but do not invent ingredients.

4. Fills:
   - Prep/Cook time: Estimate if not found (e.g. 15m prep, 15m cook)
   - Servings: Default to 2
   - Difficulty: Estimate

IMPORTANT GUIDELINES:
- **CRITICAL**: If you cannot find any ingredients or steps in the text, return \`confidence: 0\`.
- DO NOT generate a "placeholder" recipe if you can't find the real one.
- If you return confidence < 0.5, the app will show an error to the user, which is BETTER than showing a fake recipe.

Return a valid JSON response matching the schema.
    `.trim();
  }

  /**
   * JSON Schema for Gemini response
   */
  private getRecipeSchema() {
    return {
      type: "object",
      properties: {
        isCookingVideo: { type: "boolean" },
        confidence: { type: "number" },
        errorMessage: { type: "string" },
        recipe: {
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
                  notes: { type: "string" },
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
          ],
        },
      },
      required: ["isCookingVideo", "confidence"],
    };
  }

  /**
   * Parse Gemini response into RecipeAnalysisResult
   */
  private parseResponse(response: string, sourceUrl: string): RecipeAnalysisResult {
    try {
      log.debug("SocialRecipeService: Response:", response);

      const parsed = JSON.parse(response);

      if (typeof parsed.isCookingVideo !== "boolean") {
        throw new Error("Missing isCookingVideo field");
      }

      const result: RecipeAnalysisResult = {
        isCookingVideo: parsed.isCookingVideo,
        confidence: parsed.confidence ?? 0,
        errorMessage: parsed.errorMessage,
      };

      if (parsed.isCookingVideo && parsed.recipe) {
        const ingredients = this.normalizeIngredients(parsed.recipe.ingredients);
        const steps = this.normalizeSteps(parsed.recipe.steps);

        const potentialRecipe = {
          ...parsed.recipe,
          ingredients,
          steps,
        };

        // Validate recipe content
        if (!isValidRecipe(potentialRecipe)) {
          log.warn("SocialRecipeService: Recipe rejected due to validation failure");
          return {
            isCookingVideo: true,
            confidence: 0, // Force confidence to 0 to trigger error toast
            errorMessage: "Could not extract valid ingredients or steps from this post.",
          };
        }

        result.recipe = {
          title: parsed.recipe.title || "Untitled Recipe",
          description: parsed.recipe.description || "",
          prepMinutes: parsed.recipe.prepMinutes || 10,
          cookMinutes: parsed.recipe.cookMinutes || 20,
          servings: parsed.recipe.servings || 2,
          difficultyStars: Math.min(5, Math.max(1, parsed.recipe.difficultyStars || 2)),
          ingredients: ingredients,
          steps: steps,
          tags: this.addPlatformTags(parsed.recipe.tags || [], sourceUrl),
          sourceUrl,
          calories: parsed.recipe.calories,
        };
      }

      return result;
    } catch (error) {
      log.error("Error parsing Gemini response:", error, response);

      return {
        isCookingVideo: false,
        confidence: 0,
        errorMessage: "Failed to parse AI response",
      };
    }
  }

  /**
   * Normalize ingredient data
   */
  private normalizeIngredients(
    ingredients: GeneratedRecipe["ingredients"] | undefined
  ): GeneratedRecipe["ingredients"] {
    if (!ingredients || !Array.isArray(ingredients)) {
      return [];
    }

    return ingredients.map((ing) => ({
      name: (ing.name || "Unknown ingredient").trim().toLowerCase(),
      quantity: ing.quantity ?? 1,
      unit: (ing.unit || "piece").trim().toLowerCase(),
      notes: ing.notes?.trim(),
    }));
  }

  /**
   * Normalize step data
   */
  private normalizeSteps(steps: GeneratedRecipe["steps"] | undefined): GeneratedRecipe["steps"] {
    if (!steps || !Array.isArray(steps)) {
      return [];
    }

    return steps.map((step, index) => ({
      step: step.step || index + 1,
      title: (step.title || `Step ${index + 1}`).trim(),
      description: (step.description || "").trim(),
    }));
  }

  /**
   * Add platform-specific tags
   */
  private addPlatformTags(existingTags: string[], url: string): string[] {
    const tags = [...existingTags];

    if (url.includes("tiktok.com")) {
      if (!tags.includes("tiktok")) {
        tags.push("tiktok");
      }
      if (!tags.includes("quick")) {
        tags.push("quick");
      }
    } else if (url.includes("instagram.com")) {
      if (!tags.includes("instagram")) {
        tags.push("instagram");
      }
    }

    return tags;
  }
}

// Singleton instance
export const socialRecipeService = new SocialRecipeService();
