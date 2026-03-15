// Need to mock database explicitly before imports
jest.mock("~/data/db/database", () => ({
  database: {}
}));
jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    getRecipeWithDetails: jest.fn(),
    getRecipesWithDetails: jest.fn(),
  }
}));
jest.mock("~/data/db/repositories/MealPlanRepository", () => {
  return {
    MealPlanRepository: jest.fn().mockImplementation(() => ({
      getAllMealPlanItems: jest.fn().mockResolvedValue(
        Array.from({ length: 50 }).map((_, i) => ({
          id: `mp-${i}`,
          recipeId: `r-${i % 10}`, // 10 unique recipes
          servings: 2,
          date: new Date(),
          mealSlot: 'dinner',
          createdAt: new Date(),
        }))
      ),
      getByDateRange: jest.fn().mockResolvedValue(
        Array.from({ length: 50 }).map((_, i) => ({
          id: `mp-${i}`,
          recipeId: `r-${i % 10}`,
          servings: 2,
          date: new Date(),
          mealSlot: 'dinner',
          createdAt: new Date(),
        }))
      )
    }))
  };
});
jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

import { mealPlanApi } from "../mealPlanApi";
import { databaseFacade } from "~/data/db/DatabaseFacade";

describe("Meal Plan API Performance", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    (databaseFacade.getRecipeWithDetails as jest.Mock).mockImplementation(async (id) => {
      // Simulate db delay
      await new Promise(resolve => setTimeout(resolve, 5));
      return {
        recipe: { id, title: `Recipe ${id}`, servings: 4 },
        ingredients: []
      };
    });

    (databaseFacade.getRecipesWithDetails as jest.Mock).mockImplementation(async (ids) => {
      // Simulate db delay for batch query (slightly longer but only once)
      await new Promise(resolve => setTimeout(resolve, 15));
      const map = new Map();
      for (const id of ids) {
        map.set(id, {
          recipe: { id, title: `Recipe ${id}`, servings: 4 },
          ingredients: []
        });
      }
      return map;
    });
  });

  it("should test getAllMealPlanItems performance", async () => {
    const start = Date.now();
    await mealPlanApi.getAllMealPlanItems();
    const duration = Date.now() - start;
    console.log(`getAllMealPlanItems took ${duration}ms`);

    // Record baseline
    expect(duration).toBeDefined();
  });

  it("should test getAllMealPlanItemsResult performance", async () => {
    const start = Date.now();
    await mealPlanApi.getAllMealPlanItemsResult();
    const duration = Date.now() - start;
    console.log(`getAllMealPlanItemsResult took ${duration}ms`);
    expect(duration).toBeDefined();
  });

  it("should test getMealPlansForDateRange performance", async () => {
    const start = Date.now();
    await mealPlanApi.getMealPlansForDateRange(new Date(), new Date());
    const duration = Date.now() - start;
    console.log(`getMealPlansForDateRange took ${duration}ms`);
    expect(duration).toBeDefined();
  });
});
