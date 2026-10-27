import { recipeImportApi } from "../recipeImportApi";
import type { RecipeAnalysisResult } from "~/types/ScrappedRecipe";
const mockAnalyze = jest.fn();
const mockVideoData = jest.fn();
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock("~/lib/recipe-scrapper/youtube/YouTubeServiceFactory", () => ({
  getDefaultYouTubeService: () => ({ getVideoData: mockVideoData }),
}));
jest.mock("~/lib/recipe-scrapper/youtube/RecipeAnalyzer", () => ({
  RecipeAnalyzer: jest
    .fn()
    .mockImplementation(() => ({ analyzeForRecipe: (...args: unknown[]) => mockAnalyze(...args) })),
}));
jest.mock("~/lib/recipe-scrapper/WebsiteRecipeService", () => ({ websiteRecipeService: {} }));
jest.mock("~/lib/recipe-scrapper/SocialRecipeService", () => ({
  socialRecipeService: { analyzeForRecipe: (...args: unknown[]) => mockAnalyze(...args) },
}));
jest.mock("~/data/db/DatabaseFacade", () => ({ databaseFacade: {} }));
const recipe: NonNullable<RecipeAnalysisResult["recipe"]> = {
  title: "Eggs",
  description: "",
  servings: 1,
  prepMinutes: 0,
  cookMinutes: 2,
  difficultyStars: 1,
  ingredients: [{ name: "egg", quantity: 2, unit: "piece" }],
  steps: [{ step: 1, title: "Fry", description: "Fry the eggs." }],
  tags: [],
  sourceUrl: "",
};
beforeEach(() => {
  jest.clearAllMocks();
  mockVideoData.mockResolvedValue({
    videoInfo: { title: "Eggs", description: "Fry 2 eggs." },
    hasFullMetadata: true,
  });
});
afterEach(() => jest.restoreAllMocks());
it.each([0.6, 0.79, NaN, Infinity, 1.1])(
  "does not save YouTube analysis with confidence %s",
  async (confidence) => {
    mockAnalyze.mockResolvedValue({ isCookingVideo: true, confidence, recipe });
    const save = jest.spyOn(recipeImportApi, "_finalizeImport");
    const result = await recipeImportApi.importRecipeFromYouTube("https://youtu.be/abcdefghijk");
    expect(result.success).toBe(false);
    expect(save).not.toHaveBeenCalled();
  }
);
it("passes a shared caption as evidence through the YouTube analyzer", async () => {
  mockAnalyze.mockResolvedValue({ isCookingVideo: true, confidence: 0.9, recipe });
  const save = jest.spyOn(recipeImportApi, "_finalizeImport").mockResolvedValue({ success: true });
  const result = await recipeImportApi.importRecipeFromYouTube(
    "https://youtu.be/abcdefghijk",
    undefined,
    "Fry 2 eggs."
  );
  expect(mockAnalyze.mock.calls[0]?.[0]).toMatchObject({
    platform: "youtube",
    text: "Fry 2 eggs.",
  });
  expect(result.success).toBe(true);
  expect(save).toHaveBeenCalledTimes(1);
});
