/**
 * recipeImportApi.importRecipeFromSocialMedia — the social-video import flow.
 *
 * Per issue #747: TikTok/Instagram URLs must flow through the same
 * fetch -> Nebius extract -> save -> shopping-list pipeline as YouTube, with a
 * graceful fallback when the platform blocks scraping or no recipe is detected.
 *
 * These tests mock socialRecipeService + databaseFacade (no real fetch/Nebius/DB)
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

jest.mock("~/lib/ai/client", () => ({
  generateAIContent: jest.fn(),
}));

const mockAnalyzeForRecipe = jest.fn(
  async (_content: unknown, _options?: unknown) => ({}) as RecipeAnalysisResult
);

jest.mock("~/lib/recipe-scrapper/SocialRecipeService", () => ({
  socialRecipeService: {
    analyzeForRecipe: (content: unknown, options?: unknown) =>
      options ? mockAnalyzeForRecipe(content, options) : mockAnalyzeForRecipe(content),
  },
}));

const mockCreateRecipe = jest.fn(async (_data: unknown) => ({}));
const mockGetShoppingListForRecipe = jest.fn(async (_recipeId: unknown) => ({}));

jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    createRecipe: (data: unknown) => mockCreateRecipe(data),
    getShoppingListForRecipe: (recipeId: unknown) => mockGetShoppingListForRecipe(recipeId),
  },
}));

// analyzeUrl is used by the top-level importRecipeFromUrl router; not needed for
// these direct-handler tests, but must resolve.
jest.mock("~/utils/url-utils", () => ({
  analyzeUrl: jest.fn(),
}));

import { recipeImportApi } from "../recipeImportApi";
import { analyzeUrl } from "~/utils/url-utils";
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
    mockCreateRecipe.mockResolvedValue({
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
    mockGetShoppingListForRecipe.mockResolvedValue({
      missingIngredients: [{ name: "feta", quantity: 1, unit: "block" }],
      availableIngredients: [],
    });
  });

  it("saves the recipe and returns a shopping list when Nebius is confident", async () => {
    mockAnalyzeForRecipe.mockResolvedValue({
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
    expect(mockAnalyzeForRecipe).toHaveBeenCalledWith({
      platform: "tiktok",
      url: "https://www.tiktok.com/@chef/video/7300000000000000000",
      postId: "7300000000000000000",
    });
    expect(mockCreateRecipe).toHaveBeenCalledTimes(1);
    expect(mockGetShoppingListForRecipe).toHaveBeenCalledWith("recipe-1");
    expect(result.recipe?.id).toBe("recipe-1");
    expect(result.shoppingList?.missingIngredients).toHaveLength(1);
  });

  it("persists the video's cover image with the recipe", async () => {
    mockAnalyzeForRecipe.mockResolvedValue({
      isCookingVideo: true,
      confidence: 0.9,
      recipe: { ...SAMPLE_RECIPE, imageUrl: "data:image/jpeg;base64,YWJj" },
    });
    await recipeImportApi.importRecipeFromSocialMedia(SAMPLE_RECIPE.sourceUrl, "tiktok", undefined);
    expect(mockCreateRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: "data:image/jpeg;base64,YWJj" })
    );
  });

  it("surfaces a graceful fallback when no recipe is detected (e.g. not a recipe post)", async () => {
    mockAnalyzeForRecipe.mockResolvedValue({
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
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it("surfaces a graceful fallback when isCookingVideo is true but no recipe was parsed", async () => {
    mockAnalyzeForRecipe.mockResolvedValue({
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
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it("handles the platform blocking the fetch (Nebius returns confidence 0 with a message)", async () => {
    // When the platform blocks scraping, SocialRecipeService feeds empty metadata
    // to Nebius, which returns low confidence / an error message. The import API
    // must translate that into a clear user-facing error, not a crash.
    mockAnalyzeForRecipe.mockResolvedValue({
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
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it("emits import status callbacks through the full flow", async () => {
    mockAnalyzeForRecipe.mockResolvedValue({
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

  it("keeps YouTube captions on the shared video path so cover selection is automatic", async () => {
    const url = "https://www.youtube.com/watch?v=abcdef12345";
    jest
      .mocked(analyzeUrl)
      .mockReturnValue({ isValid: true, type: "youtube", url, normalizedUrl: url });
    mockAnalyzeForRecipe.mockResolvedValue({
      isCookingVideo: true,
      confidence: 0.9,
      recipe: SAMPLE_RECIPE,
    });
    const result = await recipeImportApi.importSharedRecipe({
      url,
      text: "Bake 1 block feta with pasta.",
    });
    expect(result.success).toBe(true);
    expect(mockAnalyzeForRecipe).toHaveBeenCalledWith({
      platform: "youtube",
      url,
      postId: undefined,
      text: "Bake 1 block feta with pasta.",
    });
    expect(mockCreateRecipe).toHaveBeenCalledWith(expect.objectContaining({ sourceUrl: url }));
  });

  it("automatically extracts and saves a shared YouTube link without an import form", async () => {
    const url = "https://www.youtube.com/watch?v=abcdef12345";
    jest.mocked(analyzeUrl).mockReturnValue({
      isValid: true,
      type: "youtube",
      url,
      normalizedUrl: url,
      videoId: "abcdef12345",
    });
    mockAnalyzeForRecipe.mockResolvedValue({
      isCookingVideo: true,
      confidence: 0.9,
      recipe: { ...SAMPLE_RECIPE, sourceUrl: url, imageUrl: "data:image/jpeg;base64,YWJj" },
    });
    const prepared = await recipeImportApi.prepareSharedRecipe({ url });
    expect(mockAnalyzeForRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ platform: "youtube", url }),
      expect.any(Object)
    );
    expect(prepared.kind).toBe("saved");
    expect(mockCreateRecipe).toHaveBeenCalledTimes(1);
    expect(mockCreateRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: url, imageUrl: "data:image/jpeg;base64,YWJj" })
    );
  });

  it("falls back to the linked page when the shared text is only a generic message", async () => {
    const url = "https://example.com/pasta";
    jest
      .mocked(analyzeUrl)
      .mockReturnValue({ isValid: true, type: "website", url, normalizedUrl: url });
    mockAnalyzeForRecipe.mockResolvedValue({ isCookingVideo: false, confidence: 0.1 });
    const fallback = jest
      .spyOn(recipeImportApi, "importRecipeFromWebsite")
      .mockResolvedValue({ success: false, error: "Page blocked" });
    try {
      const result = await recipeImportApi.importSharedRecipe({
        url,
        text: "Check out this recipe!",
      });
      expect(fallback).toHaveBeenCalledWith(url, undefined);
      expect(result.error).toBe("Page blocked");
      expect(mockCreateRecipe).not.toHaveBeenCalled();
    } finally {
      fallback.mockRestore();
    }
  });

  it("rejects invalid source links before analyzing a caption", async () => {
    const url = "file:///private/recipe.txt";
    jest
      .mocked(analyzeUrl)
      .mockReturnValue({ isValid: false, type: "unknown", url, normalizedUrl: url });
    const result = await recipeImportApi.importSharedRecipe({ url, text: "Bake feta." });
    expect(result.success).toBe(false);
    expect(mockAnalyzeForRecipe).not.toHaveBeenCalled();
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it("automatically saves a complete social recipe without requiring a review page", async () => {
    const url = "https://vt.tiktok.com/ZSgH2hh7B/";
    jest
      .mocked(analyzeUrl)
      .mockReturnValue({ isValid: true, type: "tiktok", url, normalizedUrl: url });
    mockAnalyzeForRecipe.mockResolvedValue({
      isCookingVideo: true,
      confidence: 0.9,
      recipe: SAMPLE_RECIPE,
      warnings: ["Check the steps."],
    });
    const prepared = await recipeImportApi.prepareSharedRecipe({
      url,
      videoUri: "file:///picked.mp4",
    });
    expect(prepared.kind).toBe("saved");
    if (prepared.kind === "saved") expect(prepared.result.recipe?.id).toBe("recipe-1");
    expect(mockCreateRecipe).toHaveBeenCalledWith(expect.objectContaining({ sourceUrl: url }));
    expect(mockGetShoppingListForRecipe).toHaveBeenCalledWith("recipe-1");
  });

  it("rejects a draft with an unknown amount before any database write", async () => {
    const draft = {
      recipe: { ...SAMPLE_RECIPE, ingredients: [{ name: "chicken", quantity: 0, unit: "gram" }] },
      warnings: [],
    };
    await expect(recipeImportApi.saveRecipeDraft(draft)).rejects.toThrow(
      "missing ingredient amounts"
    );
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it("requires a missing unit to be reviewed before writing a known amount", async () => {
    const draft = {
      recipe: { ...SAMPLE_RECIPE, ingredients: [{ name: "chicken", quantity: 100, unit: "" }] },
      warnings: [],
    };
    await expect(recipeImportApi.saveRecipeDraft(draft)).rejects.toThrow(
      "missing ingredient units"
    );
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it("saves corrected amounts and the source only after review", async () => {
    const draft = { recipe: SAMPLE_RECIPE, warnings: [] };
    expect((await recipeImportApi.saveRecipeDraft(draft)).success).toBe(true);
    expect(mockCreateRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        ingredients: SAMPLE_RECIPE.ingredients,
        sourceUrl: SAMPLE_RECIPE.sourceUrl,
      })
    );
  });

  it("preserves the actionable video recovery message", async () => {
    const url = SAMPLE_RECIPE.sourceUrl;
    jest
      .mocked(analyzeUrl)
      .mockReturnValue({ isValid: true, type: "tiktok", url, normalizedUrl: url });
    mockAnalyzeForRecipe.mockResolvedValue({
      isCookingVideo: false,
      confidence: 0,
      errorMessage: "Choose a saved video or paste the full caption.",
    });
    await expect(recipeImportApi.prepareSharedRecipe({ url })).rejects.toThrow(
      "Choose a saved video"
    );
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it("does not retry a successful save when pantry comparison fails", async () => {
    mockGetShoppingListForRecipe.mockRejectedValueOnce(new Error("Pantry unavailable"));
    const result = await recipeImportApi.saveRecipeDraft({ recipe: SAMPLE_RECIPE, warnings: [] });
    expect(result.recipe?.id).toBe("recipe-1");
    expect(mockCreateRecipe).toHaveBeenCalledTimes(1);
  });
});
