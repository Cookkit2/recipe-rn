import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import schema from "~/data/db/schema";
import { modelClasses } from "~/data/db/models";
import type Stock from "~/data/db/models/Stock";
import { createAssistantPantryMutator } from "../assistant-pantry";

const LokiMemoryAdapter = require("lokijs").LokiMemoryAdapter;

let database: Database;
let mutate: ReturnType<typeof createAssistantPantryMutator>;
const resolveIngredient = jest.fn();

beforeEach(() => {
  database = new Database({
    adapter: new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      _testLokiAdapter: new LokiMemoryAdapter(),
      extraLokiOptions: { autosave: false },
    }),
    modelClasses,
  });
  resolveIngredient.mockReset().mockResolvedValue(null);
  mutate = createAssistantPantryMutator(database, resolveIngredient);
});

afterEach(async () => {
  // Ensure setup finished even when validation rejected before any database read.
  await database.get("stock").query().fetchCount();
  (
    database.adapter.underlyingAdapter as unknown as { _driver: { loki: { close(): void } } }
  )._driver.loki.close();
});

async function seed(name: string, quantity = 6, unit = "pcs", extra: Partial<Stock> = {}) {
  return database.write(() =>
    database.get<Stock>("stock").create((row) => {
      row.name = name;
      row.quantity = quantity;
      row.unit = unit;
      row.storageType = "fridge";
      Object.assign(row, extra);
    })
  );
}
const stocks = () => database.get<Stock>("stock").query().fetch();

it.each(["vegetables", "vegetable", "fresh produce", "spices"])(
  "does not write vague %s",
  async (name) => {
    expect(await mutate({ action: "add", name, quantity: 6 })).toMatchObject({
      ok: false,
      status: "needs_clarification",
      question: expect.any(String),
    });
    expect(await stocks()).toHaveLength(0);
    expect(resolveIngredient).not.toHaveBeenCalled();
  }
);

it.each(["milk", "frozen mixed vegetables", "tempeh"])("adds a concrete food: %s", async (name) => {
  expect(await mutate({ action: "add", name })).toMatchObject({
    ok: true,
    status: "added",
    item: { name, quantity: 1 },
  });
});

it("increments plural-equivalent stock and preserves its name and metadata", async () => {
  const existing = await seed("Eggs", 6, "pcs", {
    imageUrl: "egg.jpg",
    backgroundColor: "red",
    expiryDate: new Date(2026, 11, 1),
    storageType: "cabinet",
  });
  expect(await mutate({ action: "add", name: "egg", quantity: 2, unit: "pieces" })).toMatchObject({
    ok: true,
    status: "updated",
    item: { id: existing.id, quantity: 8 },
  });
  expect(await stocks()).toHaveLength(1);
  expect(existing).toMatchObject({
    name: "Eggs",
    unit: "pcs",
    imageUrl: "egg.jpg",
    backgroundColor: "red",
    storageType: "cabinet",
  });
  expect(existing.expiryDate).toEqual(new Date(2026, 11, 1));
});

it("serializes simultaneous additions and reads quantities inside the writer", async () => {
  await Promise.all(
    Array.from({ length: 8 }, () => mutate({ action: "add", name: "tomatoes", quantity: 1 }))
  );
  expect((await stocks()).map((row) => row.quantity)).toEqual([8]);
});

it("uses catalog canonical names and full approved aliases", async () => {
  await seed("spring onions");
  resolveIngredient.mockResolvedValue({
    id: "catalog-1",
    name: "scallion",
    aliases: ["spring onion"],
  });
  expect(await mutate({ action: "add", name: "scallions", quantity: 2 })).toMatchObject({
    status: "updated",
    item: { quantity: 8 },
  });
  expect(await stocks()).toHaveLength(1);
});

it("uses stored synonyms while offline", async () => {
  const existing = await seed("scallion");
  await database.write(() =>
    database.get("ingredient_synonym").create((row: any) => {
      row.stockId = existing.id;
      row.synonym = "spring onion";
    })
  );
  resolveIngredient.mockRejectedValue(new Error("offline"));
  expect(await mutate({ action: "add", name: "spring onions", quantity: 2 })).toMatchObject({
    status: "updated",
    item: { quantity: 8 },
  });
});

