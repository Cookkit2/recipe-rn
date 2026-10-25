import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import schema from "../schema";
import { modelClasses } from "../models";
import type Stock from "../models/Stock";
import DatabaseFacade from "../DatabaseFacade";
import { RecipeRepository } from "../repositories/RecipeRepository";

const LokiMemoryAdapter = require("lokijs").LokiMemoryAdapter;
let mockDatabase: Database;
let facade: DatabaseFacade;
jest.mock("../database", () => ({
  get database() {
    return mockDatabase;
  },
}));
jest.mock("~/lib/supabase/supabase-client", () => ({ supabase: null }));
jest.mock("~/data/storage", () => ({ storageFacade: { get: jest.fn(), set: jest.fn() } }));

beforeAll(async () => {
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
  facade = new DatabaseFacade();
});
beforeEach(async () => {
  await mockDatabase.write(() => mockDatabase.unsafeResetDatabase());
});
afterAll(() => {
  (
    mockDatabase.adapter.underlyingAdapter as unknown as { _driver: { loki: { close(): void } } }
  )._driver.loki.close();
});

it.each([
  ["Eggs", "egg", []],
  ["tomato", "tomatoes, diced", []],
  ["scallion", "spring onions", ["spring onion"]],
] as const)(
  "uses the same matching in shopping and recipe availability: %s / %s",
  async (stockName, recipeName, aliases) => {
    await mockDatabase.write(async () => {
      const stock = await mockDatabase.get<Stock>("stock").create((row) => {
        row.name = stockName;
        row.quantity = 6;
        row.unit = "count";
      });
      for (const alias of aliases)
        await mockDatabase.get("ingredient_synonym").create((row: any) => {
          row.stockId = stock.id;
          row.synonym = alias;
        });
    });
    const recipe = await facade.createRecipe({
      title: "Test",
      description: "",
      prepMinutes: 0,
      cookMinutes: 1,
      difficultyStars: 1,
      servings: 1,
      ingredients: [{ name: recipeName, quantity: 1, unit: "count" }],
    });
    expect((await facade.getAvailableRecipes()).canMake.map((row) => row.id)).toContain(recipe.id);
    const shopping = await facade.getShoppingListForRecipe(recipe.id);
    expect(shopping.missingIngredients).toEqual([]);
    expect(shopping.availableIngredients).toMatchObject([{ name: recipeName, stockQuantity: 6 }]);
  }
);
