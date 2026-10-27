import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import schema from "~/data/db/schema";
import migrations from "~/data/db/migrations";
import { modelClasses } from "~/data/db/models";
import { IngredientCatalogService, type CatalogSnapshot } from "../IngredientCatalogService";
import { catalogIdentityForName } from "../catalogIdentity";

jest.mock("~/utils/logger", () => ({ log: { warn: jest.fn() } }));
const LokiMemoryAdapter = require("lokijs").LokiMemoryAdapter;
const milk = "11111111-1111-4111-8111-111111111111";
const coconut = "22222222-2222-4222-8222-222222222222";
const egg = "33333333-3333-4333-8333-333333333333";
const snapshot: CatalogSnapshot = {
  ingredients: [
    { id: milk, name: "Milk" },
    { id: coconut, name: "Coconut milk" },
    { id: egg, name: "Egg" },
  ],
  aliases: [
    { baseIngredientId: milk, alias: "Dairy milk" },
    { baseIngredientId: egg, alias: "Egg white" },
    { baseIngredientId: egg, alias: "Egg yolk" },
  ],
};
let database: Database;
let adapter: LokiJSAdapter;
beforeEach(() => {
  adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    _testLokiAdapter: new LokiMemoryAdapter(),
    extraLokiOptions: { autosave: false },
  });
  database = new Database({ adapter, modelClasses });
});
afterEach(() => adapter._driver.loki.close());

it("persists approved aliases for offline use without any stock rows", async () => {
  const fetchSnapshot = jest.fn().mockResolvedValue(snapshot);
  const first = new IngredientCatalogService(database, fetchSnapshot);
  expect(await first.hasSnapshot()).toBe(false);
  expect(await first.refresh()).toBe(true);
  const offline = new IngredientCatalogService(
    database,
    jest.fn().mockRejectedValue(new Error("offline"))
  );
  expect(await offline.hasSnapshot()).toBe(true);
  expect(await offline.resolve(" dairy MILKS ")).toMatchObject({ id: milk, name: "dairy MILKS" });
  expect(await offline.resolve("Coconut milk")).toMatchObject({ id: coconut });
  expect(await offline.resolve("Unknown custom ingredient")).toBeNull();
  expect(await offline.resolveLocal("Milk")).toMatchObject({ id: milk });
});

it("keeps the last snapshot on failed or invalid replacement", async () => {
  const fetchSnapshot = jest
    .fn()
    .mockResolvedValueOnce(snapshot)
    .mockRejectedValueOnce(new Error("later page failed"))
    .mockResolvedValueOnce({ ingredients: [{ id: "temp", name: "Bad" }], aliases: [] });
  const service = new IngredientCatalogService(database, fetchSnapshot);
  await service.refresh();
  expect(await service.refresh()).toBe(false);
  expect(await service.refresh()).toBe(false);
  expect(await service.resolveLocal("Dairy milk")).toMatchObject({ id: milk });
  expect(await database.get("base_ingredient_cache").query().fetchCount()).toBe(3);
});

it("deduplicates same-ID aliases and rejects all matches for an ambiguous normalized key", async () => {
  const service = new IngredientCatalogService(database, async () => ({
    ...snapshot,
    aliases: [
      ...snapshot.aliases,
      { baseIngredientId: milk, alias: "Dairy milks" },
      { baseIngredientId: coconut, alias: "Milks" },
    ],
  }));
  await service.refresh();
  expect(await service.resolveLocal("milk")).toBeNull();
  expect(await service.resolveLocal("Dairy milk")).toMatchObject({ id: milk });
  expect(await database.get("base_ingredient_alias_cache").query().fetchCount()).toBe(4);
});

it("debounces repeated misses", async () => {
  const fetchSnapshot = jest.fn().mockResolvedValue(snapshot);
  const service = new IngredientCatalogService(database, fetchSnapshot);
  await service.resolve("unknown");
  await service.resolve("another unknown");
  await service.resolve("third unknown");
  expect(fetchSnapshot).toHaveBeenCalledTimes(1);
});

