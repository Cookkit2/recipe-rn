import { Q } from "@nozbe/watermelondb";
import StockCategory from "../models/StockCategory";
import { BaseRepository } from "./BaseRepository";

export class StockCategoryRepository extends BaseRepository<StockCategory> {
  constructor() {
    super("stock_category");
  }

  // Find categories for a stock item
  async findByStockId(stockId: string): Promise<StockCategory[]> {
    return await this.collection.query(Q.where("stock_id", Q.eq(stockId))).fetch();
  }

  // Find stocks by category
  async findByCategoryId(categoryId: string): Promise<StockCategory[]> {
    return await this.collection.query(Q.where("category_id", Q.eq(categoryId))).fetch();
  }

  // Find stock IDs by category ID (for matching)
  async findStockIdsByCategoryId(categoryId: string): Promise<string[]> {
    const stockCategories = await this.findByCategoryId(categoryId);
    return stockCategories.map((sc) => sc.stockId);
  }

  // Add category to stock
  async addCategoryToStock(stockId: string, categoryId: string): Promise<StockCategory> {
    // Check if relationship already exists
    const existing = await this.collection
      .query(Q.and(Q.where("stock_id", Q.eq(stockId)), Q.where("category_id", Q.eq(categoryId))))
      .fetch();

    if (existing.length > 0) {
      return existing[0]!;
    }

    return await this.create({
      stockId,
      categoryId,
    });
  }

  // Remove category from stock
  async removeCategoryFromStock(stockId: string, categoryId: string): Promise<void> {
    const stockCategories = await this.collection
      .query(Q.and(Q.where("stock_id", Q.eq(stockId)), Q.where("category_id", Q.eq(categoryId))))
      .fetch();

    const db = this.collection.database;
    await db.write(async () => {
      const batchOps: import("@nozbe/watermelondb").Model[] = stockCategories.map((sc) =>
        sc.prepareMarkAsDeleted()
      );
      if (batchOps.length > 0) {
        await db.batch(...batchOps);
      }
    });
  }

  // Batch add categories to stock
  async addCategoriesToStock(stockId: string, categoryIds: string[]): Promise<StockCategory[]> {
    const db = this.collection.database;
    const created: StockCategory[] = [];

    await db.write(async () => {
      for (const categoryId of categoryIds) {
        // Check if relationship already exists (inline to avoid nested write)
        const existing = await this.collection
          .query(
            Q.and(Q.where("stock_id", Q.eq(stockId)), Q.where("category_id", Q.eq(categoryId)))
          )
          .fetch();

        if (existing.length > 0) {
          created.push(existing[0]!);
        } else {
          const sc = await this.collection.create((record: any) => {
            record.stockId = stockId;
            record.categoryId = categoryId;
          });
          created.push(sc);
        }
      }
    });

    return created;
  }

  // Remove all categories for a stock
  async removeAllForStock(stockId: string): Promise<void> {
    const db = this.collection.database;

    await db.write(async () => {
      const stockCategories = await this.collection
        .query(Q.where("stock_id", Q.eq(stockId)))
        .fetch();
      const batchOps: import("@nozbe/watermelondb").Model[] = stockCategories.map((sc) =>
        sc.prepareMarkAsDeleted()
      );
      if (batchOps.length > 0) {
        await db.batch(...batchOps);
      }
    });
  }

  // Replace all categories for a stock
  async replaceCategories(stockId: string, categoryIds: string[]): Promise<StockCategory[]> {
    const db = this.collection.database;
    const created: StockCategory[] = [];

    // Single write transaction for both remove + add
    await db.write(async () => {
      // Remove existing
      const existing = await this.collection.query(Q.where("stock_id", Q.eq(stockId))).fetch();

      const batchOps: import("@nozbe/watermelondb").Model[] = existing.map((sc) =>
        sc.prepareMarkAsDeleted()
      );

      // Add new
      for (const categoryId of categoryIds) {
        batchOps.push(
          this.collection.prepareCreate((record: any) => {
            record.stockId = stockId;
            record.categoryId = categoryId;
          })
        );
      }

      if (batchOps.length > 0) {
        await db.batch(...batchOps);
      }

      // After batch, we need to return created records.
      // Since prepareCreate doesn't return the resolved records easily in watermelon,
      // we fetch them again. (They should be instantly available in local DB after batch)
      if (categoryIds.length > 0) {
        const newRecords = await this.collection
          .query(
            Q.and(Q.where("stock_id", Q.eq(stockId)), Q.where("category_id", Q.oneOf(categoryIds)))
          )
          .fetch();
        created.push(...newRecords);
      }
    });

    return created;
  }

  // Check if stock has category
  async hasCategory(stockId: string, categoryId: string): Promise<boolean> {
    const stockCategories = await this.collection
      .query(Q.and(Q.where("stock_id", Q.eq(stockId)), Q.where("category_id", Q.eq(categoryId))))
      .fetch();

    return stockCategories.length > 0;
  }
}
