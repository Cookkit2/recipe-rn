import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import schema from "~/data/db/schema";
import { modelClasses } from "~/data/db/models";
import type Stock from "~/data/db/models/Stock";
import type { PantryItem } from "~/types/PantryItem";
import { baseIngredientApi } from "~/data/supabase-api/BaseIngredientApi";
import { pantryApi } from "../pantryApi";
import { resolveBaseIngredientId } from "../api-helpers";
import { ingredientCatalog } from "~/data/services/ingredientCatalog";

const LokiMemoryAdapter = require("lokijs").LokiMemoryAdapter;
let mockDatabase: Database;
jest.mock("~/data/db/database", () => ({
  database: new Proxy(
    {},
    {
      get(_target, key) {
        const value = mockDatabase[key as keyof Database];
        return typeof value === "function" ? value.bind(mockDatabase) : value;
      },
    }
  ),
}));
jest.mock("~/data/supabase-api/BaseIngredientApi", () => ({
  baseIngredientApi: { getBaseIngredientByName: jest.fn(), getBaseIngredientsByNames: jest.fn() },
}));
jest.mock("~/data/services/ingredientCatalog", () => ({
  ingredientCatalog: {
    resolve: async (name: string) => {
      const found = await jest
        .requireMock("~/data/supabase-api/BaseIngredientApi")
        .baseIngredientApi.getBaseIngredientByName(name);
      return found
        ? {
            id: found.id,
            name: found.name,
            aliases: found.synonyms.map((row: { synonym: string }) => row.synonym),
          }
        : null;
    },
    byId: jest.fn(async () => null),
    hasSnapshot: jest.fn(async () => false),
  },
}));
jest.mock("~/lib/supabase/supabase-client", () => ({ supabase: null }));
jest.mock("~/data/storage", () => ({ storageFacade: { get: jest.fn(), set: jest.fn() } }));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
const EGG = "750e8400-e29b-41d4-a716-446655440005";
const MILK = "282b0f01-dd86-4e46-899e-f92a0c08c5ea";
function item(
  extra: Partial<PantryItem> = {}
): Omit<PantryItem, "id" | "created_at" | "updated_at"> {
  return {
    name: "eggs",
    quantity: 2,
    unit: "pcs",
    category: "other",
    type: "fridge",
    image_url: undefined,
    background_color: undefined,
    steps_to_store: [],
    ...extra,
  };
}
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
});
beforeEach(async () => {
  jest.useFakeTimers();
  jest.mocked(ingredientCatalog.hasSnapshot).mockResolvedValue(false);
  await mockDatabase.write(() => mockDatabase.unsafeResetDatabase());
  jest.mocked(baseIngredientApi.getBaseIngredientByName).mockReset().mockResolvedValue(null);
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
afterAll(() => {
  (mockDatabase.adapter.underlyingAdapter as any)._driver.loki.close();
});
it("leaves unknown foods unresolved without fabricated IDs", async () => {
  expect(await resolveBaseIngredientId("Family special stew")).toBeNull();
});
it.each(["addPantryItem", "addPantryItemResult"] as const)(
  "%s round trips a supplied catalog reference",
  async (method) => {
    const result = await pantryApi[method](item({ base_ingredient_id: EGG }));
    const saved =
      method === "addPantryItemResult"
        ? (result as Awaited<ReturnType<typeof pantryApi.addPantryItemResult>>)._unsafeUnwrap()
        : result;
    expect(saved).toMatchObject({ base_ingredient_id: EGG });
    const rows = await mockDatabase.get<Stock>("stock").query().fetch();
    expect(rows[0]?.baseIngredientId).toBe(EGG);
    expect(
      (await pantryApi.fetchAllPantryItemsResult())._unsafeUnwrap()[0]?.base_ingredient_id
    ).toBe(EGG);
  }
);
it("preserves unrelated edits and replaces or clears the reference after a food change", async () => {
  const saved = await pantryApi.addPantryItem(item({ base_ingredient_id: EGG }));
  expect(await pantryApi.updatePantryItem(saved.id, { quantity: 5 })).toMatchObject({
    base_ingredient_id: EGG,
    quantity: 5,
  });
  jest.mocked(baseIngredientApi.getBaseIngredientByName).mockResolvedValue({
    id: MILK,
    name: "milk",
    synonyms: [],
    categories: [],
    storage_type: "fridge",
    days_to_expire: 7,
    steps_to_store_id: null,
  });
  expect(await pantryApi.updatePantryItem(saved.id, { name: "milk" })).toMatchObject({
    base_ingredient_id: MILK,
  });
  jest.mocked(baseIngredientApi.getBaseIngredientByName).mockResolvedValue(null);
  expect(await pantryApi.updatePantryItem(saved.id, { name: "Family special stew" })).toMatchObject(
    { base_ingredient_id: null }
  );
});
it.each(["addPantryItems", "addPantryItemsWithMetadata"] as const)(
  "%s preserves references and separate expiry batches",
  async (method) => {
    const first = item({ base_ingredient_id: EGG, expiry_date: new Date("2026-11-01Z") });
    const second = item({ base_ingredient_id: EGG, expiry_date: new Date("2026-11-10Z") });
    const saved = await pantryApi[method]([first, second]);
    expect(saved).toHaveLength(2);
    expect(new Set(saved.map((row) => row.id)).size).toBe(2);
    expect(saved.map((row) => row.base_ingredient_id)).toEqual([EGG, EGG]);
    expect(saved.map((row) => row.quantity)).toEqual([2, 2]);
  }
);
it("rejects conflicting supplied identity metadata without changing stock", async () => {
  jest.mocked(baseIngredientApi.getBaseIngredientByName).mockResolvedValue({
    id: MILK,
    name: "milk",
    synonyms: [],
    categories: [],
    storage_type: "fridge",
    days_to_expire: 7,
    steps_to_store_id: null,
  });
  const result = await pantryApi.addPantryItemResult(
    item({ name: "milk", base_ingredient_id: EGG })
  );
  expect(result.isErr()).toBe(true);
  expect(await mockDatabase.get("stock").query().fetchCount()).toBe(0);
});
it("rejects fabricated supplied references", async () => {
  const result = await pantryApi.addPantryItemResult(item({ base_ingredient_id: "temp_eggs" }));
  expect(result.isErr()).toBe(true);
  expect(await mockDatabase.get("stock").query().fetchCount()).toBe(0);
});

it("rechecks the row identity after delayed catalog validation", async () => {
  const saved = await pantryApi.addPantryItem(item());
  let finish!: (value: null) => void;
  jest.mocked(baseIngredientApi.getBaseIngredientByName).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = pantryApi.updatePantryItemResult(saved.id, { base_ingredient_id: EGG });
  while (!finish) await Promise.resolve();
  const stock = await mockDatabase.get<Stock>("stock").find(saved.id);
  await stock.updateStock({ name: "milk", baseIngredientId: MILK });
  finish(null);
  expect((await pending).isErr()).toBe(true);
  expect(stock).toMatchObject({ name: "milk", baseIngredientId: MILK });
});
it("removes obsolete aliases after an ordinary food rename", async () => {
  const saved = await pantryApi.addPantryItem(item({ base_ingredient_id: EGG }));
  await mockDatabase.write(() =>
    mockDatabase.get("ingredient_synonym").create((row: any) => {
      row.stockId = saved.id;
      row.synonym = "whole eggs";
    })
  );
  await pantryApi.updatePantryItem(saved.id, { name: "Family special stew" });
  expect(await mockDatabase.get("ingredient_synonym").query().fetchCount()).toBe(0);
});
it("prepares a compatible existing batch once when known and unresolved input refs mix", async () => {
  const saved = await pantryApi.addPantryItem(item({ base_ingredient_id: EGG }));
  const added = await pantryApi.addPantryItemsWithMetadata([
    item({ base_ingredient_id: EGG }),
    item({ base_ingredient_id: null }),
  ]);
  expect(added).toHaveLength(1);
  expect(added[0]).toMatchObject({ id: saved.id, quantity: 6, base_ingredient_id: EGG });
});
it("keeps batches with different storage instructions separate", async () => {
  const first = item({
    base_ingredient_id: EGG,
    steps_to_store: [{ id: "1", title: "Cool", description: "Keep cool", sequence: 1 }],
  });
  const second = item({
    base_ingredient_id: EGG,
    steps_to_store: [{ id: "2", title: "Dry", description: "Keep dry", sequence: 1 }],
  });
  const saved = await pantryApi.addPantryItemsWithMetadata([first, second]);
  expect(saved).toHaveLength(2);
  expect(saved.map((row) => row.steps_to_store[0]?.title)).toEqual(["Cool", "Dry"]);
});

it("preserves an unchanged full-item reference without revalidating a stale dictionary", async () => {
  const saved = await pantryApi.addPantryItem(item({ base_ingredient_id: EGG }));
  jest.mocked(ingredientCatalog.hasSnapshot).mockResolvedValue(true);
  jest.mocked(baseIngredientApi.getBaseIngredientByName).mockClear();
  expect(await pantryApi.updatePantryItem(saved.id, { ...saved, quantity: 9 })).toMatchObject({
    quantity: 9,
    base_ingredient_id: EGG,
  });
  expect(baseIngredientApi.getBaseIngredientByName).not.toHaveBeenCalled();
});
