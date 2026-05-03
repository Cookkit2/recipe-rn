/**
 * Recipe Import API
 *
 * Unified entry point for importing recipes from any URL.
 * Supports YouTube videos, TikTok, Instagram, and recipe websites.
 */

import { analyzeUrl, type RecipeUrlType } from "~/utils/url-utils";
import { websiteRecipeService } from "~/lib/recipe-scrapper/WebsiteRecipeService";
import { getDefaultYouTubeService } from "~/lib/recipe-scrapper/youtube/YouTubeServiceFactory";
import {
  extractYouTubeVideoId,
  isValidYouTubeUrl,
  buildYouTubeWatchUrl,
  quickCookingCheck,
} from "~/utils/youtube-utils";

import { RecipeAnalyzer } from "~/lib/recipe-scrapper/youtube/RecipeAnalyzer";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { CreateRecipeData, ShoppingListResult } from "~/data/db/DatabaseFacade";
import { RecipeType } from "~/data/db/models/Recipe";
import { log } from "~/utils/logger";
import { withErrorLogging, withWarningHandling, logAndWrapResult } from "~/utils/api-error-handler";
import type { AppResult } from "~/utils/result";
import type { AppError } from "~/types/AppError";
import type {
  YouTubeImportStatus,
  YouTubeImportResult,
  GeneratedRecipe,
  YouTubeValidationResult,
} from "~/types/ScrappedRecipe";

// Configuration constants
const MIN_RECIPE_CONFIDENCE = 0.6; // Minimum confidence score to accept a recipe (60%)

// Extend import status for all import types
export type RecipeImportStatus =
  | YouTubeImportStatus
  | "fetching-website"
  | "parsing-content"
  | "fetching-social";

// Re-export for convenience
export type { YouTubeImportResult as RecipeImportResult };

// Singleton analyzer instance
const recipeAnalyzer = new RecipeAnalyzer();

/**
 * Helper wrapper for import operations that calls onStatusChange on error
 * and returns a structured { success, error } result.
 * Internally uses neverthrow Result via logAndWrapResult.
 */
async function withImportErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessagePrefix: string,
  onStatusChange?: (status: RecipeImportStatus) => void
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const result: AppResult<T, AppError> = await logAndWrapResult(fn, errorMessagePrefix);

  if (result.isErr()) {
    onStatusChange?.("error");
    return {
      success: false,
      error: result.error.message,
    };
  }

  return {
    success: true,
    data: result.value,
  };
}

