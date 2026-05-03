import { Q } from "@nozbe/watermelondb";
import GroceryItemCheck, { type GroceryItemCheckData } from "../models/GroceryItemCheck";
import { BaseRepository } from "./BaseRepository";
import { database } from "../database";

export class GroceryItemCheckRepository extends BaseRepository<GroceryItemCheck> {
  constructor() {
    super("grocery_item_check");
  }

  // Get or create a check record for an ingredient
  async getOrCreate(ingredientName: string): Promise<GroceryItemCheck> {
    const normalizedName = ingredientName.toLowerCase().trim();

    const existing = await this.collection
      .query(Q.where("ingredient_name", normalizedName), Q.take(1))
      .fetch();

    if (existing.length > 0 && existing[0]) {
      return existing[0];
    }

    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.ingredientName = normalizedName;
        record.isChecked = false;
      });
    });
  }

  // Check if an ingredient is checked
  async isChecked(ingredientName: string): Promise<boolean> {
    const normalizedName = ingredientName.toLowerCase().trim();

    const records = await this.collection
      .query(Q.where("ingredient_name", normalizedName), Q.take(1))
      .fetch();

    return records.length > 0 && records[0] ? records[0].isChecked : false;
  }

  // Set checked state for an ingredient
  async setChecked(ingredientName: string, isChecked: boolean): Promise<GroceryItemCheck> {
    const normalizedName = ingredientName.toLowerCase().trim();

    const existing = await this.collection
      .query(Q.where("ingredient_name", normalizedName), Q.take(1))
      .fetch();

    if (existing.length > 0 && existing[0]) {
      const record = existing[0];
      await database.write(async () => {
        await record.update((r) => {
          r.isChecked = isChecked;
        });
      });
      return record;
    }

    // Create new record if doesn't exist
    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.ingredientName = normalizedName;
        record.isChecked = isChecked;
      });
    });
  }

  // Toggle checked state for an ingredient
  async toggleChecked(ingredientName: string): Promise<boolean> {
    const normalizedName = ingredientName.toLowerCase().trim();

    // Use a single write to getOrCreate + toggle to avoid nested writes.
    // Never call @writer methods (e.g. record.toggleChecked) from inside database.write -
    // that causes a deadlock. Use record.update() or prepareUpdate+batch instead.
    let newState = false;
    await database.write(async () => {
      const existing = await this.collection
        .query(Q.where("ingredient_name", normalizedName), Q.take(1))
        .fetch();

      if (existing.length > 0 && existing[0]) {
        const record = existing[0];
        newState = !record.isChecked;
        await database.batch(
          record.prepareUpdate((r) => {
            r.isChecked = newState;
          })
        );
      } else {
        // Create with final state directly - no create+update in same transaction
        newState = true;
        await this.collection.create((r) => {
          r.ingredientName = normalizedName;
          r.isChecked = true;
        });
      }
    });

    return newState;
  }

  // Get all checked items
  async getAllCheckedItems(): Promise<GroceryItemCheck[]> {
    return await this.collection.query(Q.where("is_checked", true)).fetch();
  }

  // Get all check states as a map
  async getCheckAttributesMap(): Promise<Map<string, { isChecked: boolean; isDeleted: boolean }>> {
    const allRecords = await this.findAll();
    const map = new Map<string, { isChecked: boolean; isDeleted: boolean }>();

    for (const record of allRecords) {
      map.set(record.ingredientName, {
        isChecked: record.isChecked,
        isDeleted: record.isDeleted || false,
      });
    }

    return map;
  }

  // Deprecated: keeping for compatibility during migration, or remove if safe
  async getCheckStatesMap(): Promise<Map<string, boolean>> {
    const allRecords = await this.findAll();
    const map = new Map<string, boolean>();

    for (const record of allRecords) {
      map.set(record.ingredientName, record.isChecked);
    }

    return map;
  }

  // Set deleted state for an ingredient
  async setDeleted(ingredientName: string, isDeleted: boolean): Promise<GroceryItemCheck> {
    const normalizedName = ingredientName.toLowerCase().trim();

    const existing = await this.collection
      .query(Q.where("ingredient_name", normalizedName), Q.take(1))
      .fetch();

    if (existing.length > 0 && existing[0]) {
      const record = existing[0];
      await database.write(async () => {
        await record.update((r) => {
          r.isDeleted = isDeleted;
        });
      });
      return record;
    }

    // Create new record if doesn't exist (e.g. deleting an item that wasn't checked before)
    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.ingredientName = normalizedName;
        record.isChecked = false;
        record.isDeleted = isDeleted;
      });
    });
  }

  // Set deleted state for multiple ingredients in one batch
  async setDeletedBatch(items: { name: string; isDeleted: boolean }[]): Promise<void> {
    if (items.length === 0) return;

    // 1. Gather all names
    const names = items.map((i) => i.name.toLowerCase().trim());

    // 2. Fetch existing records
    // Note: If names array is very large, Q.oneOf might fail on some SQLite limits (999 vars).
    // Usually recipes have < 50 ingredients so this is safe.
    const existingRecords = await this.collection
      .query(Q.where("ingredient_name", Q.oneOf(names)))
      .fetch();

    const existingMap = new Map<string, GroceryItemCheck>();
    existingRecords.forEach((r) => existingMap.set(r.ingredientName, r));

    // 3. Perform write
    await database.write(async () => {
      const batchOps = [];

      for (const item of items) {
        const normalizedName = item.name.toLowerCase().trim();
        const existing = existingMap.get(normalizedName);

        if (existing) {
          if (existing.isDeleted !== item.isDeleted) {
            batchOps.push(
              existing.prepareUpdate((record) => {
                record.isDeleted = item.isDeleted;
              })
            );
          }
        } else {
          batchOps.push(
            this.collection.prepareCreate((record) => {
              record.ingredientName = normalizedName;
              record.isChecked = false;
              record.isDeleted = item.isDeleted;
            })
          );
        }
      }

      if (batchOps.length > 0) {
        await database.batch(batchOps);
      }
    });
  }

  // Clear all checked items (uncheck all)
  async uncheckAll(): Promise<void> {
    const checkedItems = await this.getAllCheckedItems();

    await database.write(async () => {
      await database.batch(
        checkedItems.map((item) =>
          item.prepareUpdate((record) => {
            record.isChecked = false;
          })
        )
      );
    });
  }

  // Clear all check records (reset)
  async clearAll(): Promise<void> {
    const allItems = await this.findAll();

    await database.write(async () => {
      await database.batch(allItems.map((item) => item.prepareDestroyPermanently()));
    });
  }

  // Get count of checked items
  async getCheckedCount(): Promise<number> {
    return await this.collection.query(Q.where("is_checked", true)).fetchCount();
  }
}
