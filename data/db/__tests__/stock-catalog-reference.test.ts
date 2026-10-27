import { catalogReferenceField } from "~/data/services/householdStockPayload";
import { Database, Q, appSchema, tableSchema } from "@nozbe/watermelondb";
import type { AppSchema } from "@nozbe/watermelondb/Schema";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import schema from "../schema";
import migrations from "../migrations";
import { modelClasses } from "../models";
import type Stock from "../models/Stock";
import DatabaseFacade from "../DatabaseFacade";
import { RecipeRepository } from "../repositories/RecipeRepository";
import { StockRepository } from "../repositories/StockRepository";

function stockCatalogReferenceField(stock: Stock) {
  return catalogReferenceField(stock.baseIngredientId, stock._raw._changed);
}

const LokiMemoryAdapter = require("lokijs").LokiMemoryAdapter;
let mockDatabase: Database;
let facade: DatabaseFacade;
const adapters: LokiJSAdapter[] = [];
jest.mock("../database", () => ({
  get database() {
    return mockDatabase;
  },
}));
jest.mock("~/lib/supabase/supabase-client", () => ({ supabase: null }));
jest.mock("~/data/storage", () => ({ storageFacade: { get: jest.fn(), set: jest.fn() } }));

function createDatabase(databaseSchema: AppSchema = schema) {
  const adapter = new LokiJSAdapter({
    schema: databaseSchema,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    _testLokiAdapter: new LokiMemoryAdapter(),
    extraLokiOptions: { autosave: false },
  });
  adapters.push(adapter);
  return new Database({
    adapter,
    modelClasses: modelClasses.filter((model) => Boolean(databaseSchema.tables[model.table])),
  });
}

async function reload(database: Database) {
  const adapter = database.adapter.underlyingAdapter as LokiJSAdapter;
  await new Promise<void>((resolve, reject) =>
    adapter._driver.loki.saveDatabase((error: Error | null) => (error ? reject(error) : resolve()))
  );
  const reloadedAdapter = await adapter.testClone({ schema, migrations });
  adapters.push(reloadedAdapter);
  return new Database({ adapter: reloadedAdapter, modelClasses });
}

const metadata = {
  name: "Tomatoes",
  quantity: 4,
  unit: "count",
  expiryDate: new Date("2026-11-01T00:00:00Z"),
  storageType: "fridge",
  imageUrl: "file:///pantry/tomatoes.jpg",
  backgroundColor: "#cc0000",
  x: 0.2,
  y: 0.3,
  scale: 0.7,
  householdId: "household-1",
  addedByUserId: "user-1",
  supabaseId: "cloud-stock-1",
};
const relatedTables = [
  "ingredient_synonym",
  "stock_category",
  "steps_to_store",
  "waste_log",
  "consumption_log",
] as const;

async function seedRelated(database: Database, stockId: string) {
  await database.write(async () => {
    const values = {
      ingredient_synonym: { synonym: "tomato" },
      stock_category: { categoryId: "vegetables" },
      steps_to_store: { title: "Keep cool", description: "Store dry", sequence: 1, syncedAt: 1 },
      waste_log: { quantityWasted: 1, reason: "spoiled", wasteDate: 1000, estimatedCost: 50 },
      consumption_log: {
        quantityConsumed: 1,
        recipeId: "recipe-1",
        consumedDate: 2000,
        isBeforeExpiry: true,
      },
    };
    for (const table of relatedTables) {
      await database.get(table).create((row: any) => {
        Object.assign(row, values[table], { stockId });
      });
    }
  });
}

async function relatedSnapshot(database: Database) {
  return Promise.all(
    relatedTables.map(async (table) => ({
      table,
      rows: (await database.get(table).query().fetch()).map((row) => ({ ...row._raw })),
    }))
  );
}

beforeAll(() => {
  jest.spyOn(RecipeRepository.prototype, "initialize").mockResolvedValue(undefined);
  mockDatabase = createDatabase();
  facade = new DatabaseFacade();
});
beforeEach(async () => {
  await mockDatabase.write(() => mockDatabase.unsafeResetDatabase());
});
afterAll(() => {
  for (const adapter of adapters) adapter._driver.loki.close();
  jest.restoreAllMocks();
});

