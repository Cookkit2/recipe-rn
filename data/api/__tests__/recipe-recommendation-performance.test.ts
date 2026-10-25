jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    getAllRecipes: jest.fn(),
    getRecipesWithDetails: jest.fn(),
    getRecipeAvailabilityForCatalog: jest.fn(),
  },
}));
jest.mock("~/data", () => ({ storage: { get: jest.fn() } }));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { recipeApi, rankRecipeRecommendations } from "../recipeApi";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { Recipe } from "~/types/Recipe";

const recipes = Array.from(
  { length: 1000 },
  (_, index) =>
    ({
      id: String(index),
      title: `Recipe ${index}`,
      tags: [],
      ingredients: [],
      instructions: [],
    }) as unknown as Recipe
);
const availability = { canMake: [], partiallyCanMake: [] };

it("scores each recipe once before sorting and limiting", () => {
  const score = jest.fn((recipe: Recipe) => Number(recipe.id));
  const result = rankRecipeRecommendations(recipes, availability, {
    maxRecommendations: 4,
    rankingStrategy: { score },
  });
  expect(result.recipes.map((row) => row.recipe.id)).toEqual(["999", "998", "997", "996"]);
  expect(score).toHaveBeenCalledTimes(1000);
});

it("reuses supplied catalog and availability without another database read", async () => {
  const result = await recipeApi.getRecipeRecommendations({
    preFetchedRecipes: recipes,
    preFetchedAvailability: availability,
    preFetchedCookingHistory: { mostCooked: new Map(), ratings: new Map() },
    maxRecommendations: 4,
    rankingStrategy: { score: () => 1 },
  });
  expect(result.recipes).toHaveLength(4);
  expect(databaseFacade.getAllRecipes).not.toHaveBeenCalled();
  expect(databaseFacade.getRecipesWithDetails).not.toHaveBeenCalled();
  expect(databaseFacade.getRecipeAvailabilityForCatalog).not.toHaveBeenCalled();
});
