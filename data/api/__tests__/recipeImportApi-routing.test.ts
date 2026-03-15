jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock WebsiteRecipeService and YouTube factory to avoid importing Expo / Gemini stack
jest.mock("~/lib/recipe-scrapper/WebsiteRecipeService", () => ({
  websiteRecipeService: {},
}));

jest.mock("~/lib/recipe-scrapper/youtube/YouTubeServiceFactory", () => ({
  getDefaultYouTubeService: () => ({
    getVideoData: jest.fn(async () => ({
      videoInfo: { id: "id", title: "t", thumbnailUrl: "" },
      transcript: null,
      hasFullMetadata: true,
    })),
  }),
}));

// Shallow mock DatabaseFacade usage
jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    getShoppingListForRecipe: jest.fn(async () => ({
      missingIngredients: [],
      availableIngredients: [],
    })),
    createRecipeFromGenerated: jest.fn(async () => ({
      id: "recipe-id",
      title: "Recipe",
      description: "",
      imageUrl: "",
      prepMinutes: 0,
      cookMinutes: 0,
      difficultyStars: 0,
      servings: 0,
    })),
  },
}));

// Fully mock analyzeUrl so we can drive routing without hitting URL utils
jest.mock("~/utils/url-utils", () => ({
  analyzeUrl: (url: string) => {
    if (url.includes("youtube.com")) {
      return {
        type: "youtube",
        isValid: true,
        url,
        normalizedUrl: url,
        videoId: "vid",
      };
    }
    if (url.includes("tiktok.com")) {
      return {
        type: "tiktok",
        isValid: true,
        url,
        normalizedUrl: url,
        postId: "post",
      };
    }
    if (url.includes("instagram.com")) {
      return {
        type: "instagram",
        isValid: true,
        url,
        normalizedUrl: url,
        postId: "post",
      };
    }
    if (url.startsWith("http")) {
      return {
        type: "website",
        isValid: true,
        url,
        normalizedUrl: url,
        domain: "example.com",
      };
    }
    return {
      type: "unknown",
      isValid: false,
      url,
      normalizedUrl: url,
    };
  },
}));

jest.mock("~/utils/gemini-api", () => ({
  GeminiAPI: jest.fn(),
  generateGeminiContent: jest.fn(),
}));

jest.mock("~/lib/recipe-scrapper/youtube/RecipeAnalyzer", () => ({
  RecipeAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeForRecipe: jest.fn(async () => ({
      isCookingVideo: true,
      confidence: 1,
      recipe: {
        title: "Test Recipe",
        ingredients: [{ name: "Ing" }],
        steps: [{ description: "Do things" }],
        servings: 2,
      },
    })),
  })),
}));

const importFromYouTube = jest.fn(async () => ({ success: true } as any));
const importFromWebsite = jest.fn(async () => ({ success: true } as any));
const importFromSocial = jest.fn(async () => ({ success: true } as any));

jest.mock("../recipeImportApi", () => {
  const original = jest.requireActual("../recipeImportApi");
  return {
    ...original,
    recipeImportApi: {
      ...original.recipeImportApi,
      importRecipeFromYouTube: (...args: unknown[]) =>
        importFromYouTube.apply(null, args as any),
      importRecipeFromWebsite: (...args: unknown[]) =>
        importFromWebsite.apply(null, args as any),
      importRecipeFromSocialMedia: (...args: unknown[]) =>
        importFromSocial.apply(null, args as any),
    },
  };
});

import { recipeImportApi } from "../recipeImportApi";

describe("recipeImportApi.importRecipeFromUrl routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns error for invalid URL", async () => {
    const result = await recipeImportApi.importRecipeFromUrl("not-a-url");
    expect(result.success).toBe(false);
  });

  it("routes YouTube URLs to importRecipeFromYouTube", async () => {
    importFromYouTube.mockResolvedValue({ success: true } as any);

    const result = await recipeImportApi.importRecipeFromUrl(
      "https://www.youtube.com/watch?v=abc123",
    );

    expect(importFromYouTube).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it("routes TikTok URLs to importRecipeFromSocialMedia", async () => {
    importFromSocial.mockResolvedValue({ success: true } as any);

    const result = await recipeImportApi.importRecipeFromUrl(
      "https://www.tiktok.com/@user/video/123",
    );

    expect(importFromSocial).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it("routes Instagram URLs to importRecipeFromSocialMedia", async () => {
    importFromSocial.mockResolvedValue({ success: true } as any);

    const result = await recipeImportApi.importRecipeFromUrl(
      "https://www.instagram.com/p/abc123/",
    );

    expect(importFromSocial).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it("routes website URLs to importRecipeFromWebsite", async () => {
    importFromWebsite.mockResolvedValue({ success: true } as any);

    const result = await recipeImportApi.importRecipeFromUrl(
      "https://www.allrecipes.com/recipe/123",
    );

    expect(importFromWebsite).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});

