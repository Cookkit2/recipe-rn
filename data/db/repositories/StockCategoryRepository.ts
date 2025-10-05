import { Q } from "@nozbe/watermelondb";
import StockCategory, { type StockCategoryData } from "../models/StockCategory";
import { BaseRepository } from "./BaseRepository";

export class StockCategoryRepository extends BaseRepository<StockCategory> {
  constructor() {
    super("stock_category");
  }

  // Find categories for a stock item
  async findByStockId(stockId: string): Promise<StockCategory[]> {
    return await this.collection
      .query(Q.where("stock_id", Q.eq(stockId)))
      .fetch();
  }

  // Find stocks by category
  async findByCategoryId(categoryId: string): Promise<StockCategory[]> {
    return await this.collection
      .query(Q.where("category_id", Q.eq(categoryId)))
      .fetch();
  }

  // Find stock IDs by category ID (for matching)
  async findStockIdsByCategoryId(categoryId: string): Promise<string[]> {
    const stockCategories = await this.findByCategoryId(categoryId);
    return stockCategories.map((sc) => sc.stockId);
  }

  // Add category to stock
  async addCategoryToStock(
    stockId: string,
    categoryId: string
  ): Promise<StockCategory> {
    // Check if relationship already exists
    const existing = await this.collection
      .query(
        Q.and(
          Q.where("stock_id", Q.eq(stockId)),
          Q.where("category_id", Q.eq(categoryId))
        )
      )
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
  async removeCategoryFromStock(
    stockId: string,
    categoryId: string
  ): Promise<void> {
    const stockCategories = await this.collection
      .query(
        Q.and(
          Q.where("stock_id", Q.eq(stockId)),
          Q.where("category_id", Q.eq(categoryId))
        )
      )
      .fetch();

    const db = this.collection.database;
    await db.write(async () => {
      for (const sc of stockCategories) {
        await sc.markAsDeleted();
      }
    });
  }

  // Batch add categories to stock
  async addCategoriesToStock(
    stockId: string,
    categoryIds: string[]
  ): Promise<StockCategory[]> {
    const db = this.collection.database;
    const created: StockCategory[] = [];

    await db.write(async () => {
      for (const categoryId of categoryIds) {
        const sc = await this.addCategoryToStock(stockId, categoryId);
        created.push(sc);
      }
    });

    return created;
  }

  // Remove all categories for a stock
  async removeAllForStock(stockId: string): Promise<void> {
    const stockCategories = await this.findByStockId(stockId);
    const db = this.collection.database;

    await db.write(async () => {
      for (const sc of stockCategories) {
        await sc.markAsDeleted();
      }
    });
  }

  // Replace all categories for a stock
  async replaceCategories(
    stockId: string,
    categoryIds: string[]
  ): Promise<StockCategory[]> {
    await this.removeAllForStock(stockId);
    return await this.addCategoriesToStock(stockId, categoryIds);
  }

  // Check if stock has category
  async hasCategory(stockId: string, categoryId: string): Promise<boolean> {
    const stockCategories = await this.collection
      .query(
        Q.and(
          Q.where("stock_id", Q.eq(stockId)),
          Q.where("category_id", Q.eq(categoryId))
        )
      )
      .fetch();

    return stockCategories.length > 0;
  }
}