it("keeps different units and meaningful variants separate", async () => {
  await seed("tomato", 2, "pcs");
  for (const input of [
    { name: "tomatoes", quantity: 500, unit: "g" },
    { name: "cherry tomatoes", quantity: 2, unit: "pcs" },
    { name: "canned tomatoes", quantity: 1, unit: "can" },
  ])
    expect(await mutate({ action: "add", ...input })).toMatchObject({ status: "added" });
  expect(await stocks()).toHaveLength(4);
});

it("asks for the unit instead of guessing when existing stock uses mass or containers", async () => {
  await seed("milk", 2, "carton");
  expect(await mutate({ action: "add", name: "milk", quantity: 3 })).toMatchObject({
    status: "needs_clarification",
  });
  expect((await stocks())[0]?.quantity).toBe(2);
});

it("clarifies multiple legacy rows and allows an explicit row selection", async () => {
  const first = await seed("egg");
  await seed("eggs", 2, "pcs", { storageType: "cabinet" });
  expect(await mutate({ action: "add", name: "eggs", quantity: 2 })).toMatchObject({
    status: "needs_clarification",
    candidates: expect.any(Array),
  });
  expect(first.quantity).toBe(6);
  expect(
    await mutate({ action: "add", name: "eggs", quantity: 2, stockId: first.id })
  ).toMatchObject({ status: "updated", item: { quantity: 8 } });
});

it("never updates an unrelated stockId or merges incompatible units", async () => {
  const first = await seed("milk", 2, "carton");
  expect(await mutate({ action: "add", name: "egg", stockId: first.id })).toMatchObject({
    status: "needs_clarification",
  });
  expect(await mutate({ action: "add", name: "milk", stockId: first.id, unit: "l" })).toMatchObject(
    { status: "needs_clarification" }
  );
  expect(first.quantity).toBe(2);
});

it.each([0, -1, NaN, Infinity])("does not persist invalid quantity %s", async (quantity) => {
  expect(await mutate({ action: "add", name: "eggs", quantity })).toMatchObject({ ok: false });
  expect(await stocks()).toHaveLength(0);
});

it("does not let a broad catalog match erase a specific variant", async () => {
  await seed("milk");
  resolveIngredient.mockResolvedValue({ id: "milk", name: "milk", aliases: [] });
  expect(await mutate({ action: "add", name: "coconut milk", quantity: 2 })).toMatchObject({
    status: "added",
    item: { name: "coconut milk" },
  });
});

it("corrects a vague legacy row only by explicit rename and preserves its quantity", async () => {
  const row = await seed("vegetables", 6);
  expect(await mutate({ action: "rename", stockId: row.id, name: "carrots" })).toMatchObject({
    status: "renamed",
    item: { id: row.id, name: "carrots", quantity: 6 },
  });
});

it("does not rename into a vague name or silently duplicate an existing ingredient", async () => {
  const row = await seed("vegetable");
  await seed("carrot");
  expect(await mutate({ action: "rename", stockId: row.id, name: "vegetables" })).toMatchObject({
    status: "needs_clarification",
  });
  expect(await mutate({ action: "rename", stockId: row.id, name: "carrots" })).toMatchObject({
    status: "needs_clarification",
  });
  expect(row.name).toBe("vegetable");
});

it("requires a selection for plural-equivalent removals, including legacy vague rows", async () => {
  const row = await seed("vegetable");
  await seed("vegetables");
  expect(await mutate({ action: "remove", name: "vegetables" })).toMatchObject({
    status: "needs_clarification",
  });
  expect(await mutate({ action: "remove", stockId: row.id })).toMatchObject({
    status: "removed",
    removed: [{ id: row.id }],
  });
  expect(await stocks()).toHaveLength(1);
});

it("consolidates compatible legacy duplicates only with two explicit row IDs", async () => {
  const first = await seed("egg");
  const second = await seed("eggs", 2);
  await database.write(() =>
    database.get("ingredient_synonym").create((row: any) => {
      row.stockId = second.id;
      row.synonym = "hen egg";
    })
  );
  expect(
    await mutate({ action: "merge", stockId: second.id, targetStockId: first.id })
  ).toMatchObject({ status: "merged", item: { id: first.id, quantity: 8 } });
  expect(await stocks()).toHaveLength(1);
  expect((await database.get("ingredient_synonym").query().fetch())[0]).toMatchObject({
    stockId: first.id,
  });
});

