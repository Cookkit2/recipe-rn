import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import schema from "~/data/db/schema";
import { modelClasses } from "~/data/db/models";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { RecipeRepository } from "~/data/db/repositories/RecipeRepository";
import { RecipeType } from "~/data/db/models/Recipe";
import { generateAIContent } from "~/lib/ai/client";
import { buildPantryHash } from "~/lib/tailored-recipe/helpers";
import { recipeApi } from "../recipeApi";
import type { Recipe } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";

const LokiMemoryAdapter = require("lokijs").LokiMemoryAdapter;
let mockDatabase: Database;
jest.mock("~/data/db/database", () => ({
  get database() {
    return mockDatabase;
  },
}));
jest.mock("~/lib/supabase/supabase-client", () => ({ supabase: null }));
jest.mock("~/data/storage", () => ({ storageFacade: { get: jest.fn(), set: jest.fn() } }));
jest.mock("~/data", () => ({ storage: { get: jest.fn() } }));
jest.mock("~/lib/ai/client", () => ({ generateAIContent: jest.fn() }));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock("@nozbe/watermelondb/utils/common/logger", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const ingredients = [
  { name: "Tomato", quantity: 2, unit: "pieces" },
  { name: "Tofu", quantity: 300, unit: "g" },
  { name: "Water", quantity: 500, unit: "ml" },
];
const instructions = [
  { step: 1, title: "Simmer", description: "Simmer the tomatoes in water." },
  { step: 2, title: "Add tofu", description: "Add the tofu and heat through." },
];
const pantry: PantryItem[] = ingredients.map((ingredient, index) => ({
  ...ingredient,
  id: `pantry-${index}`,
  category: "",
  type: "fridge",
  image_url: undefined,
  background_color: undefined,
  created_at: new Date(),
  updated_at: new Date(),
  steps_to_store: [],
}));

beforeAll(() => {
  mockDatabase = new Database({
    adapter: new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      _testLokiAdapter: new LokiMemoryAdapter(),
      extraLokiOptions: { autosave: false },
    }),
    modelClasses,
  });
  jest.spyOn(RecipeRepository.prototype, "initialize").mockResolvedValue(undefined);
});
beforeEach(async () => {
  jest.mocked(generateAIContent).mockReset();
  await mockDatabase.write(() => mockDatabase.unsafeResetDatabase());
  jest.mocked(generateAIContent).mockResolvedValue(
    JSON.stringify({
      title: "Tomato and Tofu Soup",
      description: "Soup adapted to the available tomatoes and tofu.",
      prepMinutes: 5,
      cookMinutes: 10,
      servings: 2,
      difficultyStars: 1,
      ingredients,
      instructions,
    })
  );
});
afterAll(() => {
  (
    mockDatabase.adapter.underlyingAdapter as unknown as { _driver: { loki: { close(): void } } }
  )._driver.loki.close();
});

async function baseRecipe(): Promise<Recipe> {
  const original = await databaseFacade.createRecipe({
    title: "Tomato and Tofu Soup",
    description: "Original soup",
    imageUrl: "",
    prepMinutes: 5,
    cookMinutes: 15,
    difficultyStars: 1,
    servings: 2,
    ingredients,
    steps: instructions,
  });
  return {
    id: original.id,
    title: original.title,
    description: original.description,
    imageUrl: "",
    servings: 2,
    ingredients: ingredients.map((ingredient, index) => ({
      ...ingredient,
      relatedIngredientId: `original-${index}`,
    })),
    instructions: instructions.map((step) => ({ ...step, relatedIngredientIds: [] })),
  };
}

it("saves a generated soup with its steps, ingredients and cache mapping, then reuses it", async () => {
  const original = await baseRecipe();
  const tailored = await recipeApi.generateTailoredRecipe(original, pantry);
  const saved = await databaseFacade.getTailoredRecipeWithDetails(tailored.id);

  expect(saved?.recipe.type).toBe(RecipeType.TAILORED);
  expect(saved?.baseRecipeId).toBe(original.id);
  expect(saved?.steps).toMatchObject(instructions);
  expect(saved?.ingredients).toHaveLength(ingredients.length);
  expect(saved?.ingredients).toEqual(
    expect.arrayContaining(ingredients.map((ingredient) => expect.objectContaining(ingredient)))
  );
  expect(await mockDatabase.get("recipe").query().fetchCount()).toBe(2);
  expect(await mockDatabase.get("tailored_recipe_mapping").query().fetchCount()).toBe(1);
  expect(
    (
      await databaseFacade.getTailoredRecipeWithDetailsByBaseAndHash(
        original.id,
        buildPantryHash(pantry)
      )
    )?.recipe.id
  ).toBe(tailored.id);

  const cached = await recipeApi.generateTailoredRecipe(original, pantry);
  expect(cached.id).toBe(tailored.id);
  expect(cached.ingredients).toEqual(
    expect.arrayContaining(ingredients.map((ingredient) => expect.objectContaining(ingredient)))
  );
  expect(generateAIContent).toHaveBeenCalledTimes(1);
  expect((await databaseFacade.getRecipeById(original.id))?.description).toBe("Original soup");
});

it("replaces the tailored recipe when pantry quantities change without duplicating records", async () => {
  const original = await baseRecipe();
  const first = await recipeApi.generateTailoredRecipe(original, pantry);
  const updatedPantry = pantry.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity / 2,
  }));
  const updatedIngredients = ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity / 2,
  }));
  jest.mocked(generateAIContent).mockResolvedValue(
    JSON.stringify({
      title: "Tomato and Tofu Soup",
      servings: 1,
      ingredients: updatedIngredients,
      instructions,
    })
  );

  const second = await recipeApi.generateTailoredRecipe(original, updatedPantry);
  expect(second.id).not.toBe(first.id);
  expect(second.ingredients).toMatchObject(updatedIngredients);
  expect(await databaseFacade.getTailoredRecipeWithDetails(first.id)).toBeNull();
  expect(await mockDatabase.get("recipe").query().fetchCount()).toBe(2);
  expect(await mockDatabase.get("tailored_recipe_mapping").query().fetchCount()).toBe(1);
  expect((await recipeApi.generateTailoredRecipe(original, updatedPantry)).id).toBe(second.id);
  expect(generateAIContent).toHaveBeenCalledTimes(2);
  expect((await databaseFacade.getRecipeById(original.id))?.description).toBe("Original soup");
});
