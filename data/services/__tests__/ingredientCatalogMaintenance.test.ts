import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import schema from "~/data/db/schema";
import { modelClasses } from "~/data/db/models";
import type Stock from "~/data/db/models/Stock";
import { IngredientCatalogService } from "../IngredientCatalogService";
import {
  linkStockCatalogBatch,
  startIngredientCatalogMaintenance,
} from "../ingredientCatalogMaintenance";

jest.mock("~/utils/logger", () => ({ log: { warn: jest.fn() } }));
jest.mock("~/data/db/database", () => ({ database: {} }));
jest.mock("~/data/storage", () => ({ storageFacade: {} }));
jest.mock("~/data/services/ingredientCatalog", () => ({ ingredientCatalog: {} }));
const LokiMemoryAdapter = require("lokijs").LokiMemoryAdapter;
const id = "11111111-1111-4111-8111-111111111111";
let database: Database;
let adapter: LokiJSAdapter;
let catalog: IngredientCatalogService;
beforeEach(async () => {
  adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    _testLokiAdapter: new LokiMemoryAdapter(),
    extraLokiOptions: { autosave: false },
  });
  database = new Database({ adapter, modelClasses });
  catalog = new IngredientCatalogService(database, async () => ({
    ingredients: [{ id, name: "Egg" }],
    aliases: [{ baseIngredientId: id, alias: "Egg white" }],
  }));
  await catalog.refresh();
});
afterEach(() => adapter._driver.loki.close());
async function seed(name: string, reference?: string) {
  return database.write(() =>
    database.get<Stock>("stock").create((row) => {
      row.name = name;
      row.quantity = 3;
      row.unit = "count";
      row.baseIngredientId = reference;
      row.imageUrl = "file:///keep.jpg";
    })
  );
}
it("links only exact approved names and preserves every other persisted field", async () => {
  const egg = await seed("Egg white");
  const custom = await seed("Unknown custom ingredient");
  const vague = await seed("protein");
  const before = { ...egg._raw };
  const result = await linkStockCatalogBatch(database, catalog);
  expect(result).toMatchObject({ scanned: 3, linked: 1, invalidReferences: 0, done: true });
  expect(egg._raw).toEqual({
    ...before,
    base_ingredient_id: id,
    _changed: expect.any(String),
    updated_at: expect.any(Number),
  });
  expect(custom.baseIngredientId).toBeNull();
  expect(vague.baseIngredientId).toBeNull();
  expect(await linkStockCatalogBatch(database, catalog)).toMatchObject({
    linked: 0,
    invalidReferences: 0,
  });
});
it("rechecks the original name after resolving outside the writer", async () => {
  const stock = await seed("Egg");
  const original = catalog.resolveLocal.bind(catalog);
  jest.spyOn(catalog, "resolveLocal").mockImplementationOnce(async (name) => {
    const result = await original(name);
    await database.write(() =>
      stock.update((row) => {
        row.name = "Milk";
      })
    );
    return result;
  });
  expect(await linkStockCatalogBatch(database, catalog)).toMatchObject({ linked: 0 });
  expect(stock.name).toBe("Milk");
  expect(stock.baseIngredientId).toBeNull();
});
it("reports invalid existing references without replacing them", async () => {
  const stock = await seed("Egg", "local-fake-id");
  const before = { ...stock._raw };
  expect(await linkStockCatalogBatch(database, catalog)).toMatchObject({
    linked: 0,
    invalidReferences: 1,
  });
  expect(stock._raw).toEqual(before);
});
it("walks beyond a bounded batch without starving later rows", async () => {
  for (let i = 0; i < 53; i++) await seed("Egg");
  const first = await linkStockCatalogBatch(database, catalog);
  expect(first).toMatchObject({ scanned: 50, linked: 50, done: false });
  const next = await linkStockCatalogBatch(database, catalog, { cursor: first.cursor });
  expect(next).toMatchObject({ scanned: 3, linked: 3, done: true });
  expect(await database.get<Stock>("stock").query().fetch()).toEqual(
    expect.arrayContaining([expect.objectContaining({ baseIngredientId: id })])
  );
});
it("uses the old snapshot after a failed refresh", async () => {
  await seed("Egg");
  const offline = new IngredientCatalogService(database, async () => {
    throw new Error("offline");
  });
  expect(await offline.refresh()).toBe(false);
  expect(await linkStockCatalogBatch(database, offline)).toMatchObject({ linked: 1 });
});

it("preserves a reference assigned concurrently while resolving a missing reference", async () => {
  const stock = await seed("Egg");
  const original = catalog.resolveLocal.bind(catalog);
  jest.spyOn(catalog, "resolveLocal").mockImplementationOnce(async (name) => {
    const result = await original(name);
    await database.write(() =>
      stock.update((row) => {
        row.baseIngredientId = "concurrently-assigned";
      })
    );
    return result;
  });
  expect(await linkStockCatalogBatch(database, catalog)).toMatchObject({ linked: 0 });
  expect(stock.baseIngredientId).toBe("concurrently-assigned");
});

it("defers maintenance and cancels a queued run before touching the catalog", async () => {
  let callback: (() => void) | undefined;
  const cancelScheduled = jest.fn();
  const refresh = jest.spyOn(catalog, "refresh");
  const stop = startIngredientCatalogMaintenance({
    database,
    catalog,
    storage: { getString: () => null, setString: jest.fn() },
    schedule: (next) => {
      callback = next;
      return cancelScheduled;
    },
  });
  expect(refresh).not.toHaveBeenCalled();
  stop();
  expect(cancelScheduled).toHaveBeenCalledTimes(1);
  callback?.();
  expect(refresh).not.toHaveBeenCalled();
});

it("resumes an interrupted persisted cursor and clears it after the final batch", async () => {
  for (let index = 0; index < 53; index++) await seed("Egg");
  const first = await linkStockCatalogBatch(database, catalog);
  const callbacks: Array<() => void> = [];
  let complete!: () => void;
  const saved = new Promise<void>((resolve) => {
    complete = resolve;
  });
  const storage = { getString: jest.fn(() => first.cursor), setString: jest.fn(() => complete()) };
  const stop = startIngredientCatalogMaintenance({
    database,
    catalog,
    storage,
    schedule: (callback) => {
      callbacks.push(callback);
      return jest.fn();
    },
  });
  callbacks.shift()?.();
  await saved;
  expect(storage.setString).toHaveBeenCalledWith("ingredient_catalog_link_cursor_v1", "");
  expect(callbacks).toHaveLength(0);
  expect(
    (await database.get<Stock>("stock").query().fetch()).every(
      (stock) => stock.baseIngredientId === id
    )
  ).toBe(true);
  stop();
});