export const recipeImportApi = {
  /**
   * Main entry point: Import a recipe from any supported URL
   *
   * @param url - YouTube video URL or recipe website URL
   * @param onStatusChange - Optional callback for progress updates
   * @returns Import result with recipe and shopping list
   */
  async importRecipeFromUrl(
    url: string,
    onStatusChange?: (status: RecipeImportStatus) => void
  ): Promise<YouTubeImportResult> {
    // Step 1: Analyze URL type
    onStatusChange?.("validating-url");
    log.info("Recipe Import: Analyzing URL...", url);

    const urlAnalysis = analyzeUrl(url);

    if (!urlAnalysis.isValid) {
      onStatusChange?.("error");
      return {
        success: false,
        error: "Invalid URL. Please enter a valid YouTube or website URL.",
      };
    }

    log.info("Recipe Import: URL type detected:", urlAnalysis.type);

    // Route to appropriate handler
    const result = await withImportErrorHandling(
      async () => {
        switch (urlAnalysis.type) {
          case "youtube":
            return await this.importRecipeFromYouTube(urlAnalysis.normalizedUrl, onStatusChange);

          case "tiktok":
            return await this.importRecipeFromSocialMedia(
              urlAnalysis.normalizedUrl,
              "tiktok",
              urlAnalysis.postId,
              onStatusChange
            );

          case "instagram":
            return await this.importRecipeFromSocialMedia(
              urlAnalysis.normalizedUrl,
              "instagram",
              urlAnalysis.postId,
              onStatusChange
            );

          case "website":
            return await this.importRecipeFromWebsite(urlAnalysis.normalizedUrl, onStatusChange);

          default:
            throw new Error(
              "Unsupported URL type. Please use YouTube, TikTok, Instagram, or a recipe website."
            );
        }
      },
      "Recipe Import",
      onStatusChange
    );

    if (!result.success) {
      return result;
    }

    return result.data;
  },

  /**
   * Import a recipe from a YouTube URL
   */
  async importRecipeFromYouTube(
    url: string,
    onStatusChange?: (status: RecipeImportStatus) => void
  ): Promise<YouTubeImportResult> {
    const result = await withImportErrorHandling(
      async () => {
        // Step 1: Validate URL
        onStatusChange?.("validating-url");
        log.info("YouTube Import: Validating URL...", url);

        if (!isValidYouTubeUrl(url)) {
          throw new Error("Invalid YouTube URL. Please enter a valid YouTube video link.");
        }

        const videoId = extractYouTubeVideoId(url);
        if (!videoId) {
          throw new Error("Could not extract video ID from URL");
        }

        const normalizedUrl = buildYouTubeWatchUrl(videoId);
        log.info("YouTube Import: Video ID extracted:", videoId);

        // Step 2: Get YouTube service and fetch video data
        onStatusChange?.("fetching-metadata");
        log.info("YouTube Import: Fetching video metadata...");

        const youtubeService = getDefaultYouTubeService();
        const { videoInfo, transcript, hasFullMetadata } =
          await youtubeService.getVideoData(videoId);

        if (!hasFullMetadata) {
          log.info(
            "YouTube Import: Using limited metadata (noembed) - transcript will be primary source for recipe extraction"
          );
        }

        // Step 3: Update status for transcript fetching
        if (transcript) {
          onStatusChange?.("fetching-transcript");
          log.info("YouTube Import: Transcript fetched:", transcript.text.length, "characters");
          log.debug("YouTube Import: Transcript content:", transcript.text);
        } else {
          log.warn(
            "YouTube Import: No transcript available - will analyze based on title/metadata only"
          );
        }

        // Step 4: Analyze with Gemini AI
        // When no transcript is available, Gemini will use its video understanding capability
        onStatusChange?.("analyzing");
        log.info("YouTube Import: Analyzing video with AI...");

        const analysisResult = await recipeAnalyzer.analyzeForRecipe(
          videoInfo,
          transcript,
          normalizedUrl
        );

        if (!analysisResult.isCookingVideo) {
          const confidencePercent = (analysisResult.confidence * 100).toFixed(0);
          throw new Error(
            `This video does not appear to be a cooking/recipe video. ` +
              `Confidence: ${confidencePercent}%. ` +
              `Try a different video that shows how to prepare a dish.`
          );
        }

        if (!analysisResult.recipe) {
          throw new Error(
            "Could not extract recipe from video. The video may not contain clear recipe instructions."
          );
        }

        log.info("YouTube Import: Recipe extracted:", analysisResult.recipe.title);

        // Step 5: Save recipe to database
        onStatusChange?.("generating-recipe");
        log.info("YouTube Import: Saving recipe to database...");
        log.debug("YouTube Import: Recipe:", analysisResult.recipe);

        const recipe = await this.saveRecipeToDatabase(
          analysisResult.recipe,
          normalizedUrl,
          videoInfo.thumbnailUrl
        );

        log.info("YouTube Import: Recipe saved with ID:", recipe.id);

        // Step 6: Compare with pantry and generate shopping list
        onStatusChange?.("comparing-pantry");
        log.info("YouTube Import: Comparing with pantry...");

        const shoppingList = await databaseFacade.getShoppingListForRecipe(recipe.id);

        log.info(
          "YouTube Import: Shopping list generated -",
          shoppingList.missingIngredients.length,
          "missing items"
        );

        // Complete!
        onStatusChange?.("complete");
        log.info("YouTube Import: Complete!");

        return {
          success: true,
          recipe: {
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            imageUrl: recipe.imageUrl,
            prepMinutes: recipe.prepMinutes ?? 0,
            cookMinutes: recipe.cookMinutes ?? 0,
            difficultyStars: recipe.difficultyStars ?? 3,
            servings: recipe.servings ?? 4,
            sourceUrl: recipe.sourceUrl,
            calories: recipe.calories,
            tags: recipe.tags,
          },
          shoppingList,
        };
      },
      "YouTube Import",
      onStatusChange
    );

    if (!result.success) {
      return result;
    }

    return result.data;
  },

  /**
   * Import a recipe from a website URL
   */
  async importRecipeFromWebsite(
    url: string,
    onStatusChange?: (status: RecipeImportStatus) => void
  ): Promise<YouTubeImportResult> {
    const result = await withImportErrorHandling(
      async () => {
        // Step 1: Fetch website content
        onStatusChange?.("fetching-website" as RecipeImportStatus);
        log.info("Website Import: Fetching content...");

        const websiteContent = await websiteRecipeService.fetchWebsiteContent(url);
        log.info(
          "Website Import: Content fetched, hasStructuredData:",
          websiteContent.hasStructuredData
        );

        // Step 2: Parse/extract recipe
        onStatusChange?.("parsing-content" as RecipeImportStatus);

        let generatedRecipe: GeneratedRecipe;

        if (
          websiteContent.hasStructuredData &&
          websiteContent.structuredData?.recipeIngredient?.length
        ) {
          // Use structured data if available and has ingredients
          log.info("Website Import: Using structured recipe data");
          const rawRecipe = websiteRecipeService.convertStructuredDataToRecipe(
            websiteContent.structuredData,
            url
          ) as GeneratedRecipe;

          // Clean the recipe data with Gemini
          onStatusChange?.("analyzing");
          log.info("Website Import: Cleaning recipe data with AI...");
          generatedRecipe = (await websiteRecipeService.cleanRecipeWithGemini(
            rawRecipe
          )) as GeneratedRecipe;
        } else {
          // No structured data available - throw error
          throw new Error(
            `This page does not contain structured recipe data that we can extract. ` +
              `Try a different recipe website with clear recipe schema or ingredients list.`
          );
        }

        log.info("Website Import: Recipe extracted:", generatedRecipe.title);

        // Step 3: Save recipe to database
        onStatusChange?.("generating-recipe");
        log.info("Website Import: Saving recipe to database...");

        const recipe = await this.saveRecipeToDatabase(
          generatedRecipe,
          url,
          websiteContent.imageUrl
        );

        log.info("Website Import: Recipe saved with ID:", recipe.id);

        // Step 4: Compare with pantry and generate shopping list
        onStatusChange?.("comparing-pantry");
        log.info("Website Import: Comparing with pantry...");

        const shoppingList = await databaseFacade.getShoppingListForRecipe(recipe.id);

        log.info(
          "Website Import: Shopping list generated -",
          shoppingList.missingIngredients.length,
          "missing items"
        );

        // Complete!
        onStatusChange?.("complete");
        log.info("Website Import: Complete!");

        return {
          success: true,
          recipe: {
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            imageUrl: recipe.imageUrl,
            prepMinutes: recipe.prepMinutes ?? 0,
            cookMinutes: recipe.cookMinutes ?? 0,
            difficultyStars: recipe.difficultyStars ?? 3,
            servings: recipe.servings ?? 4,
            sourceUrl: recipe.sourceUrl,
            calories: recipe.calories,
            tags: recipe.tags,
          },
          shoppingList,
        };
      },
      "Website Import",
      onStatusChange
    );

    if (!result.success) {
      return result;
    }

    return result.data;
  },

  /**
   * Import a recipe from TikTok or Instagram
   */
  async importRecipeFromSocialMedia(
    url: string,
    platform: "tiktok" | "instagram",
    postId: string | undefined,
    onStatusChange?: (status: RecipeImportStatus) => void
  ): Promise<YouTubeImportResult> {
    const platformName = platform === "tiktok" ? "TikTok" : "Instagram";

    log.info(`${platformName} Import: Import requested for ${url} (DISABLED)`);

    // Social media import is currently disabled
    return {
      success: false,
      error: `Importing from ${platformName} is currently unsupported.`,
    };
  },

  /**
   * Save generated recipe to WatermelonDB
   */
  async saveRecipeToDatabase(
    generatedRecipe: GeneratedRecipe,
    sourceUrl: string,
    imageUrl?: string
  ): Promise<{
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    prepMinutes?: number;
    cookMinutes?: number;
    difficultyStars?: number;
    servings?: number;
    sourceUrl?: string;
    calories?: number;
    tags?: string[];
  }> {
    return withErrorLogging(async () => {
      const recipeData: CreateRecipeData = {
        title: generatedRecipe.title,
        description: generatedRecipe.description,
        imageUrl,
        prepMinutes: generatedRecipe.prepMinutes,
        cookMinutes: generatedRecipe.cookMinutes,
        difficultyStars: generatedRecipe.difficultyStars,
        servings: generatedRecipe.servings,
        sourceUrl,
        calories: generatedRecipe.calories,
        tags: generatedRecipe.tags,
        steps: generatedRecipe.steps,
        ingredients: generatedRecipe.ingredients,
        type: RecipeType.CONVERTED,
      };

      const recipe = await databaseFacade.createRecipe(recipeData);

      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        difficultyStars: recipe.difficultyStars,
        servings: recipe.servings,
        sourceUrl: recipe.sourceUrl,
        calories: recipe.calories,
        tags: recipe.tags,
      };
    }, "Failed to save recipe to database");
  },

  /**
   * Detect URL type without importing
   */
  detectUrlType(url: string): RecipeUrlType {
    return analyzeUrl(url).type;
  },

  /**
   * Quick validation check (lightweight)
   * Validates URL and does a basic keyword-based cooking check
   */
  async validateCookingVideo(url: string): Promise<YouTubeValidationResult> {
    return withWarningHandling(
      async () => {
        if (!isValidYouTubeUrl(url)) {
          return { isValid: false, isCooking: false, confidence: 0 };
        }

        const videoId = extractYouTubeVideoId(url)!;
        const youtubeService = getDefaultYouTubeService();
        const videoInfo = await youtubeService.getVideoInfo(videoId);

        // Quick keyword-based validation
        const { isCooking, confidence } = quickCookingCheck(videoInfo.title);

        return {
          isValid: true,
          isCooking,
          confidence,
          title: videoInfo.title,
          thumbnailUrl: videoInfo.thumbnailUrl,
        };
      },
      "Error validating YouTube URL",
      {
        isValid: false,
        isCooking: false,
        confidence: 0,
      }
    );
  },

  /**
   * Get shopping list for an existing recipe
   */
  async getShoppingListForRecipe(recipeId: string): Promise<ShoppingListResult> {
    return await databaseFacade.getShoppingListForRecipe(recipeId);
  },
};