it("keeps coarse catalog forms distinct and only returns equivalent aliases", async () => {
  const service = new IngredientCatalogService(database, async () => snapshot);
  await service.refresh();
  expect(await service.resolveLocal("Egg whites")).toEqual({
    id: egg,
    name: "Egg whites",
    aliases: ["Egg white"],
  });
  expect(await service.resolveLocal("Egg")).toEqual({ id: egg, name: "Egg", aliases: [] });
  expect((await service.byId(egg))?.aliases).toEqual(["Egg white", "Egg yolk"]);
  expect(catalogIdentityForName({ id: egg, name: "Egg" }, ["Egg white"], "Eggplant")).toBeNull();
  expect(
    catalogIdentityForName({ id: egg, name: "Eggplant" }, ["Aubergine"], "Aubergines")
  ).toMatchObject({ name: "Eggplant" });
});

it("does not expose an ambiguous alias through a uniquely resolved canonical name", async () => {
  const service = new IngredientCatalogService(database, async () => ({
    ...snapshot,
    aliases: [...snapshot.aliases, { baseIngredientId: coconut, alias: "Dairy milk" }],
  }));
  await service.refresh();
  expect(await service.resolveLocal("Dairy milk")).toBeNull();
  expect((await service.resolveLocal("Coconut milk"))?.aliases).not.toContain("Dairy milk");
});

it("shares one in-flight snapshot refresh", async () => {
  const fetchSnapshot = jest.fn().mockResolvedValue(snapshot);
  const service = new IngredientCatalogService(database, fetchSnapshot);
  await Promise.all([service.refresh(), service.refresh()]);
  expect(fetchSnapshot).toHaveBeenCalledTimes(1);
});

it("preserves variants expressed with an alternate catalog name", () => {
  expect(
    catalogIdentityForName(
      { id: egg, name: "Chickpea" },
      ["Garbanzo bean", "Canned garbanzo bean"],
      "Canned garbanzo beans"
    )
  ).toEqual({ id: egg, name: "Canned garbanzo beans", aliases: ["Canned garbanzo bean"] });
  expect(
    catalogIdentityForName(
      { id: egg, name: "Chickpea" },
      ["Garbanzo bean", "Canned garbanzo bean"],
      "Chickpeas"
    )?.aliases
  ).toEqual(["Garbanzo bean"]);
});

it("retains a never-used alias after a database reload and canonical name refresh", async () => {
  const fetchSnapshot = jest
    .fn()
    .mockResolvedValueOnce({
      ...snapshot,
      ingredients: [
        ...snapshot.ingredients,
        { id: "44444444-4444-4444-8444-444444444444", name: "Eggplant" },
      ],
      aliases: [
        ...snapshot.aliases,
        { baseIngredientId: "44444444-4444-4444-8444-444444444444", alias: "Aubergine" },
      ],
    })
    .mockResolvedValueOnce({
      ...snapshot,
      ingredients: [{ id: milk, name: "Whole milk" }, ...snapshot.ingredients.slice(1)],
    });
  const service = new IngredientCatalogService(database, fetchSnapshot);
  await service.refresh();
  await new Promise<void>((resolve, reject) =>
    adapter._driver.loki.saveDatabase((error: Error | null) => (error ? reject(error) : resolve()))
  );
  const reloadedAdapter = await adapter.testClone({ schema, migrations });
  try {
    const reloaded = new Database({ adapter: reloadedAdapter, modelClasses });
    const offline = new IngredientCatalogService(
      reloaded,
      jest.fn().mockRejectedValue(new Error("offline"))
    );
    expect(await offline.resolve("Aubergines")).toMatchObject({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Eggplant",
    });
    expect(await reloaded.get("stock").query().fetchCount()).toBe(0);
  } finally {
    reloadedAdapter._driver.loki.close();
  }
  expect(await service.refresh()).toBe(true);
  expect(await service.byId(milk)).toMatchObject({ id: milk, name: "Whole milk" });
  expect(await service.resolveLocal("Milk")).toBeNull();
});