it("round-trips facade create and prepared batch create through a database reload", async () => {
  const input = {
    name: "Tomatoes",
    quantity: 4,
    unit: "count",
    expirationDate: metadata.expiryDate.getTime(),
    imageUrl: metadata.imageUrl,
    baseIngredientId: "catalog-tomato",
  };
  const created = await facade.createStock(input);
  let prepared!: Stock;
  await mockDatabase.write(async () => {
    prepared = facade.prepareCreateStock({ ...input, name: "Plum tomatoes" });
    await mockDatabase.batch([prepared]);
  });
  const reloaded = await reload(mockDatabase);
  for (const id of [created.id, prepared.id]) {
    const row = await reloaded.get<Stock>("stock").find(id);
    expect(row.baseIngredientId).toBe("catalog-tomato");
    expect(row._raw).toMatchObject({ base_ingredient_id: "catalog-tomato" });
    expect(row.imageUrl).toBe(metadata.imageUrl);
    expect(row.expiryDate).toEqual(metadata.expiryDate);
  }
  expect(prepared.id).not.toBe(created.id);
});

it("updates the reference without changing stock identity, batch metadata or related rows", async () => {
  const repository = new StockRepository();
  const first = await repository.create({ ...metadata, baseIngredientId: "catalog-tomato" });
  const second = await repository.create({
    ...metadata,
    expiryDate: new Date("2026-11-02T00:00:00Z"),
    supabaseId: "cloud-stock-2",
    baseIngredientId: "catalog-tomato",
  });
  await seedRelated(mockDatabase, first.id);
  const before: Record<string, unknown> = { ...first._raw };
  const relations = await relatedSnapshot(mockDatabase);
  await facade.updateStock(first.id, { baseIngredientId: "catalog-plum-tomato" });
  const reloaded = await reload(mockDatabase);
  const saved = await reloaded.get<Stock>("stock").find(first.id);
  expect(saved.baseIngredientId).toBe("catalog-plum-tomato");
  const after: Record<string, unknown> = { ...saved._raw };
  const { updated_at: beforeUpdated, _changed: beforeChanged, ...beforeFields } = before;
  const { updated_at: afterUpdated, _changed: afterChanged, ...afterFields } = after;
  expect(afterFields).toEqual({ ...beforeFields, base_ingredient_id: "catalog-plum-tomato" });
  expect(afterUpdated).toBeGreaterThanOrEqual(beforeUpdated as number);
  expect(beforeChanged).toBe("");
  expect(new Set((afterChanged as string).split(","))).toEqual(
    new Set(["updated_at", "base_ingredient_id"])
  );
  expect(await reloaded.get("stock").query().fetchCount()).toBe(2);
  expect((await reloaded.get<Stock>("stock").find(second.id)).expiryDate).toEqual(
    new Date("2026-11-02T00:00:00Z")
  );
  expect(await relatedSnapshot(reloaded)).toEqual(relations);
});

it("preserves an omitted reference and persists explicit null as a clear", async () => {
  const repository = new StockRepository();
  const row = await repository.create({ ...metadata, baseIngredientId: "catalog-tomato" });
  await facade.updateStock(row.id, { quantity: 7, baseIngredientId: undefined });
  expect((await repository.findById(row.id))?.baseIngredientId).toBe("catalog-tomato");
  await facade.updateStock(row.id, { baseIngredientId: null });
  const reloaded = await reload(mockDatabase);
  const saved = await reloaded.get<Stock>("stock").find(row.id);
  expect(saved.baseIngredientId).toBeNull();
  expect(saved._raw).toMatchObject({ base_ingredient_id: null });
  expect(saved.quantity).toBe(7);
});

it.each(["repository", "raw repository", "model"] as const)(
  "%s rename clears a stale catalog ID but preserves grammatical equivalents",
  async (path) => {
    const repository = new StockRepository();
    const row = await repository.create({ ...metadata, baseIngredientId: "catalog-tomato" });
    const update = async (data: { name: string; baseIngredientId?: string | null }) => {
      if (path === "model") return row.updateStock(data);
      if (path === "raw repository")
        return mockDatabase.write(() => repository.updateRaw(row.id, data));
      return repository.update(row.id, data);
    };
    await update({ name: "  TOMATO " });
    expect(row.baseIngredientId).toBe("catalog-tomato");
    await update({ name: "Potato" });
    expect(row.baseIngredientId).toBeNull();
    await update({ name: "Milk", baseIngredientId: "catalog-milk" });
    const reloaded = await reload(mockDatabase);
    expect((await reloaded.get<Stock>("stock").find(row.id)).baseIngredientId).toBe("catalog-milk");
  }
);

it("includes catalog references in stock projections used for matching", async () => {
  const repository = new StockRepository();
  const row = await repository.create({ ...metadata, baseIngredientId: "catalog-tomato" });
  expect(await repository.getAllWithSynonyms()).toEqual([
    expect.objectContaining({ id: row.id, baseIngredientId: "catalog-tomato" }),
  ]);
  expect(await repository.getStocksByNamesOrSynonyms(["tomato"])).toEqual([
    expect.objectContaining({ id: row.id, baseIngredientId: "catalog-tomato" }),
  ]);
});

