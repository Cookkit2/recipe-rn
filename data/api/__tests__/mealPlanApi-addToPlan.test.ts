const mockAddToPlan = jest.fn();
const mockGetByRecipeId = jest.fn();
const mockSetDeletedBatch = jest.fn();

jest.mock("~/data/db/database", () => ({
  database: {},
}));

jest.mock("~/data/db/repositories/MealPlanRepository", () => ({
  MealPlanRepository: jest.fn().mockImplementation(() => ({
    addToPlan: mockAddToPlan,
    getByRecipeId: mockGetByRecipeId,
  })),
}));

jest.mock("~/data/db/repositories/GroceryItemCheckRepository", () => ({
  GroceryItemCheckRepository: jest.fn().mockImplementation(() => ({
    setDeletedBatch: mockSetDeletedBatch,
  })),
}));

jest.mock("~/data/db/repositories/StockRepository", () => ({
  StockRepository: jest.fn(),
}));

jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    getRecipeWithDetails: jest.fn(),
    getRecipesWithDetails: jest.fn(),
  },
}));

jest.mock("~/data/api/pantryApi", () => ({
  pantryApi: {},
}));

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { databaseFacade } from "~/data/db/DatabaseFacade";
import { mealPlanApi } from "../mealPlanApi";

describe("mealPlanApi.addToPlan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears stale hidden grocery flags for ingredients in the added recipe", async () => {
    mockGetByRecipeId.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "plan-1",
      recipeId: "recipe-1",
      servings: 4,
      date: new Date("2026-05-03T00:00:00.000Z"),
      mealSlot: "dinner",
      templateId: undefined,
      createdAt: new Date("2026-05-03T00:00:00.000Z"),
      recipe: null,
    });
    mockAddToPlan.mockResolvedValue({ id: "plan-1" });
    (databaseFacade.getRecipeWithDetails as jest.Mock).mockResolvedValue({
      recipe: {
        id: "recipe-1",
        title: "Tomato Soup",
        imageUrl: "",
        servings: 4,
      },
      ingredients: [
        { name: "Tomato", quantity: 4, unit: "piece" },
        { name: "Onion", quantity: 1, unit: "piece" },
      ],
    });

    await mealPlanApi.addToPlan("recipe-1", 4);

    expect(mockSetDeletedBatch).toHaveBeenCalledWith([
      { name: "Tomato", isDeleted: false },
      { name: "Onion", isDeleted: false },
    ]);
  });
});
