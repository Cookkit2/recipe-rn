import { Q } from "@nozbe/watermelondb";
import GroceryItemCheck from "../models/GroceryItemCheck";
import { BaseRepository } from "./BaseRepository";
import { database } from "../database";
import { normalizeGroceryIngredientName } from "~/utils/grocery-ingredient-name";
import { localDateKey, startOfWeek } from "~/utils/meal-plan-calendar";

let legacyMigration: Promise<void> | undefined;

async function claimLegacyChecks(): Promise<void> {
  legacyMigration ??= database
    .write(async () => {
      const rows = await database
        .get<GroceryItemCheck>("grocery_item_check")
        .query(Q.where("week_start", null))
        .fetch();
      const week = localDateKey(startOfWeek(new Date()));
      const byName = new Map<string, GroceryItemCheck>();
      const duplicates: GroceryItemCheck[] = [];
      for (const row of rows.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())) {
        const name = normalizeGroceryIngredientName(row.ingredientName);
        const previous = byName.get(name);
        if (previous) duplicates.push(previous);
        byName.set(name, row);
      }
      if (rows.length)
        await database.batch([
          ...[...byName].map(([name, row]) =>
            row.prepareUpdate((record) => {
              record.weekStart = week;
              record.ingredientName = name;
            })
          ),
          ...duplicates.map((row) => row.prepareDestroyPermanently()),
        ]);
    })
    .catch((error) => {
      legacyMigration = undefined;
      throw error;
    });
  await legacyMigration;
}

export class GroceryItemCheckRepository extends BaseRepository<GroceryItemCheck> {
  readonly weekStart: string;
  constructor(week: Date = new Date()) {
    super("grocery_item_check");
    this.weekStart = localDateKey(startOfWeek(week));
  }

  private async findByIngredientName(name: string): Promise<GroceryItemCheck | null> {
    const rows = await this.collection
      .query(
        Q.where("week_start", this.weekStart),
        Q.where("ingredient_name", normalizeGroceryIngredientName(name)),
        Q.take(1)
      )
      .fetch();
    return rows[0] ?? null;
  }

  private async upsert(
    name: string,
    changes: { isChecked?: boolean; isDeleted?: boolean },
    toggle = false
  ): Promise<GroceryItemCheck> {
    await claimLegacyChecks();
    return database.write(async () => {
      const existing = await this.findByIngredientName(name);
      if (existing)
        return existing.update((record) => {
          if (toggle) record.isChecked = !record.isChecked;
          else if (changes.isChecked !== undefined) record.isChecked = changes.isChecked;
          if (changes.isDeleted !== undefined) record.isDeleted = changes.isDeleted;
        });
      return this.collection.create((record) => {
        record.ingredientName = normalizeGroceryIngredientName(name);
        record.weekStart = this.weekStart;
        record.isChecked = toggle || (changes.isChecked ?? false);
        record.isDeleted = changes.isDeleted ?? false;
      });
    });
  }

  async getOrCreate(name: string): Promise<GroceryItemCheck> {
    return this.upsert(name, {});
  }
  async isChecked(name: string): Promise<boolean> {
    await claimLegacyChecks();
    return (await this.findByIngredientName(name))?.isChecked ?? false;
  }
  async setChecked(name: string, value: boolean): Promise<GroceryItemCheck> {
    return this.upsert(name, { isChecked: value });
  }
  async toggleChecked(name: string): Promise<boolean> {
    return (await this.upsert(name, {}, true)).isChecked;
  }
  async setDeleted(name: string, value: boolean): Promise<GroceryItemCheck> {
    return this.upsert(name, { isDeleted: value });
  }

  private async scopedRows(): Promise<GroceryItemCheck[]> {
    await claimLegacyChecks();
    return this.collection.query(Q.where("week_start", this.weekStart)).fetch();
  }
  async getAllCheckedItems(): Promise<GroceryItemCheck[]> {
    return (await this.scopedRows()).filter((row) => row.isChecked);
  }
  async getCheckedCount(): Promise<number> {
    return (await this.getAllCheckedItems()).length;
  }
  async getCheckAttributesMap(): Promise<Map<string, { isChecked: boolean; isDeleted: boolean }>> {
    return new Map(
      (await this.scopedRows()).map((row) => [
        row.ingredientName,
        { isChecked: row.isChecked, isDeleted: row.isDeleted || false },
      ])
    );
  }

  async setDeletedBatch(items: { name: string; isDeleted: boolean }[]): Promise<void> {
    if (!items.length) return;
    await claimLegacyChecks();
    await database.write(async () => {
      const existing = await this.collection
        .query(
          Q.where("week_start", this.weekStart),
          Q.where(
            "ingredient_name",
            Q.oneOf(items.map((item) => normalizeGroceryIngredientName(item.name)))
          )
        )
        .fetch();
      const byName = new Map(existing.map((row) => [row.ingredientName, row]));
      const unique = new Map(
        items.map((item) => [normalizeGroceryIngredientName(item.name), item.isDeleted])
      );
      const operations = [...unique].map(([name, isDeleted]) => {
        const row = byName.get(name);
        return row
          ? row.prepareUpdate((record) => {
              record.isDeleted = isDeleted;
              // Adding or resizing a planned dish changes the quantity to buy.
              if (!isDeleted) record.isChecked = false;
            })
          : this.collection.prepareCreate((record) => {
              record.ingredientName = name;
              record.weekStart = this.weekStart;
              record.isChecked = false;
              record.isDeleted = isDeleted;
            });
      });
      await database.batch(operations);
    });
  }
  async uncheckAll(): Promise<void> {
    const rows = await this.getAllCheckedItems();
    await database.write(() =>
      database.batch(
        rows.map((row) =>
          row.prepareUpdate((record) => {
            record.isChecked = false;
          })
        )
      )
    );
  }
  async clearAll(): Promise<void> {
    const rows = await this.scopedRows();
    await database.write(() => database.batch(rows.map((row) => row.prepareDestroyPermanently())));
  }
}
