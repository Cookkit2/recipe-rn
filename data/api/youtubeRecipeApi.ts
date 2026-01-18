/**
 * YouTube Recipe API
 *
 * Main entry point for importing recipes from YouTube videos.
 * Orchestrates the flow: URL validation -> fetch metadata -> AI analysis -> save to database
 */

import { getDefaultYouTubeService } from "~/data/youtube/YouTubeServiceFactory";
import { RecipeAnalyzer } from "~/data/youtube/RecipeAnalyzer";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { CreateRecipeData, ShoppingListResult } from "~/data/db/DatabaseFacade";
import {
  extractYouTubeVideoId,
  isValidYouTubeUrl,
  buildYouTubeWatchUrl,
  quickCookingCheck,
} from "~/utils/youtube-utils";
import type {
  YouTubeImportStatus,
  GeneratedRecipe,
  YouTubeImportResult,
  YouTubeValidationResult,
} from "~/types/YouTubeRecipe";
import { log } from "~/utils/logger";

// Singleton analyzer instance
const recipeAnalyzer = new RecipeAnalyzer();

export const youtubeRecipeApi = {
  /**
   * Main entry point: Import a recipe from a YouTube URL
   *
   * @param url - YouTube video URL
   * @param onStatusChange - Optional callback for progress updates
   * @returns Import result with recipe and shopping list
   */
  async importRecipeFromYouTube(
    url: string,
    onStatusChange?: (status: YouTubeImportStatus) => void
  ): Promise<YouTubeImportResult> {
    try {
      // Step 1: Validate URL
      onStatusChange?.("validating-url");
      log.info("YouTube Import: Validating URL...", url);

      if (!isValidYouTubeUrl(url)) {
        throw new Error(
          "Invalid YouTube URL. Please enter a valid YouTube video link."
        );
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
        log.info(
          "YouTube Import: Transcript fetched:",
          transcript.text.length,
          "characters"
        );
        log.debug("YouTube Import: Transcript content:", transcript.text);
      } else {
        log.warn(
          "YouTube Import: No transcript available - will analyze based on title/metadata only"
        );
      }

      // Step 4: Analyze with Gemini AI
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

      log.info(
        "YouTube Import: Recipe extracted:",
        analysisResult.recipe.title
      );

      // Step 5: Save recipe to database
      onStatusChange?.("generating-recipe");
      log.info("YouTube Import: Saving recipe to database...");

      const recipe = await this.saveRecipeToDatabase(
        analysisResult.recipe,
        normalizedUrl,
        videoInfo.thumbnailUrl
      );

      log.info("YouTube Import: Recipe saved with ID:", recipe.id);

      // Step 6: Compare with pantry and generate shopping list
      onStatusChange?.("comparing-pantry");
      log.info("YouTube Import: Comparing with pantry...");

      const shoppingList = await databaseFacade.getShoppingListForRecipe(
        recipe.id
      );

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
    } catch (error) {
      onStatusChange?.("error");
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("YouTube Import: Error -", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Save generated recipe to WatermelonDB
   */
  async saveRecipeToDatabase(
    generatedRecipe: GeneratedRecipe,
    sourceUrl: string,
    thumbnailUrl?: string
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
    const recipeData: CreateRecipeData = {
      title: generatedRecipe.title,
      description: generatedRecipe.description,
      imageUrl: thumbnailUrl,
      prepMinutes: generatedRecipe.prepMinutes,
      cookMinutes: generatedRecipe.cookMinutes,
      difficultyStars: generatedRecipe.difficultyStars,
      servings: generatedRecipe.servings,
      sourceUrl,
      calories: generatedRecipe.calories,
      tags: generatedRecipe.tags,
      steps: generatedRecipe.steps,
      ingredients: generatedRecipe.ingredients,
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
  },

  /**
   * Quick validation check (lightweight)
   * Validates URL and does a basic keyword-based cooking check
   * without fetching transcript or running AI analysis
   */
  async validateCookingVideo(url: string): Promise<YouTubeValidationResult> {
    try {
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
    } catch (error) {
      log.warn("Error validating YouTube URL:", error);
      return {
        isValid: false,
        isCooking: false,
        confidence: 0,
      };
    }
  },

  /**
   * Get shopping list for an existing recipe
   * Convenience wrapper around DatabaseFacade method
   */
  async getShoppingListForRecipe(
    recipeId: string
  ): Promise<ShoppingListResult> {
    return await databaseFacade.getShoppingListForRecipe(recipeId);
  },
};
