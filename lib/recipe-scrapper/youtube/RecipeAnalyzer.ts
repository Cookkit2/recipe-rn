/**
 * Recipe Analyzer
 *
 * Uses Gemini AI to analyze content and extract recipe information.
 * Supports both YouTube videos and website content.
 */

import { GeminiAPI } from "~/utils/gemini-api";
import { log } from "~/utils/logger";
import type { YouTubeVideoInfo, YouTubeTranscript } from "./types";
import type { RecipeAnalysisResult, GeneratedRecipe } from "~/types/ScrappedRecipe";
import type { WebsiteContent } from "~/lib/recipe-scrapper/WebsiteRecipeService";

export class RecipeAnalyzer {
  private gemini: GeminiAPI;

  constructor() {
    this.gemini = new GeminiAPI();
  }

  /**
   * Analyze video content to determine if it's cooking-related
   * and extract recipe information.
   *
   * Uses Gemini's native YouTube video understanding when no transcript is available.
   */
  async analyzeForRecipe(
    videoInfo: YouTubeVideoInfo,
    transcript?: YouTubeTranscript,
    sourceUrl?: string
  ): Promise<RecipeAnalysisResult> {
    try {
      let requestBody: string;

      if (transcript?.text && transcript.text.length > 100) {
        // Use transcript-based analysis
        log.debug("RecipeAnalyzer: Using transcript-based analysis");
        const prompt = this.buildAnalysisPrompt(videoInfo, transcript);
        requestBody = JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: this.getRecipeSchema(),
            temperature: 0.3,
          },
        });
      } else {
        // Use Gemini's YouTube video understanding (no transcript needed)
        log.debug("RecipeAnalyzer: Using Gemini video understanding for YouTube URL");
        const prompt = this.buildVideoAnalysisPrompt(
          videoInfo,
          sourceUrl || `https://www.youtube.com/watch?v=${videoInfo.videoId}`
        );
        requestBody = JSON.stringify({
          contents: [
            {
              parts: [
                {
                  fileData: {
                    mimeType: "video/mp4",
                    fileUri: sourceUrl || `https://www.youtube.com/watch?v=${videoInfo.videoId}`,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: this.getRecipeSchema(),
            temperature: 0.3,
          },
        });
      }

      const response = await this.gemini.generateContent("gemini-2.0-flash", requestBody);

      const result = this.parseResponse(response, sourceUrl);
      return result;
    } catch (error) {
      log.error("Error analyzing video for recipe:", error);

      return {
        isCookingVideo: false,
        confidence: 0,
        errorMessage: error instanceof Error ? error.message : "Failed to analyze video content",
      };
    }
  }

  /**
   * Analyze website content to extract recipe information.
   * Uses AI when structured data is not available or incomplete.
   */
  async analyzeWebsiteForRecipe(
    websiteContent: WebsiteContent,
    sourceUrl: string
  ): Promise<RecipeAnalysisResult> {
    try {
      log.debug("RecipeAnalyzer: Analyzing website content for recipe");

      const prompt = this.buildWebsiteAnalysisPrompt(websiteContent);
      const requestBody = JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: this.getRecipeSchema(),
          temperature: 0.3,
        },
      });

      const response = await this.gemini.generateContent("gemini-2.0-flash", requestBody);

      const result = this.parseResponse(response, sourceUrl);
      return result;
    } catch (error) {
      log.error("Error analyzing website for recipe:", error);

      return {
        isCookingVideo: false,
        confidence: 0,
        errorMessage: error instanceof Error ? error.message : "Failed to analyze website content",
      };
    }
  }

  /**
   * Build prompt for website content analysis
   */
  private buildWebsiteAnalysisPrompt(websiteContent: WebsiteContent): string {
    let structuredDataHint = "";

    if (websiteContent.hasStructuredData && websiteContent.structuredData) {
      structuredDataHint = `
STRUCTURED DATA FOUND:
The website contains Recipe schema data:
- Name: ${websiteContent.structuredData.name || "N/A"}
- Description: ${websiteContent.structuredData.description || "N/A"}
- Ingredients: ${websiteContent.structuredData.recipeIngredient?.length || 0} items
- Instructions: ${Array.isArray(websiteContent.structuredData.recipeInstructions) ? websiteContent.structuredData.recipeInstructions.length : "available"}

Use this structured data as the primary source, supplemented by the page content below.
`;
    }

    return `
You are a recipe extraction assistant. Analyze the following website content to determine if it contains a recipe.

PAGE TITLE: ${websiteContent.title}

${websiteContent.description ? `PAGE DESCRIPTION: ${websiteContent.description}\n` : ""}

${structuredDataHint}

PAGE CONTENT:
${websiteContent.htmlContent}

INSTRUCTIONS:
1. Determine if this page contains a recipe (isCookingVideo: true if yes, false if no)
   Note: We use "isCookingVideo" for compatibility, but this applies to any recipe content.
2. Provide a confidence score (0-1) for your determination
3. If it IS a recipe page, extract the complete recipe with:
   - Title: Clean, formatted recipe name
   - Description: Brief 1-2 sentence summary of the dish
   - Prep time and cook time in minutes (estimate if not explicitly mentioned)
   - Number of servings (default to 4 if not mentioned)
   - Difficulty (1-5 stars based on technique complexity)
   - Complete ingredient list with quantities and units
   - Step-by-step instructions with clear titles and descriptions
   - Relevant tags (cuisine type, dietary info, meal type, etc.)
   - Estimated calories per serving if mentioned

IMPORTANT GUIDELINES:
- If quantities are vague (e.g., "some salt", "a pinch"), estimate reasonable amounts
- Normalize units to standard cooking measurements (cups, tablespoons, teaspoons, grams, oz, etc.)
- Ensure ingredient names are singular and standardized
- For steps, create clear actionable titles
- Include cooking temperatures and times in step descriptions when mentioned
- If this is NOT a recipe page, set isCookingVideo to false

Return a valid JSON response matching the schema provided.
    `.trim();
  }

  /**
   * Build prompt for direct video analysis (when no transcript available)
   */
  private buildVideoAnalysisPrompt(videoInfo: YouTubeVideoInfo, videoUrl: string): string {
    return `
You are a recipe extraction assistant. Watch and analyze this YouTube cooking video to extract the recipe.

VIDEO TITLE: ${videoInfo.title}
CHANNEL: ${videoInfo.channelName}
VIDEO URL: ${videoUrl}

INSTRUCTIONS:
1. Watch the video and determine if this is a cooking/recipe video (isCookingVideo: true/false)
2. Provide a confidence score (0-1) for your determination
3. If it IS a cooking video, extract the complete recipe by watching the video:
   - Title: Clean, formatted recipe name
   - Description: Brief 1-2 sentence summary of the dish
   - Prep time and cook time in minutes
   - Number of servings (default to 4 if not clear)
   - Difficulty (1-5 stars based on technique complexity)
   - Complete ingredient list with quantities and units (watch carefully for measurements)
   - Step-by-step instructions with clear titles and descriptions
   - Relevant tags (cuisine type, dietary info, meal type, etc.)
   - Estimated calories per serving if mentioned

IMPORTANT GUIDELINES:
- Pay close attention to ingredient quantities shown or mentioned in the video
- If quantities are vague, estimate reasonable amounts
- Normalize units to standard cooking measurements
- Ensure ingredient names are singular and standardized
- For steps, create clear actionable titles
- Include cooking temperatures and times from the video
- If this is NOT a cooking video, set isCookingVideo to false

Return a valid JSON response matching the schema provided.
    `.trim();
  }

  /**
   * Build the prompt for Gemini to analyze the video
   */
  private buildAnalysisPrompt(videoInfo: YouTubeVideoInfo, transcript?: YouTubeTranscript): string {
    // Truncate transcript if too long (Gemini has context limits)
    const maxTranscriptLength = 15000;
    const transcriptText = transcript?.text
      ? transcript.text.length > maxTranscriptLength
        ? transcript.text.substring(0, maxTranscriptLength) + "... [truncated]"
        : transcript.text
      : "No transcript available.";

    return `
You are a recipe extraction assistant. Analyze the following YouTube video information and determine if it's a cooking/recipe video.

VIDEO TITLE: ${videoInfo.title}

CHANNEL: ${videoInfo.channelName}

${videoInfo.description ? `DESCRIPTION:\n${videoInfo.description}\n` : ""}

TRANSCRIPT:
${transcriptText}

INSTRUCTIONS:
1. First, determine if this is a cooking/recipe video (isCookingVideo: true/false)
2. Provide a confidence score (0-1) for your determination
3. If it IS a cooking video, extract the complete recipe with:
   - Title: Clean, formatted recipe name (e.g., "Homemade Chicken Tikka Masala")
   - Description: Brief 1-2 sentence summary of the dish
   - Prep time and cook time in minutes (estimate if not explicitly mentioned)
   - Number of servings (default to 4 if not mentioned)
   - Difficulty (1-5 stars based on technique complexity)
   - Complete ingredient list with quantities and units
   - Step-by-step instructions with clear titles and descriptions
   - Relevant tags (cuisine type, dietary info, meal type, etc.)
   - Estimated calories per serving if mentioned or can be reasonably estimated

IMPORTANT GUIDELINES:
- If quantities are vague (e.g., "some salt", "a pinch"), estimate reasonable amounts
- If prep/cook times aren't mentioned, estimate based on the recipe complexity
- Normalize units to standard cooking measurements (cups, tablespoons, teaspoons, grams, oz, etc.)
- Ensure ingredient names are singular and standardized (e.g., "onion" not "onions", "chicken breast" not "chicken breasts")
- For steps, create clear actionable titles (e.g., "Sauté the aromatics", "Simmer the sauce")
- Include cooking temperatures and times in step descriptions when mentioned
- If this is NOT a cooking video, set isCookingVideo to false and don't include a recipe

Return a valid JSON response matching the schema provided.
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
  private parseResponse(response: string, sourceUrl?: string): RecipeAnalysisResult {
    try {
      // TODO: delete after debugging
      log.debug("RecipeAnalyzer: Response:", response);

      const parsed = JSON.parse(response);

      // Validate required fields
      if (typeof parsed.isCookingVideo !== "boolean") {
        throw new Error("Missing isCookingVideo field");
      }

      const result: RecipeAnalysisResult = {
        isCookingVideo: parsed.isCookingVideo,
        confidence: parsed.confidence ?? 0,
        errorMessage: parsed.errorMessage,
      };

      // If it's a cooking video and we have recipe data, include it
      if (parsed.isCookingVideo && parsed.recipe) {
        result.recipe = {
          title: parsed.recipe.title || "Untitled Recipe",
          description: parsed.recipe.description || "",
          prepMinutes: parsed.recipe.prepMinutes || 15,
          cookMinutes: parsed.recipe.cookMinutes || 30,
          servings: parsed.recipe.servings || 4,
          difficultyStars: Math.min(5, Math.max(1, parsed.recipe.difficultyStars || 3)),
          ingredients: this.normalizeIngredients(parsed.recipe.ingredients),
          steps: this.normalizeSteps(parsed.recipe.steps),
          tags: parsed.recipe.tags || [],
          sourceUrl: sourceUrl || "",
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
   * Normalize ingredient data to ensure consistency
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
   * Normalize step data and ensure proper ordering
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
}
