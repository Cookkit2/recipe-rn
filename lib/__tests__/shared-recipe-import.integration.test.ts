import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import schema from "~/data/db/schema";
import migrations from "~/data/db/migrations";
import { modelClasses } from "~/data/db/models";
import { RecipeRepository } from "~/data/db/repositories/RecipeRepository";
import { RecipeType } from "~/data/db/models/Recipe";
import { findMatchingSharedRecipe } from "../find-matching-shared-recipe";
import { resolveSharedRecipe } from "../resolve-shared-recipe";
import type { CreateRecipeData } from "~/data/db/DatabaseFacade";
import type { RecipeShareSnapshot } from "~/utils/recipe-share-snapshot";
import { fetchMyRecipes } from "~/data/api/myRecipesApi";
import { getResolvedRecipeShareId, rememberResolvedRecipeShareId } from "../recipe-share-cache";

const LokiMemoryAdapter = require("lokijs").LokiMemoryAdapter;
let mockDatabase: Database;
let recipes: RecipeRepository;
const mockShareStorage = new Map<string, unknown>();
jest.mock("~/data/storage", () => ({
  storageFacade: {
    get: (key: string) => mockShareStorage.get(key),
    set: (key: string, value: unknown) => mockShareStorage.set(key, value),
    delete: (key: string) => mockShareStorage.delete(key),
  },
}));
jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: { getAllRecipes: () => recipes.findAll() },
}));
jest.mock("~/data/db/database", () => ({
  get database() {
    return mockDatabase;
  },
}));
jest.mock("~/data/supabase-api/RecipeApi", () => ({ recipeApi: {} }));
jest.mock("@nozbe/watermelondb/utils/common/logger", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const snapshot: RecipeShareSnapshot = {
  version: 1,
  title: "Gin Fizz",
  description: "A classic cocktail",
  imageUrl: "",
  prepMinutes: 5,
  cookMinutes: 0,
  servings: 1,
  difficultyStars: 1,
  tags: ["drink", "cocktail"],
  ingredients: [
    { name: "Gin", quantity: 60, unit: "ml" },
    { name: "Lemon juice", quantity: 30, unit: "ml", notes: "fresh" },
  ],
  instructions: [
    { step: 1, title: "Shake", description: "Shake with ice." },
    { step: 2, title: "Serve", description: "Strain and top with soda." },
  ],
};
async function createRecipe({ steps, ingredients, ...recipe }: CreateRecipeData) {
  return recipes.createRecipeWithDetails({
    recipe,
    steps: steps?.map((step) => ({ ...step, recipeId: "" })),
    ingredients: ingredients?.map((ingredient) => ({ ...ingredient, recipeId: "" })),
  });
}
const database = {
  searchRecipes: (searchTerm: string) => recipes.searchRecipes({ searchTerm }),
  getRecipesWithDetails: (ids: string[]) => recipes.getRecipesWithDetails(ids),
};
beforeEach(async () => {
  mockShareStorage.clear();
  mockDatabase = new Database({
    adapter: new LokiJSAdapter({
      schema,
      migrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      _testLokiAdapter: new LokiMemoryAdapter(),
      extraLokiOptions: { autosave: false },
    }),
    modelClasses,
  });
  recipes = new RecipeRepository();
});

it("keeps one Gin Fizz when two links open an existing persisted recipe", async () => {
  const { version, instructions, ...recipe } = snapshot;
  const original = await createRecipe({ ...recipe, steps: instructions });
  const aliases = new Map<string, string>();
  const deps = {
    getRecipeById: (id: string) => recipes.findById(id),
    fetchSnapshot: jest.fn(async () => snapshot),
    createRecipe: jest.fn(createRecipe),
    findMatchingRecipe: (value: RecipeShareSnapshot) => findMatchingSharedRecipe(value, database),
    getResolvedRecipeId: (token: string) => aliases.get(token),
    rememberResolvedRecipeId: (token: string, id: string) => {
      aliases.set(token, id);
    },
  };
  const tokens = ["430138cb-2b17-42c8-a72b-b67e1c5ac927", "530138cb-2b17-42c8-a72b-b67e1c5ac927"];
  expect(await Promise.all(tokens.map((token) => resolveSharedRecipe(token, deps)))).toEqual([
    original.id,
    original.id,
  ]);
  expect(await recipes.count()).toBe(1);
  expect(deps.createRecipe).not.toHaveBeenCalled();
  await original.updateRecipe({ description: "My edited cocktail", isFavorite: true });
  deps.fetchSnapshot.mockRejectedValue(new Error("Offline"));
  await expect(resolveSharedRecipe(tokens[0]!, deps)).resolves.toBe(original.id);
  expect(original.description).toBe("My edited cocktail");
  expect(original.isFavorite).toBe(true);
});

it("matches persisted null optionals and reordered ingredients/tags", async () => {
  const { version, instructions, ...recipe } = snapshot;
  const original = await createRecipe({
    ...recipe,
    ingredients: [...recipe.ingredients].reverse(),
    tags: [...recipe.tags].reverse(),
    steps: instructions,
  });
  await expect(findMatchingSharedRecipe(snapshot, database)).resolves.toBe(original.id);
});

it.each([
  { ingredients: [{ ...snapshot.ingredients[0]!, quantity: 90 }, snapshot.ingredients[1]!] },
  { instructions: [...snapshot.instructions].reverse() },
  { description: "A different Gin Fizz" },
  { servings: 2 },
])("does not merge a same-title recipe with different content: %j", async (changes) => {
  const { version, instructions, ...recipe } = snapshot;
  await createRecipe({ ...recipe, steps: instructions });
  await expect(
    findMatchingSharedRecipe({ ...snapshot, ...changes }, database)
  ).resolves.toBeUndefined();
});

it("skips incomplete local recipes instead of blocking import", async () => {
  const { version, instructions, ingredients, ...recipe } = snapshot;
  await createRecipe({ ...recipe, steps: [], ingredients: [] });
  await expect(findMatchingSharedRecipe(snapshot, database)).resolves.toBeUndefined();
});

it("keeps a newly imported recipe in My Recipes after reopening through a second link", async () => {
  const deps = {
    getRecipeById: (id: string) => recipes.findById(id),
    fetchSnapshot: async () => snapshot,
    createRecipe,
    findMatchingRecipe: (value: RecipeShareSnapshot) => findMatchingSharedRecipe(value, database),
    getResolvedRecipeId: getResolvedRecipeShareId,
    rememberResolvedRecipeId: rememberResolvedRecipeShareId,
  };
  const first = await resolveSharedRecipe("430138cb-2b17-42c8-a72b-b67e1c5ac927", deps);
  const second = await resolveSharedRecipe("530138cb-2b17-42c8-a72b-b67e1c5ac927", deps);
  expect(second).toBe(first);
  expect((await recipes.findById(first))?.type).toBe("converted");
  expect((await fetchMyRecipes()).map((recipe) => recipe.id)).toEqual([first]);
});

it("shows an existing catalog recipe in My Recipes when a received link reuses it", async () => {
  const { version, instructions, ...recipe } = snapshot;
  const original = await createRecipe({
    ...recipe,
    type: RecipeType.STANDARD,
    steps: instructions,
  });
  await resolveSharedRecipe("430138cb-2b17-42c8-a72b-b67e1c5ac927", {
    getRecipeById: (id) => recipes.findById(id),
    fetchSnapshot: async () => snapshot,
    createRecipe,
    findMatchingRecipe: (value) => findMatchingSharedRecipe(value, database),
    getResolvedRecipeId: getResolvedRecipeShareId,
    rememberResolvedRecipeId: rememberResolvedRecipeShareId,
  });
  expect((await fetchMyRecipes()).map((recipe) => recipe.id)).toEqual([original.id]);
  expect(await recipes.count()).toBe(1);
});