it("migrates persisted version 8 stock and relations without replacing batch or ownership data", async () => {
  const version8 = appSchema({
    version: 8,
    tables: Object.values(schema.tables)
      .filter(
        (table) => !["base_ingredient_cache", "base_ingredient_alias_cache"].includes(table.name)
      )
      .map((table) =>
        tableSchema({
          name: table.name,
          columns: Object.values(table.columns).filter(
            (column) => !(table.name === "stock" && column.name === "base_ingredient_id")
          ),
        })
      ),
  });
  const legacy = createDatabase(version8);
  const stock = await legacy.write(() =>
    legacy.get<Stock>("stock").create((row) => Object.assign(row, metadata))
  );
  await seedRelated(legacy, stock.id);
  const before = { ...stock._raw };
  const relations = await relatedSnapshot(legacy);
  const upgraded = await reload(legacy);
  const saved = await upgraded.get<Stock>("stock").find(stock.id);
  expect(saved._raw).toEqual({ ...before, base_ingredient_id: null });
  expect(await relatedSnapshot(upgraded)).toEqual(relations);
  await upgraded.write(() =>
    saved.update((row) => {
      row.baseIngredientId = "catalog-tomato";
    })
  );
  const reloaded = await reload(upgraded);
  expect((await reloaded.get<Stock>("stock").find(stock.id)).baseIngredientId).toBe(
    "catalog-tomato"
  );
  expect(
    await reloaded.get("stock").query(Q.where("base_ingredient_id", "catalog-tomato")).fetchCount()
  ).toBe(1);
});

it("omits migrated unknown null after a quantity edit and database reload", async () => {
  const version8 = appSchema({
    version: 8,
    tables: Object.values(schema.tables)
      .filter(
        (table) => !["base_ingredient_cache", "base_ingredient_alias_cache"].includes(table.name)
      )
      .map((table) =>
        tableSchema({
          name: table.name,
          columns: Object.values(table.columns).filter(
            (column) => !(table.name === "stock" && column.name === "base_ingredient_id")
          ),
        })
      ),
  });
  const legacy = createDatabase(version8);
  const row = await legacy.write(() =>
    legacy.get<Stock>("stock").create((stock) => Object.assign(stock, metadata))
  );
  const upgraded = await reload(legacy);
  const migrated = await upgraded.get<Stock>("stock").find(row.id);
  expect(migrated.baseIngredientId).toBeNull();
  expect(stockCatalogReferenceField(migrated)).toEqual({});
  await migrated.updateStock({ quantity: 9 });
  const reloaded = await reload(upgraded);
  const saved = await reloaded.get<Stock>("stock").find(row.id);
  expect(saved.quantity).toBe(9);
  expect(saved._raw._changed.split(",")).not.toContain("base_ingredient_id");
  expect(stockCatalogReferenceField(saved)).toEqual({});
});

it.each(["model", "repository", "raw repository"] as const)(
  "%s persists explicit UUID-to-null and null-to-null clear intent",
  async (path) => {
    const repository = new StockRepository();
    const clear = (row: Stock) => {
      if (path === "model") return row.updateStock({ baseIngredientId: null });
      if (path === "raw repository")
        return mockDatabase.write(() => repository.updateRaw(row.id, { baseIngredientId: null }));
      return repository.update(row.id, { baseIngredientId: null });
    };
    for (const initial of [null, "12345678-1234-4234-9234-123456789abc"]) {
      const row = await repository.create({ ...metadata, baseIngredientId: initial });
      expect(row._raw._changed).toBe("");
      await clear(row);
      const reloaded = await reload(mockDatabase);
      const saved = await reloaded.get<Stock>("stock").find(row.id);
      expect(saved.baseIngredientId).toBeNull();
      expect(saved._raw._changed.split(",")).toContain("base_ingredient_id");
      expect(stockCatalogReferenceField(saved)).toEqual({ base_ingredient_id: null });
    }
  }
);

it.each(["model", "repository"] as const)(
  "%s genuine rename marks an unknown null as a clear but equivalent rename preserves omission",
  async (path) => {
    const repository = new StockRepository();
    const row = await repository.create(metadata);
    const rename = (name: string) =>
      path === "model" ? row.updateStock({ name }) : repository.update(row.id, { name });
    await rename("tomato");
    expect(stockCatalogReferenceField(row)).toEqual({});
    await rename("Milk");
    const reloaded = await reload(mockDatabase);
    expect(stockCatalogReferenceField(await reloaded.get<Stock>("stock").find(row.id))).toEqual({
      base_ingredient_id: null,
    });
  }
);
