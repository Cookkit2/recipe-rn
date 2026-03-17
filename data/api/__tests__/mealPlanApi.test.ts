/// <reference types="jest" />

jest.mock("../../db/database", () => ({
  database: {},
}));
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock("react-native-logs", () => ({
  logger: {
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: console.error,
      debug: jest.fn(),
    }),
  },
}));

// We need to properly mock the whole MealPlanRepository file
jest.mock("../../db/repositories/MealPlanRepository", () => {
  const mockGetByDateRange = jest.fn();
  return {
    MealPlanRepository: jest.fn().mockImplementation(() => ({
      getByDateRange: mockGetByDateRange,
    })),
    getMealPlanRepository: () =>
      new (require("../../db/repositories/MealPlanRepository").MealPlanRepository)(),
  };
});

jest.mock("expo-constants", () => ({ manifest: { extra: {} } }));
jest.mock("react-native-mmkv", () => ({ MMKV: jest.fn() }));
jest.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: jest.fn(),
  CodedError: class CodedError extends Error {},
}));
jest.mock("~/data/storage/storage-facade", () => ({
  storage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock("~/data/storage/storage-factory", () => ({
  StorageFactory: {
    initialize: jest.fn(() => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() })),
  },
}));
import { databaseFacade } from "../../db/DatabaseFacade";
import { MealPlanRepository } from "../../db/repositories/MealPlanRepository";
import { mealPlanApi } from "../mealPlanApi";

jest.mock("../../db/DatabaseFacade", () => ({
  databaseFacade: {
    getRecipeWithDetails: jest.fn(),
    getRecipesWithDetails: jest.fn(),
  },
}));

describe("mealPlanApi.getMealPlansForDateRange performance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should benchmark and verify getMealPlansForDateRange", async () => {
    const itemCount = 50;
    const fakeItems = Array.from({ length: itemCount }).map((_, i) => ({
      id: `item-${i}`,
      recipeId: `recipe-${i}`,
      servings: 2,
      date: new Date(),
      mealSlot: "dinner",
      createdAt: new Date(),
      templateId: null,
    }));

    // Setup the mock repository to return our fake items
    const mockRepoInstance = new MealPlanRepository();
    (mockRepoInstance.getByDateRange as jest.Mock).mockResolvedValue(fakeItems);

    (databaseFacade.getRecipeWithDetails as jest.Mock).mockImplementation(async (id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return {
        recipe: { id, title: `Recipe ${id}`, servings: 2, imageUrl: "" },
        ingredients: [{ name: "Ingredient", quantity: 1, unit: "cup" }],
      };
    });

    (databaseFacade.getRecipesWithDetails as jest.Mock).mockImplementation(
      async (ids: string[]) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const map = new Map();
        for (const id of ids) {
          map.set(id, {
            recipe: { id, title: `Recipe ${id}`, servings: 2, imageUrl: "" },
            ingredients: [{ name: "Ingredient", quantity: 1, unit: "cup" }],
          });
        }
        return map;
      }
    );

    const start = performance.now();
    const result = await mealPlanApi.getMealPlansForDateRange(new Date(), new Date());
    const end = performance.now();

    console.log(`Execution time for ${itemCount} items: ${end - start}ms`);

    expect(result).toHaveLength(itemCount);
  });
});
