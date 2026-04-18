// Mock everything that could cause Native module issues or DB issues during parse time
jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    createRecipe: jest.fn(),
    getShoppingListForRecipe: jest.fn(),
  },
}));

jest.mock("~/lib/recipe-scrapper/youtube/RecipeAnalyzer", () => ({
  RecipeAnalyzer: class {},
}));

jest.mock("~/lib/recipe-scrapper/WebsiteRecipeService", () => ({
  websiteRecipeService: {},
}));

jest.mock("~/lib/recipe-scrapper/youtube/YouTubeServiceFactory", () => ({
  getDefaultYouTubeService: jest.fn(),
}));

jest.mock("~/utils/youtube-utils", () => ({
  extractYouTubeVideoId: jest.fn(),
  isValidYouTubeUrl: jest.fn(),
  buildYouTubeWatchUrl: jest.fn(),
  quickCookingCheck: jest.fn(),
}));

import {
  getImportStatusMessage,
  getImportProgress,
  IMPORT_STATUS_MESSAGES,
  type RecipeImportStatus,
} from "../recipeImportApi";

describe("recipeImportApi", () => {
  describe("getImportStatusMessage", () => {
    it("returns correct messages for known statuses", () => {
      const statuses = Object.keys(IMPORT_STATUS_MESSAGES) as RecipeImportStatus[];

      statuses.forEach((status) => {
        expect(getImportStatusMessage(status)).toBe(IMPORT_STATUS_MESSAGES[status]);
      });
    });

    it("returns fallback message for unknown status", () => {
      // Cast an invalid status to test the fallback logic
      const invalidStatus = "unknown-status" as RecipeImportStatus;
      expect(getImportStatusMessage(invalidStatus)).toBe("Processing...");
    });
  });

  describe("getImportProgress", () => {
    it("returns correct progress percentage for known statuses", () => {
      const expectedProgress: Record<string, number> = {
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

      Object.entries(expectedProgress).forEach(([status, expected]) => {
        expect(getImportProgress(status as RecipeImportStatus)).toBe(expected);
      });
    });

    it("returns 0 as fallback for unknown status", () => {
      // Cast an invalid status to test the fallback logic
      const invalidStatus = "unknown-status" as RecipeImportStatus;
      expect(getImportProgress(invalidStatus)).toBe(0);
    });
  });
});