/**
 * Status display helpers (extended for all import types)
 */
export const IMPORT_STATUS_MESSAGES: Record<RecipeImportStatus, string> = {
  idle: "Ready to import",
  "validating-url": "Validating URL...",
  "fetching-metadata": "Fetching video information...",
  "fetching-transcript": "Extracting video transcript...",
  "fetching-website": "Fetching website content...",
  "fetching-social": "Fetching social media video...",
  "parsing-content": "Parsing recipe content...",
  analyzing: "Analyzing with AI...",
  "generating-recipe": "Generating recipe...",
  "comparing-pantry": "Checking your pantry...",
  complete: "Import complete!",
  error: "Import failed",
};

export function getImportStatusMessage(status: RecipeImportStatus): string {
  return IMPORT_STATUS_MESSAGES[status] || "Processing...";
}

/**
 * Progress percentage helper (extended for all import types)
 */
export function getImportProgress(status: RecipeImportStatus): number {
  const progressMap: Record<RecipeImportStatus, number> = {
    idle: 0,
    "validating-url": 10,
    "fetching-metadata": 25,
    "fetching-transcript": 40,
    "fetching-website": 25,
    "fetching-social": 25,
    "parsing-content": 40,
    analyzing: 60,
    "generating-recipe": 80,
    "comparing-pantry": 90,
    complete: 100,
    error: 0,
  };
  return progressMap[status] ?? 0;
}
