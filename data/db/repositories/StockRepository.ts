import { Q } from "@nozbe/watermelondb";
import Stock, { type StockData } from "../models/Stock";
import { BaseRepository, type SearchOptions } from "./BaseRepository";

export interface StockSearchOptions extends SearchOptions {
  storageType?: string;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  categoryId?: string;
  synonym?: string;
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

    // Filter by storage type
    if (options.storageType) {
      query = query.extend(Q.where("storage_type", Q.eq(options.storageType)));
    }

    // Apply sorting
    query = this.applySorting(query, options.sortBy || "name", options.sortOrder || "asc");

    // Apply pagination
    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
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

  // Get expired items
  async getExpiredItems(): Promise<Stock[]> {
    const items = await this.findAll();
    return items.filter((item) => item.isExpired);
  }

  // Detect expired waste - finds items that are expired and returns them with metadata
  async detectExpiredWaste(): Promise<
    Array<{
      stock: Stock;
      daysExpired: number;
      estimatedCost?: number;
    }>
  > {
    const items = await this.findAll();
    const now = new Date();

    return items
      .filter((item) => item.isExpired)
      .map((stock) => {
        let daysExpired = 0;
        if (stock.expiryDate) {
          const diffTime = now.getTime() - stock.expiryDate.getTime();
          daysExpired = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          stock,
          daysExpired,
          estimatedCost: undefined, // Can be calculated if cost data is added to Stock model
        };
      })
      .sort((a, b) => b.daysExpired - a.daysExpired); // Sort by most expired first
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

  // Get stock by storage type
  async getStockByStorageType(storageType: string): Promise<Stock[]> {
    return await this.collection.query(Q.where("storage_type", Q.eq(storageType))).fetch();
  }

  // Get all storage types
  async getAllStorageTypes(): Promise<string[]> {
    const items = await this.collection.query().fetch();
    const types = new Set<string>();

    items.forEach((item) => {
      if (item.storageType) {
        types.add(item.storageType);
      }
    });

    return Array.from(types).sort();
  }

  // Get stock by category (requires StockCategoryRepository)
  async getStockByCategory(categoryId: string): Promise<Stock[]> {
    const stockCategories = await this.collection.database
      .get("stock_category")
      .query(Q.where("category_id", Q.eq(categoryId)))
      .fetch();

    const stockIds = stockCategories.map((sc: any) => sc.stockId);
    if (stockIds.length === 0) return [];

    return await this.collection.query(Q.where("id", Q.oneOf(stockIds))).fetch();
  }

  // Get stock by synonym (for recipe matching)
  async getStockBySynonym(synonym: string): Promise<Stock[]> {
    const synonyms = await this.collection.database
      .get("ingredient_synonym")
      .query(Q.where("synonym", Q.eq(synonym.toLowerCase())))
      .fetch();

    const stockIds = synonyms.map((syn: any) => syn.stockId);
    if (stockIds.length === 0) return [];

    return await this.collection.query(Q.where("id", Q.oneOf(stockIds))).fetch();
  }

  // Find stock by name or synonym (for recipe matching)
  async findByNameOrSynonym(name: string): Promise<Stock[]> {
    // First try exact name match
    const nameMatch = await this.collection.query(Q.where("name", Q.eq(name))).fetch();

    if (nameMatch.length > 0) return nameMatch;

    // Then try synonym match
    return await this.getStockBySynonym(name);
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

  // Check if ingredient is in stock by name or synonym
  async isIngredientInStock(ingredientName: string, minimumQuantity: number = 0): Promise<boolean> {
    const stockItems = await this.findByNameOrSynonym(ingredientName);
    const totalQuantity = stockItems.reduce((sum, item) => sum + item.quantity, 0);
    return totalQuantity > minimumQuantity;
  }

  // Get low stock items (quantity <= threshold)
  async getLowStockItems(threshold: number = 1): Promise<Stock[]> {
    const items = await this.findAll();
    return items.filter((item) => item.quantity <= threshold);
  }

  // Create stock with categories and synonyms
  async createStockWithMetadata(
    data: StockData,
    options?: {
      categoryIds?: string[];
      synonyms?: string[];
    }
  ): Promise<Stock> {
    // Use a single database.write() to avoid nested write deadlocks
    return await this.collection.database.write(async () => {
      const stock = await this.createRaw(data as any);

      const batchOps: import("@nozbe/watermelondb").Model[] = [];

      if (options?.categoryIds && options.categoryIds.length > 0) {
        const stockCategoryRepo = this.collection.database.get("stock_category");
        for (const categoryId of options.categoryIds!) {
          batchOps.push(
            stockCategoryRepo.prepareCreate((sc: any) => {
              sc.stockId = stock.id;
              sc.categoryId = categoryId;
            })
          );
        }
      }

      if (options?.synonyms && options.synonyms.length > 0) {
        const synonymRepo = this.collection.database.get("ingredient_synonym");
        for (const synonym of options.synonyms!) {
          batchOps.push(
            synonymRepo.prepareCreate((syn: any) => {
              syn.stockId = stock.id;
              syn.synonym = synonym.toLowerCase();
            })
          );
        }
      }

      if (batchOps.length > 0) {
        await this.collection.database.batch(batchOps);
      }

      return stock;
    });
  }

  // Get stock with categories
  async getStockWithCategories(stockId: string): Promise<{
    stock: Stock;
    categories: any[];
  } | null> {
    const stock = await this.findById(stockId);
    if (!stock) return null;

    const stockCategories = await this.collection.database
      .get("stock_category")
      .query(Q.where("stock_id", Q.eq(stockId)))
      .fetch();

    const categoryIds = stockCategories.map((sc: any) => sc.categoryId);
    const categories =
      categoryIds.length > 0
        ? await this.collection.database
            .get("ingredient_category")
            .query(Q.where("id", Q.oneOf(categoryIds)))
            .fetch()
        : [];

    return { stock, categories };
  }

  // Get stock with synonyms
  async getStockWithSynonyms(stockId: string): Promise<{
    stock: Stock;
    synonyms: any[];
  } | null> {
    const stock = await this.findById(stockId);
    if (!stock) return null;

    const synonyms = await this.collection.database
      .get("ingredient_synonym")
      .query(Q.where("stock_id", Q.eq(stockId)))
      .fetch();

    return { stock, synonyms };
  }

  /**
   * Optimized method to fetch all stocks with their synonyms in just 2 queries.
   * This is crucial to avoid N+1 performance issues when checking ingredients.
   */
  /**
   * Optimized method to fetch specific stocks by names or synonyms in just 2 queries.
   * This is crucial to avoid N+1 performance issues when checking ingredients,
   * without loading the entire stock table into memory.
   */
  async getStocksByNamesOrSynonyms(
    names: string[]
  ): Promise<{ id: string; name: string; quantity: number; unit: string; synonyms: string[] }[]> {
    if (!names || names.length === 0) return [];

    const lowerNames = names.map((n) => n.toLowerCase());

    // 1. Fetch matching synonyms to get their stock IDs
    const synonymCollection = this.collection.database.collections.get("ingredient_synonym");

    // We can't easily do a full wildcard search in WatermelonDB across an array of terms,
    // but we can at least get exact synonym matches, which is what the original N+1 query did.
    // The previous N+1 logic called: getStockBySynonym(synonym.toLowerCase()) -> query(Q.where("synonym", Q.eq(synonym.toLowerCase())))
    const matchingSynonyms = await synonymCollection
      .query(Q.where("synonym", Q.oneOf(lowerNames)))
      .fetch();

    const stockIdsFromSynonyms = matchingSynonyms.map((syn: any) => syn.stockId);

    // 2. Fetch stocks that either match the name exactly OR match a synonym
    let stockQuery = this.collection.query(
      Q.or(
        Q.where("name", Q.oneOf(names)),
        stockIdsFromSynonyms.length > 0
          ? Q.where("id", Q.oneOf(stockIdsFromSynonyms))
          : Q.where("id", "impossible_id")
      )
    );

    // Since isIngredientMatch does substring matching, it's safer to fetch all stocks
    // if we really want to preserve 100% of the isIngredientMatch functionality.
    // However, the original loop did:
    // const stockItems = await this.stocks.findByNameOrSynonym(ingredient.name);
    // which only did EXACT name or EXACT synonym matches in SQL.
    // So the query above perfectly matches the original SQL functionality but batched!

    const stocks = await stockQuery.fetch();

    if (stocks.length === 0) return [];

    const stockIds = stocks.map((s) => s.id);

    // 3. Fetch all synonyms for the matching stocks so we can return them
    const allSynonymsForStocks = await synonymCollection
      .query(Q.where("stock_id", Q.oneOf(stockIds)))
      .fetch();

    // 4. Create a map of stockId -> synonyms[]
    const synonymsMap = new Map<string, string[]>();
    for (const syn of allSynonymsForStocks) {
      const raw = (syn as any)._raw;
      const stockId = raw.stock_id;
      const val = raw.synonym;

      if (stockId && val) {
        if (!synonymsMap.has(stockId)) {
          synonymsMap.set(stockId, []);
        }
        synonymsMap.get(stockId)?.push(val);
      }
    }

    // 5. Map results
    return stocks.map((stock) => ({
      id: stock.id,
      name: stock.name,
      quantity: stock.quantity,
      unit: stock.unit,
      synonyms: synonymsMap.get(stock.id) || [],
    }));
  }

  async getAllWithSynonyms(): Promise<
    { id: string; name: string; quantity: number; synonyms: string[] }[]
  > {
    // 1. Fetch all stocks
    const stocks = await this.collection.query().fetch();

    // 2. Fetch all synonyms
    const synonymCollection = this.collection.database.collections.get("ingredient_synonym");
    const allSynonyms = await synonymCollection.query().fetch();

    // 3. Create a map of stockId -> synonyms[]
    const synonymsMap = new Map<string, string[]>();
    for (const syn of allSynonyms) {
      // Access raw data for speed/safety. Cast to any to access _raw.
      const raw = (syn as any)._raw;
      const stockId = raw.stock_id;
      const val = raw.synonym;

      if (stockId && val) {
        if (!synonymsMap.has(stockId)) {
          synonymsMap.set(stockId, []);
        }
        synonymsMap.get(stockId)?.push(val);
      }
    }

    // 4. Map results
    return stocks.map((stock) => ({
      id: stock.id,
      name: stock.name,
      quantity: stock.quantity,
      synonyms: synonymsMap.get(stock.id) || [],
    }));
  }
}
