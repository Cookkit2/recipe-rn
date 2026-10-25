import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import schema from "../../schema";
import { modelClasses } from "../../models";
import { RecipeRepository } from "../RecipeRepository";
import { recipeApi, type SupabaseRecipeWithDetails } from "~/data/supabase-api/RecipeApi";
import { storageFacade } from "~/data/storage";
import type Recipe from "../../models/Recipe";

const LokiMemoryAdapter = require("lokijs").LokiMemoryAdapter;
let mockDatabase: Database;
const mockState = new Map<string, unknown>();
jest.mock("../../database", () => ({
  get database() {
    return mockDatabase;
  },
}));
jest.mock("~/data/supabase-api/RecipeApi", () => ({
  recipeApi: { getRecipesWithDetailsSupabase: jest.fn() },
}));
jest.mock("~/data/storage", () => ({
  storageFacade: {
    get: jest.fn((key: string) => mockState.get(key)),
    set: jest.fn((key: string, value: unknown) => mockState.set(key, value)),
  },
}));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

function remoteRecipe(id: string): SupabaseRecipeWithDetails {
  return {
    recipe: { id, title: id, servings: 2, tags: [] },
    steps: [{ step: 1, title: "Cook", description: "Cook gently", recipe_id: id }],
    ingredients: [{ recipe_id: id, name: "Rice", quantity: 1, unit: "cup" }],
  } as unknown as SupabaseRecipeWithDetails;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState.clear();
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
  jest
    .mocked(recipeApi.getRecipesWithDetailsSupabase)
    .mockResolvedValue([remoteRecipe("a"), remoteRecipe("b")]);
});

it("skips every write on an unchanged refresh and retains favorite state and child IDs", async () => {
  const repo = new RecipeRepository();
  const remote = remoteRecipe("a");
  remote.recipe.protein = 12;
  remote.recipe.allergens = ["soy"];
  jest
    .mocked(recipeApi.getRecipesWithDetailsSupabase)
    .mockResolvedValue([remote, remoteRecipe("b")]);
  await repo.syncFromSupabase();
  expect((await repo.findById("a"))?.protein).toBe(12);
  expect((await repo.findById("a"))?.allergens).toEqual(["soy"]);
  await repo.setFavorite("a", true);
  const before = await repo.getRecipeWithDetails("a");
  const batch = jest.spyOn(mockDatabase, "batch");
  await repo.syncFromSupabase();
  expect(batch).not.toHaveBeenCalled();
  const after = await repo.getRecipeWithDetails("a");
  expect(after?.recipe.isFavorite).toBe(true);
  expect(after?.steps.map((step) => step.id)).toEqual(before?.steps.map((step) => step.id));
  expect(after?.ingredients.map((item) => item.id)).toEqual(
    before?.ingredients.map((item) => item.id)
  );
});

it("updates only changed recipes in place and preserves unrelated rows", async () => {
  const repo = new RecipeRepository();
  await repo.syncFromSupabase();
  await repo.setFavorite("a", true);
  const unchanged = await repo.getRecipeWithDetails("b");
  const changed = remoteRecipe("a");
  changed.recipe.title = "Updated rice";
  changed.ingredients[0]!.quantity = 3;
  jest
    .mocked(recipeApi.getRecipesWithDetailsSupabase)
    .mockResolvedValue([changed, remoteRecipe("b")]);
  await repo.syncFromSupabase();
  const updated = await repo.getRecipeWithDetails("a");
  expect(updated?.recipe.title).toBe("Updated rice");
  expect(updated?.recipe.isFavorite).toBe(true);
  expect(updated?.ingredients).toHaveLength(1);
  expect(updated?.ingredients[0]?.quantity).toBe(3);
  expect((await repo.getRecipeWithDetails("b"))?.ingredients[0]?.id).toBe(
    unchanged?.ingredients[0]?.id
  );
  expect(await repo.count()).toBe(2);
});

it("uses the fresh local catalog across repository instances and repairs missing local rows", async () => {
  await new RecipeRepository().syncFromSupabase();
  jest.mocked(recipeApi.getRecipesWithDetailsSupabase).mockClear();
  await new RecipeRepository().initialize();
  expect(recipeApi.getRecipesWithDetailsSupabase).not.toHaveBeenCalled();
  await mockDatabase.write(async () => {
    const rows = await mockDatabase.get<Recipe>("recipe").query().fetch();
    await mockDatabase.batch(rows.map((row) => row.prepareDestroyPermanently()));
  });
  await new RecipeRepository().initialize();
  expect(recipeApi.getRecipesWithDetailsSupabase).toHaveBeenCalledTimes(1);
  expect(await new RecipeRepository().count()).toBe(2);
  expect((await new RecipeRepository().getRecipeWithDetails("a"))?.ingredients).toHaveLength(1);
});

it("does not advance the freshness marker after a failed write", async () => {
  jest.spyOn(mockDatabase, "batch").mockRejectedValueOnce(new Error("Disk full"));
  await expect(new RecipeRepository().syncFromSupabase()).rejects.toThrow("Disk full");
  expect(storageFacade.set).not.toHaveBeenCalled();
});

it("hydrates catalog ingredients without fetching steps or re-reading supplied recipe models", async () => {
  const repo = new RecipeRepository();
  await repo.syncFromSupabase();
  const recipes = await repo.findAll();
  const steps = jest.spyOn(mockDatabase.get("recipe_step"), "query");
  const parents = jest.spyOn(mockDatabase.get("recipe"), "query");
  const catalog = await repo.getRecipesWithDetails(
    recipes.map((recipe) => recipe.id),
    { includeSteps: false, recipes }
  );
  expect(catalog.size).toBe(2);
  expect(catalog.get("a")?.ingredients).toHaveLength(1);
  expect(catalog.get("a")?.steps).toEqual([]);
  expect(steps).not.toHaveBeenCalled();
  expect(parents).not.toHaveBeenCalled();
});
