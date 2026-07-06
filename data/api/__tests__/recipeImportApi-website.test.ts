import { jest } from "@jest/globals";

/**
 * Integration tests for the layered website-import fallback chain (issue #730).
 *
 * Covers:
 *  - JSON-LD structured data path (no regression vs. main).
 *  - The AI fallback path engages when no structured data is present, and the
 *    MIN_RECIPE_CONFIDENCE gate is wired (it was previously defined-but-unused).
 *  - importRecipeFromWebsite no longer hard-throws on the no-structured-data case.
 *  - Status callback sequence on the happy path.
 *
 * All network/Gemini/DB access is mocked — no real network.
 */

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Service is fully stubbed; individual tests configure the methods.
const fetchWebsiteContent = jest.fn<(url: string) => Promise<any>>();
const convertStructuredDataToRecipe = jest.fn<(data: any, url: string) => any>();
const cleanRecipeWithGemini = jest.fn<(recipe: any) => Promise<any>>();
const extractRecipeFromHtml =
  jest.fn<(websiteContent: any, url: string) => Promise<{ recipe: any; confidence: number }>>();

jest.mock("~/lib/recipe-scrapper/WebsiteRecipeService", () => ({
  websiteRecipeService: {
    fetchWebsiteContent,
    convertStructuredDataToRecipe,
    cleanRecipeWithGemini,
    extractRecipeFromHtml,
  },
}));

jest.mock("~/lib/recipe-scrapper/youtube/YouTubeServiceFactory", () => ({
  getDefaultYouTubeService: jest.fn(),
}));
jest.mock("~/lib/recipe-scrapper/youtube/RecipeAnalyzer", () => ({
  RecipeAnalyzer: jest.fn(),
}));
jest.mock("~/lib/recipe-scrapper/SocialRecipeService", () => ({
  socialRecipeService: {},
}));

jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    createRecipe: jest.fn(async (data: any) => ({
      id: "recipe-1",
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      prepMinutes: data.prepMinutes,
      cookMinutes: data.cookMinutes,
      difficultyStars: data.difficultyStars,
      servings: data.servings,
      sourceUrl: data.sourceUrl,
      calories: data.calories,
      tags: data.tags,
    })),
    getShoppingListForRecipe: jest.fn(async () => ({
      missingIngredients: [],
      availableIngredients: [],
    })),
  },
}));

jest.mock("~/utils/url-utils", () => ({
  analyzeUrl: (url: string) => ({
    type: "website",
    isValid: true,
    url,
    normalizedUrl: url,
    domain: "example.com",
  }),
}));

jest.mock("~/utils/youtube-utils", () => ({
  extractYouTubeVideoId: jest.fn(),
  isValidYouTubeUrl: jest.fn(),
  buildYouTubeWatchUrl: jest.fn(),
  quickCookingCheck: jest.fn(),
}));

import { recipeImportApi } from "../recipeImportApi";

const URL = "https://www.example.com/recipe";

const VALID_GENERATED = {
  title: "Pancakes",
  description: "Fluffy pancakes",
  prepMinutes: 5,
  cookMinutes: 10,
  servings: 4,
  difficultyStars: 2,
  ingredients: [{ name: "flour", quantity: 1, unit: "cup" }],
  steps: [{ step: 1, title: "Mix", description: "Mix the batter." }],
  tags: ["breakfast"],
  sourceUrl: URL,
};

describe("recipeImportApi.importRecipeFromWebsite layered fallback chain", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the structured-data (JSON-LD) path and does not call the AI fallback", async () => {
    const rawRecipe = { ...VALID_GENERATED, title: "Raw Pancakes" };
    fetchWebsiteContent.mockResolvedValue({
      url: URL,
      title: "Pancakes",
      htmlContent: "irrelevant",
      hasStructuredData: true,
      structuredDataSource: "json-ld",
      structuredData: {
        name: "Pancakes",
        recipeIngredient: ["1 cup flour"],
        recipeInstructions: ["Mix"],
      },
    });
    convertStructuredDataToRecipe.mockReturnValue(rawRecipe);
    cleanRecipeWithGemini.mockResolvedValue(VALID_GENERATED);

    const statuses: string[] = [];
    const result = await recipeImportApi.importRecipeFromWebsite(URL, (s) =>
      statuses.push(s as string)
    );

    expect(result.success).toBe(true);
    expect(convertStructuredDataToRecipe).toHaveBeenCalledTimes(1);
    expect(cleanRecipeWithGemini).toHaveBeenCalledTimes(1);
    // The AI fallback must NOT run on the structured-data path (no double Gemini).
    expect(extractRecipeFromHtml).not.toHaveBeenCalled();
    // Status sequence ends at complete.
    expect(statuses[statuses.length - 1]).toBe("complete");
    expect(statuses).toContain("analyzing");
  });

  it("falls back to AI extraction when there is no structured data (no longer throws)", async () => {
    fetchWebsiteContent.mockResolvedValue({
      url: URL,
      title: "Some Page",
      htmlContent: "readable text",
      hasStructuredData: false,
      structuredDataSource: undefined,
    });
    extractRecipeFromHtml.mockResolvedValue({
      recipe: VALID_GENERATED,
      confidence: 0.8, // above MIN_RECIPE_CONFIDENCE (0.6)
    });

    const result = await recipeImportApi.importRecipeFromWebsite(URL);

    expect(result.success).toBe(true);
    expect(extractRecipeFromHtml).toHaveBeenCalledTimes(1);
    // Structured-data conversion must not run when there is no structured data.
    expect(convertStructuredDataToRecipe).not.toHaveBeenCalled();
  });

  it("throws a recoverable error when AI confidence is below the gate (MIN_RECIPE_CONFIDENCE wired for the first time)", async () => {
    fetchWebsiteContent.mockResolvedValue({
      url: URL,
      title: "Non-recipe",
      htmlContent: "lorem ipsum",
      hasStructuredData: false,
    });
    extractRecipeFromHtml.mockResolvedValue({
      recipe: undefined,
      confidence: 0.2, // below 0.6
    });

    const result = await recipeImportApi.importRecipeFromWebsite(URL);

    // The error is surfaced as a structured failure, not an uncaught exception.
    expect(result.success).toBe(false);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/confidence/i);
      expect(result.error).toMatch(/20%/);
    }
  });

  it("rejects an AI-extracted recipe that parses but is below the confidence gate even when a recipe object is returned", async () => {
    fetchWebsiteContent.mockResolvedValue({
      url: URL,
      title: "Weak",
      htmlContent: "text",
      hasStructuredData: false,
    });
    extractRecipeFromHtml.mockResolvedValue({
      recipe: VALID_GENERATED,
      confidence: 0.4, // below 0.6
    });

    const result = await recipeImportApi.importRecipeFromWebsite(URL);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/confidence/i);
    }
  });
});
