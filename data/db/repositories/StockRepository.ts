import { Q } from "@nozbe/watermelondb";
import Stock, { type StockData } from "../models/Stock";
import BaseIngredient from "../models/BaseIngredient";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface StockSearchOptions extends SearchOptions {
  category?: string;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  ingredientId?: string;
}

export interface StockWithIngredient {
  stock: Stock;
  ingredient: BaseIngredient;
}

export class StockRepository extends BaseRepository<Stock> {
  constructor() {
    super("stock");
  }

  // Search stock items with filters
  async searchStock(options: StockSearchOptions = {}): Promise<Stock[]> {
    let query = this.collection.query();

    // Text search on name
    if (options.searchTerm) {
      query = this.buildSearchQuery(query, options.searchTerm, ["name"]);
    }

    // Filter by category
    if (options.category) {
      query = query.where("category", Q.eq(options.category));
    }

    // Filter by ingredient
    if (options.ingredientId) {
      query = query.where("base_ingredient_id", Q.eq(options.ingredientId));
    }

    // Apply sorting
    query = this.applySorting(
      query,
      options.sortBy || "name",
      options.sortOrder || "asc"
    );

    // Apply pagination
    if (options.offset) {
      query = query.skip(options.offset);
    }
    if (options.limit) {
      query = query.take(options.limit);
    }

    let items = await query.fetch();

    // Post-process filters that can't be done in SQL
    if (options.isExpired === true) {
      items = items.filter((item) => item.isExpired);
    } else if (options.isExpired === false) {
      items = items.filter((item) => !item.isExpired);
    }

    if (options.isExpiringSoon === true) {
      items = items.filter((item) => item.isExpiringSoon);
    } else if (options.isExpiringSoon === false) {
      items = items.filter((item) => !item.isExpiringSoon);
    }

    return items;
  }

  // Get stock with ingredient details
  async getStockWithIngredient(
    stockId: string
  ): Promise<StockWithIngredient | null> {
    try {
      const stock = await this.findById(stockId);
      if (!stock) return null;

      const ingredient = await stock.baseIngredient;

      return {
        stock,
        ingredient,
      };
    } catch (error) {
      console.error("Error fetching stock with ingredient:", error);
      return null;
    }
  }

  // Get all stock with ingredient details
  async getAllStockWithIngredients(): Promise<StockWithIngredient[]> {
    const stockItems = await this.findAll();

    const results = await Promise.all(
      stockItems.map(async (stock) => {
        const ingredient = await stock.baseIngredient;
        return { stock, ingredient };
      })
    );

    return results;
  }

  // Get expired items
  async getExpiredItems(): Promise<Stock[]> {
    const items = await this.findAll();
    return items.filter((item) => item.isExpired);
  }

  // Get items expiring soon
  async getExpiringSoonItems(days: number = 3): Promise<Stock[]> {
    const items = await this.findAll();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    return items.filter((item) => {
      if (!item.expiryDate) return false;
      return item.expiryDate <= threshold && !item.isExpired;
    });
  }

  // Get stock by ingredient
  async getStockByIngredient(ingredientId: string): Promise<Stock[]> {
    return await this.collection
      .query(Q.where("base_ingredient_id", ingredientId))
      .fetch();
  }

  // Get stock by category
  async getStockByCategory(category: string): Promise<Stock[]> {
    return await this.collection.query(Q.where("category", category)).fetch();
  }

  // Get all categories
  async getAllCategories(): Promise<string[]> {
    const items = await this.collection.query().fetch();
    const categories = new Set<string>();

    items.forEach((item) => {
      if (item.category) {
        categories.add(item.category);
      }
    });

    return Array.from(categories).sort();
  }

  // Update stock quantity
  async updateQuantity(stockId: string, newQuantity: number): Promise<Stock> {
    return await this.update(stockId, {
      quantity: newQuantity,
    } as Partial<StockData>);
  }

  // Consume stock (reduce quantity)
  async consumeStock(stockId: string, amount: number): Promise<Stock> {
    const stock = await this.findById(stockId);
    if (!stock) {
      throw new Error("Stock item not found");
    }

    const newQuantity = Math.max(0, stock.quantity - amount);
    return await this.updateQuantity(stockId, newQuantity);
  }

  // Add stock (increase quantity)
  async addStock(stockId: string, amount: number): Promise<Stock> {
    const stock = await this.findById(stockId);
    if (!stock) {
      throw new Error("Stock item not found");
    }

    const newQuantity = stock.quantity + amount;
    return await this.updateQuantity(stockId, newQuantity);
  }

  // Check if ingredient is in stock
  async isIngredientInStock(
    ingredientId: string,
    minimumQuantity: number = 0
  ): Promise<boolean> {
    const stockItems = await this.getStockByIngredient(ingredientId);
    const totalQuantity = stockItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    return totalQuantity > minimumQuantity;
  }

  // Get low stock items (quantity <= threshold)
  async getLowStockItems(threshold: number = 1): Promise<Stock[]> {
    const items = await this.findAll();
    return items.filter((item) => item.quantity <= threshold);
  }

  // Create stock with ingredient lookup
  async createStockForIngredient(
    ingredientId: string,
    data: Omit<StockData, "baseIngredientId">
  ): Promise<Stock> {
    return await this.create({
      ...data,
      baseIngredientId: ingredientId,
    } as StockData);
  }
}
