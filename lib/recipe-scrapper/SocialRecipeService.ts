/**
 * Social Media Recipe Service
 *
 * Extracts recipes from shared text and accessible TikTok/Instagram captions.
 */

import { generateAIContent } from "~/lib/ai/client";
import { buildTextRecipeRequest } from "./shared/recipe-ai-utils";
import { log } from "~/utils/logger";
import type { RecipeAnalysisResult, GeneratedRecipe } from "~/types/ScrappedRecipe";
import { isValidRecipe } from "./validation-utils";
import { fetchWithTimeout } from "~/utils/fetch-with-timeout";
import { extractSocialMetadata } from "./shared/social-metadata";

export interface SocialMediaContent {
  platform: "tiktok" | "instagram" | "text";
  text?: string;
  url: string;
  postId?: string;
}

export class SocialRecipeService {
  /**
   * Analyze a TikTok or Instagram video for recipe content
   *
   * strategy:
   * 1. Fetch the page HTML
   * 2. Extract metadata (title, description, etc.)
   * 3. Send metadata to Nebius for analysis
   * (Recipe extraction uses the supplied caption or accessible page text.)
   */
  async analyzeForRecipe(content: SocialMediaContent): Promise<RecipeAnalysisResult> {
    try {
      log.info(`SocialRecipeService: Analyzing ${content.platform} content...`);

      // Supplied captions can be extracted without waiting on a social login wall.
      const suppliedText = content.text?.trim();
      const analyze = async (metadata: { title: string; description: string }) => {
        const response = await generateAIContent(
          buildTextRecipeRequest(this.buildAnalysisPrompt(content, metadata))
        );
        return this.parseResponse(response, content.url);
      };
      let suppliedResult: RecipeAnalysisResult | undefined;
      if (suppliedText) {
        suppliedResult = await analyze({ title: "Shared recipe", description: suppliedText });
        if (
          (suppliedResult.recipe &&
            suppliedResult.isCookingVideo &&
            suppliedResult.confidence >= 0.6) ||
          !content.url ||
          content.platform === "text"
        )
          return suppliedResult;
      }
      const metadata = content.url
        ? await this.fetchPageMetadata(content.url)
        : { title: "", description: "" };
      if (!metadata.description.trim())
        return (
          suppliedResult ?? {
            isCookingVideo: false,
            confidence: 0,
            errorMessage: "Recipe text wasn't accessible. Paste the full caption to import it.",
          }
        );
      log.info("SocialRecipeService: Extracted metadata title:", metadata.title);

      // 2. Build prompt with metadata
      if (suppliedResult && metadata.description.trim() === suppliedText) return suppliedResult;
      return await analyze(metadata);
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
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
            Accept: "text/html,application/xhtml+xml",
          },
        },
        20_000
      );
      if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`);
      return extractSocialMetadata(await response.text());
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
    const platformName =
      content.platform === "tiktok"
        ? "TikTok"
        : content.platform === "instagram"
          ? "Instagram"
          : "shared text";

    return `
You are a recipe extraction assistant. Analyze this ${platformName} post to extract the recipe.

URL: ${content.url}
PLATFORM: ${platformName}
POST TITLE: ${metadata.title}
POST DESCRIPTION: ${metadata.description}

INSTRUCTIONS:
1. Analyze the title and description to determine if this is a cooking/recipe post (isCookingVideo: true/false).
   - You cannot view the video. Require actual ingredients AND preparation instructions in the supplied text. Food names, hashtags, and titles alone are insufficient.

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
     - Preserve stated quantities. Do not invent ingredients or preparation steps. If there is not enough information, return confidence 0 and no recipe.

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
   * Parse Nebius response into RecipeAnalysisResult
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
          calories: parsed.recipe.calories ?? undefined,
        };
      }

      return result;
    } catch (error) {
      log.error("Error parsing Nebius response:", error, response);

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
