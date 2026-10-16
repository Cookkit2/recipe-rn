import { Database, appSchema, tableSchema } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import schema from "../../schema";
import migrations from "../../migrations";
import { modelClasses } from "../../models";
import type MealPlan from "../../models/MealPlan";
import type GroceryItemCheck from "../../models/GroceryItemCheck";
import { MealPlanRepository } from "../MealPlanRepository";
import { GroceryItemCheckRepository } from "../GroceryItemCheckRepository";
import { LeftoverRepository } from "../LeftoverRepository";
const LokiMemoryAdapter = require("lokijs").LokiMemoryAdapter;
let mockDatabase: Database;
jest.mock("../../database", () => ({
  get database() {
    return mockDatabase;
  },
}));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

beforeAll(async () => {
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
  await mockDatabase.write(() =>
    mockDatabase.get("grocery_item_check").create((row: any) => {
      row.ingredientName = "Olive Oils";
      row.isChecked = true;
    })
  );
});

it("persists repeated recipes on separate days and multiple dishes in a slot", async () => {
  const repo = new MealPlanRepository();
  const date = new Date(2026, 9, 12);
  const next = new Date(2026, 9, 13);
  const first = await repo.upsertSlotRecipe({
    recipeId: "chicken",
    servings: 2,
    date,
    mealSlot: "dinner",
  });
  await repo.upsertSlotRecipe({ recipeId: "salad", servings: 1, date, mealSlot: "dinner" });
  await repo.upsertSlotRecipe({ recipeId: "chicken", servings: 2, date: next, mealSlot: "dinner" });
  const updated = await repo.upsertSlotRecipe({
    recipeId: "chicken",
    servings: 4,
    date,
    mealSlot: "dinner",
  });
  expect(updated.id).toBe(first.id);
  expect(await repo.getByDateRange(date, next)).toHaveLength(3);
  await repo.updateEntry(first.id, { servings: 3, date, mealSlot: "lunch" });
  expect((await repo.findById(first.id))?.mealSlot).toBe("lunch");
  await repo.delete(first.id);
  expect(await repo.getByDateRange(date, next)).toHaveLength(2);
});

it("isolates checked and hidden ingredients between weeks", async () => {
  const thisWeek = new GroceryItemCheckRepository(new Date());
  const nextWeek = new GroceryItemCheckRepository(new Date(Date.now() + 7 * 86400000));
  await thisWeek.setChecked("eggs", true);
  await thisWeek.setDeleted("milk", true);
  expect((await thisWeek.getCheckAttributesMap()).get("egg")?.isChecked).toBe(true);
  expect((await thisWeek.getCheckAttributesMap()).get("olive oil")?.isChecked).toBe(true);
  expect(await nextWeek.getCheckAttributesMap()).toEqual(new Map());
  await nextWeek.setChecked("eggs", true);
  await thisWeek.setDeletedBatch([{ name: "eggs", isDeleted: false }]);
  expect((await thisWeek.getCheckAttributesMap()).get("egg")?.isChecked).toBe(false);
  await thisWeek.clearAll();
  expect((await nextWeek.getCheckAttributesMap()).get("egg")?.isChecked).toBe(true);
});

it("stores standalone cooked food without adding raw pantry stock", async () => {
  const repo = new LeftoverRepository();
  const saved = await repo.save({
    name: " Soup ",
    servings: 2,
    cookedAt: new Date(Date.now() - 86400000),
    remindAt: new Date(Date.now() + 86400000),
  });
  expect(saved.name).toBe("Soup");
  expect((await repo.listActive()).map((row) => row.id)).toContain(saved.id);
  expect(await mockDatabase.get("stock").query().fetchCount()).toBe(0);
  await repo.setStatus(saved.id, "eaten");
  expect((await repo.listActive()).map((row) => row.id)).not.toContain(saved.id);
});

it("upgrades a version-7 database without losing planned meals or existing shopping checks", async () => {
  const oldSchema = appSchema({
    version: 7,
    tables: Object.values(schema.tables)
      .filter((table) => table.name !== "leftover")
      .map((table) =>
        tableSchema({
          name: table.name,
          columns: Object.values(table.columns).filter(
            (column) => !(table.name === "grocery_item_check" && column.name === "week_start")
          ),
        })
      ),
  });
  const adapter = new LokiJSAdapter({
    schema: oldSchema,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    _testLokiAdapter: new LokiMemoryAdapter(),
    extraLokiOptions: { autosave: false },
  });
  const oldDatabase = new Database({
    adapter,
    modelClasses: modelClasses.filter((model) => model.table !== "leftover"),
  });
  const meal = await oldDatabase.write(() =>
    oldDatabase.get("meal_plan").create((row: any) => {
      row.recipeId = "existing-recipe";
      row.servings = 2;
      row.date = new Date();
      row.mealSlot = "dinner";
    })
  );
  const check = await oldDatabase.write(() =>
    oldDatabase.get("grocery_item_check").create((row: any) => {
      row.ingredientName = "milk";
      row.isChecked = true;
    })
  );
  await new Promise<void>((resolve, reject) =>
    (adapter as any)._driver.loki.saveDatabase((error: Error | null) =>
      error ? reject(error) : resolve()
    )
  );
  const upgraded = new Database({
    adapter: await adapter.testClone({ schema, migrations }),
    modelClasses,
  });
  expect((await upgraded.get<MealPlan>("meal_plan").find(meal.id)).recipeId).toBe(
    "existing-recipe"
  );
  expect(
    (await upgraded.get<GroceryItemCheck>("grocery_item_check").find(check.id)).isChecked
  ).toBe(true);
  expect(await upgraded.get("leftover").query().fetchCount()).toBe(0);
});