it("preserves separate batches when metadata or ingredient identity differs", async () => {
  const first = await seed("egg");
  const second = await seed("eggs", 2, "pcs", { expiryDate: new Date(2026, 11, 1) });
  expect(
    await mutate({ action: "merge", stockId: second.id, targetStockId: first.id })
  ).toMatchObject({ status: "needs_clarification" });
  const third = await seed("coconut milk");
  expect(
    await mutate({ action: "merge", stockId: third.id, targetStockId: first.id })
  ).toMatchObject({ status: "needs_clarification" });
  expect(await stocks()).toHaveLength(3);
});

it("never increments a vague legacy row through a stored synonym", async () => {
  const vague = await seed("vegetables");
  await database.write(() =>
    database.get("ingredient_synonym").create((row: any) => {
      row.stockId = vague.id;
      row.synonym = "carrot";
    })
  );
  expect(await mutate({ action: "add", name: "carrots" })).toMatchObject({
    status: "added",
    item: { name: "carrots", quantity: 1 },
  });
  expect(vague.quantity).toBe(6);
});

it("persists catalog aliases when updating manual stock for later offline additions", async () => {
  await seed("scallion");
  resolveIngredient.mockResolvedValueOnce({
    id: "scallion",
    name: "scallion",
    aliases: ["spring onion"],
  });
  expect(await mutate({ action: "add", name: "spring onions", quantity: 2 })).toMatchObject({
    status: "updated",
  });
  resolveIngredient.mockRejectedValue(new Error("offline"));
  expect(await mutate({ action: "add", name: "spring onions", quantity: 2 })).toMatchObject({
    status: "updated",
    item: { quantity: 10 },
  });
  expect(await stocks()).toHaveLength(1);
});

it("allows explicitly confirmed separate batches when correcting a vague row", async () => {
  const vague = await seed("vegetables");
  await seed("carrot");
  expect(
    await mutate({ action: "rename", stockId: vague.id, name: "carrots", keepSeparate: true })
  ).toMatchObject({ status: "renamed", item: { id: vague.id, name: "carrots" } });
  expect(await stocks()).toHaveLength(2);
});

it("allows explicitly identified vague stock to merge into compatible known stock", async () => {
  const vague = await seed("vegetables");
  const carrot = await seed("carrots", 2);
  expect(
    await mutate({ action: "merge", stockId: vague.id, targetStockId: carrot.id, name: "carrots" })
  ).toMatchObject({ status: "merged", item: { quantity: 8 } });
  expect(await stocks()).toHaveLength(1);
});

it("drops obsolete synonyms when a vague source is identified and merged", async () => {
  const vague = await seed("vegetables");
  const carrot = await seed("carrot");
  await database.write(() =>
    database.get("ingredient_synonym").create((row: any) => {
      row.stockId = vague.id;
      row.synonym = "potato";
    })
  );
  await mutate({ action: "merge", stockId: vague.id, targetStockId: carrot.id, name: "carrot" });
  expect(await mutate({ action: "add", name: "potato" })).toMatchObject({
    status: "added",
    item: { name: "potato" },
  });
  expect(carrot.quantity).toBe(12);
});

it("preserves the source name as an alias after merging equivalent ingredients", async () => {
  const source = await seed("spring onions");
  const target = await seed("scallion");
  await database.write(() =>
    database.get("ingredient_synonym").create((row: any) => {
      row.stockId = source.id;
      row.synonym = "scallion";
    })
  );
  expect(
    await mutate({ action: "merge", stockId: source.id, targetStockId: target.id })
  ).toMatchObject({ status: "merged" });
  expect(await mutate({ action: "add", name: "spring onions" })).toMatchObject({
    status: "updated",
    item: { quantity: 13 },
  });
  expect(await stocks()).toHaveLength(1);
});

it("retains the canonical name when an existing alias-named row is updated online", async () => {
  await seed("spring onions");
  resolveIngredient.mockResolvedValueOnce({
    id: "scallion",
    name: "scallion",
    aliases: ["spring onion"],
  });
  expect(await mutate({ action: "add", name: "spring onions" })).toMatchObject({
    status: "updated",
  });
  resolveIngredient.mockRejectedValue(new Error("offline"));
  expect(await mutate({ action: "add", name: "scallion" })).toMatchObject({
    status: "updated",
    item: { quantity: 8 },
  });
  expect(await stocks()).toHaveLength(1);
});
