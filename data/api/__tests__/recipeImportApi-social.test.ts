/**
 * recipeImportApi.importRecipeFromSocialMedia — the social-video import flow.
 *
 * Per issue #747: TikTok/Instagram URLs must flow through the same
 * fetch -> Gemini extract -> save -> shopping-list pipeline as YouTube, with a
 * graceful fallback when the platform blocks scraping or no recipe is detected.
 *
 * These tests mock socialRecipeService + databaseFacade (no real fetch/Gemini/DB)
 * and drive the REAL importRecipeFromSocialMedia implementation.
 */
import { jest } from "@jest/globals";

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("~/lib/recipe-scrapper/WebsiteRecipeService", () => ({
  websiteRecipeService: {},
}));

jest.mock("~/lib/recipe-scrapper/youtube/YouTubeServiceFactory", () => ({
  getDefaultYouTubeService: () => ({}),
}));

jest.mock("~/utils/youtube-utils", () => ({
  extractYouTubeVideoId: jest.fn(),
  isValidYouTubeUrl: jest.fn(),
  buildYouTubeWatchUrl: jest.fn(),
  quickCookingCheck: jest.fn(),
}));

jest.mock("~/lib/recipe-scrapper/youtube/RecipeAnalyzer", () => ({
  RecipeAnalyzer: jest.fn(),
}));

jest.mock("~/utils/gemini-api", () => ({
  GeminiAPI: jest.fn(),
  DEFAULT_GEMINI_MODEL: "gemini-2.5-flash-lite",
}));

const analyzeForRecipe = jest.fn(async (_content: unknown) => ({}) as RecipeAnalysisResult);

jest.mock("~/lib/recipe-scrapper/SocialRecipeService", () => ({
  socialRecipeService: {
    analyzeForRecipe: (content: unknown) => analyzeForRecipe(content),
  },
}));

const createRecipe = jest.fn(async (_data: unknown) => ({}));
const getShoppingListForRecipe = jest.fn(async (_recipeId: unknown) => ({}));

jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    createRecipe: (data: unknown) => createRecipe(data),
    getShoppingListForRecipe: (recipeId: unknown) => getShoppingListForRecipe(recipeId),
  },
}));

// analyzeUrl is used by the top-level importRecipeFromUrl router; not needed for
// these direct-handler tests, but must resolve.
jest.mock("~/utils/url-utils", () => ({
  analyzeUrl: jest.fn(),
}));

import { recipeImportApi } from "../recipeImportApi";
import type { RecipeAnalysisResult } from "~/types/ScrappedRecipe";

const SAMPLE_RECIPE = {
  title: "TikTok Pasta",
  description: "Feta pasta",
  prepMinutes: 10,
  cookMinutes: 30,
  servings: 4,
  difficultyStars: 2,
  ingredients: [{ name: "feta", quantity: 1, unit: "block" }],
  steps: [{ step: 1, title: "Bake", description: "Bake it" }],
  tags: ["tiktok"],
  sourceUrl: "https://www.tiktok.com/@chef/video/7300000000000000000",
};

describe("recipeImportApi.importRecipeFromSocialMedia", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createRecipe.mockResolvedValue({
      id: "recipe-1",
      title: "TikTok Pasta",
      description: "Feta pasta",
      imageUrl: "img",
      prepMinutes: 10,
      cookMinutes: 30,
      difficultyStars: 2,
      servings: 4,
      sourceUrl: SAMPLE_RECIPE.sourceUrl,
      tags: ["tiktok"],
    });
    getShoppingListForRecipe.mockResolvedValue({
      missingIngredients: [{ name: "feta", quantity: 1, unit: "block" }],
      availableIngredients: [],
    });
  });

  it("saves the recipe and returns a shopping list when Gemini is confident", async () => {
    analyzeForRecipe.mockResolvedValue({
      isCookingVideo: true,
      confidence: 0.9,
      recipe: SAMPLE_RECIPE,
    });

    const result = await recipeImportApi.importRecipeFromSocialMedia(
      "https://www.tiktok.com/@chef/video/7300000000000000000",
      "tiktok",
      "7300000000000000000"
    );

    expect(result.success).toBe(true);
    expect(analyzeForRecipe).toHaveBeenCalledWith({
      platform: "tiktok",
      url: "https://www.tiktok.com/@chef/video/7300000000000000000",
      postId: "7300000000000000000",
    });
    expect(createRecipe).toHaveBeenCalledTimes(1);
    expect(getShoppingListForRecipe).toHaveBeenCalledWith("recipe-1");
    expect(result.recipe?.id).toBe("recipe-1");
    expect(result.shoppingList?.missingIngredients).toHaveLength(1);
  });

  it("surfaces a graceful fallback when no recipe is detected (e.g. not a recipe post)", async () => {
    analyzeForRecipe.mockResolvedValue({
      isCookingVideo: false,
      confidence: 0.2,
    });

    const result = await recipeImportApi.importRecipeFromSocialMedia(
      "https://www.instagram.com/reel/Cdef456/",
      "instagram",
      "Cdef456"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Instagram");
    // Must NOT have saved anything for a non-recipe post.
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it("surfaces a graceful fallback when isCookingVideo is true but no recipe was parsed", async () => {
    analyzeForRecipe.mockResolvedValue({
      isCookingVideo: true,
      confidence: 0.5,
      // recipe intentionally absent
    });

    const result = await recipeImportApi.importRecipeFromSocialMedia(
      "https://www.tiktok.com/@chef/video/123",
      "tiktok",
      "123"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("manually");
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it("handles the platform blocking the fetch (Gemini returns confidence 0 with a message)", async () => {
    // When the platform blocks scraping, SocialRecipeService feeds empty metadata
    // to Gemini, which returns low confidence / an error message. The import API
    // must translate that into a clear user-facing error, not a crash.
    analyzeForRecipe.mockResolvedValue({
      isCookingVideo: false,
      confidence: 0,
      errorMessage: "Could not extract valid ingredients or steps from this post.",
    });

    const result = await recipeImportApi.importRecipeFromSocialMedia(
      "https://www.tiktok.com/@chef/video/456",
      "tiktok",
      "456"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it("emits import status callbacks through the full flow", async () => {
    analyzeForRecipe.mockResolvedValue({
      isCookingVideo: true,
      confidence: 0.9,
      recipe: SAMPLE_RECIPE,
    });

    const statuses: string[] = [];
    await recipeImportApi.importRecipeFromSocialMedia(
      SAMPLE_RECIPE.sourceUrl,
      "tiktok",
      "7300000000000000000",
      (s) => statuses.push(s)
    );

    expect(statuses).toContain("fetching-social");
    expect(statuses).toContain("generating-recipe");
    expect(statuses).toContain("comparing-pantry");
    expect(statuses).toContain("complete");
  });
});
