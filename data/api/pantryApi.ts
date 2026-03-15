import { databaseFacade } from "~/data/db/DatabaseFacade";
import { database } from "~/data/db/database";
import type { Stock } from "~/data/db/models";
import type IngredientCategory from "~/data/db/models/IngredientCategory";
import type IngredientSynonym from "~/data/db/models/IngredientSynonym";
import type StockCategory from "~/data/db/models/StockCategory";
import type { ItemType, PantryItem } from "~/types/PantryItem";
import {
  withErrorHandling,
  withErrorLogging,
  logAndWrapResult,
  wrapResult,
} from "~/utils/api-error-handler";
import type { AppResult } from "~/utils/result";
import type { AppError } from "~/types/AppError";
import { log } from "~/utils/logger";

/**
 * Pure API functions for pantry operations
 * These functions only handle database interactions and data transformation
 */
export const pantryApi = {
  /**
   * Fetch all pantry items from database
   */
  async fetchAllPantryItems(): Promise<PantryItem[]> {
    return withErrorHandling(
      async () => {
        log.info("🔍 Fetching pantry items...");

        // Check database health first
        const isHealthy = await databaseFacade.isHealthy();
        log.info("Database healthy:", isHealthy);

        // Get raw count from database
        const stockCount = await databaseFacade.getStockCount();
        log.info("Stock count in database:", stockCount);

        const stockItems = await databaseFacade.getAllStock();

        if (stockItems.length === 0) {
          log.warn("⚠️ No stock items found in database");
          return [];
        }

        // Convert items in smaller batches to prevent JSI overload
        const batchSize = 10;
        const pantryItemsConverted: PantryItem[] = [];

        for (let i = 0; i < stockItems.length; i += batchSize) {
          const batch = stockItems.slice(i, i + batchSize);
          const converted = await Promise.all(
            batch.map((item) =>
              convertStockToPantryItem(item).catch((err) => {
                log.error("Error converting stock item:", item.id, err);
                return null;
              })
            )
          );
          pantryItemsConverted.push(
            ...converted.filter((item): item is PantryItem => item !== null)
          );
        }

        log.info("✅ Converted pantry items:", pantryItemsConverted.length);
        return pantryItemsConverted;
      },
      "Error fetching pantry items",
      []
    );
  },

  /**
   * Result-based variant of fetchAllPantryItems.
   */
  async fetchAllPantryItemsResult(): Promise<AppResult<PantryItem[], AppError>> {
    return logAndWrapResult(async () => {
      log.info("🔍 Fetching pantry items...");

      const isHealthy = await databaseFacade.isHealthy();
      log.info("Database healthy:", isHealthy);

      const stockCount = await databaseFacade.getStockCount();
      log.info("Stock count in database:", stockCount);

      const stockItems = await databaseFacade.getAllStock();

      if (stockItems.length === 0) {
        log.warn("⚠️ No stock items found in database");
        return [];
      }

      const batchSize = 10;
      const pantryItemsConverted: PantryItem[] = [];

      for (let i = 0; i < stockItems.length; i += batchSize) {
        const batch = stockItems.slice(i, i + batchSize);
        const converted = await Promise.all(
          batch.map((item) =>
            convertStockToPantryItem(item).catch((err) => {
              log.error("Error converting stock item:", item.id, err);
              return null;
            })
          )
        );
        pantryItemsConverted.push(...converted.filter((item): item is PantryItem => item !== null));
      }

      log.info("✅ Converted pantry items:", pantryItemsConverted.length);
      return pantryItemsConverted;
    }, "Error fetching pantry items");
  },

  /**
   * Add a new pantry item
   */
  async addPantryItem(
    item: Omit<PantryItem, "id" | "created_at" | "updated_at">
  ): Promise<PantryItem> {
    return withErrorLogging(async () => {
      log.info("🔍 Adding pantry item:", item);

      // Generate a temporary base ingredient ID
      // TODO: In the future, fetch from cloud API to get the actual base_ingredient_id
      const baseIngredientId = `temp_${item.name.toLowerCase().replace(/\s+/g, "_")}`;

      // Prepare stock data
      const stockData = {
        baseIngredientId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiry_date,
        type: item.type,
        backgroundColor: item.background_color,
        category: item.category,
        imageUrl: typeof item.image_url === "string" ? item.image_url : undefined,
      };

      log.info("📦 Creating stock item with data:", stockData);

      // Create stock item
      const stockItem = await databaseFacade.createStock(stockData);

      log.info("✅ Stock item created:", stockItem.id, stockItem.name);
      log.info("📊 Stock item details:", {
        id: stockItem.id,
        name: stockItem.name,
        quantity: stockItem.quantity,
        backgroundColor: stockItem.backgroundColor,
      });

      const convertedItem = await convertStockToPantryItem(stockItem);
      log.info("✅ Converted pantry item:", convertedItem);

      return convertedItem;
    }, "Error adding pantry item");
  },

  /**
   * Result-based variant of addPantryItem.
   */
  async addPantryItemResult(
    item: Omit<PantryItem, "id" | "created_at" | "updated_at">
  ): Promise<AppResult<PantryItem, AppError>> {
    return logAndWrapResult(async () => {
      log.info("🔍 Adding pantry item:", item);

      const baseIngredientId = `temp_${item.name.toLowerCase().replace(/\s+/g, "_")}`;

      const stockData = {
        baseIngredientId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiry_date,
        type: item.type,
        backgroundColor: item.background_color,
        category: item.category,
        imageUrl: typeof item.image_url === "string" ? item.image_url : undefined,
      };

      log.info("📦 Creating stock item with data:", stockData);

      const stockItem = await databaseFacade.createStock(stockData);

      log.info("✅ Stock item created:", stockItem.id, stockItem.name);
      log.info("📊 Stock item details:", {
        id: stockItem.id,
        name: stockItem.name,
        quantity: stockItem.quantity,
        backgroundColor: stockItem.backgroundColor,
      });

      const convertedItem = await convertStockToPantryItem(stockItem);
      log.info("✅ Converted pantry item:", convertedItem);

      return convertedItem;
    }, "Error adding pantry item");
  },

  /**
   * Add an array of new pantry items with base ingredient metadata
   * If an ingredient already exists, updates its image and quantity instead
   */
  async addPantryItemsWithMetadata(
    items: Omit<PantryItem, "id" | "created_at" | "updated_at">[]
  ): Promise<PantryItem[]> {
    const existingStocks = await databaseFacade.getAllStock();
    const stockMapByLowerName = new Map(existingStocks.map((s) => [s.name.toLowerCase(), s]));

    const categoryCollection = database.collections.get("ingredient_category");
    const existingCategories = await categoryCollection.query().fetch();
    const categoryMapByName = new Map(
      (existingCategories as IngredientCategory[]).map((c) => [c.name, c])
    );

    // Pre-aggregate input items to prevent calling prepareUpdate/prepareCreate multiple times
    // for the same ingredient in the same batch, which causes WatermelonDB to throw an Invariant Violation.
    const aggregatedItems = new Map<string, Omit<PantryItem, "id" | "created_at" | "updated_at">>();
    for (const item of items) {
      const lowerName = item.name.toLowerCase();
      const existing = aggregatedItems.get(lowerName);
      if (existing) {
        existing.quantity += item.quantity;
        if (item.image_url) existing.image_url = item.image_url;
        if (item.unit) existing.unit = item.unit;
        if (item.expiry_date) existing.expiry_date = item.expiry_date;
        if (item.type) existing.type = item.type;
        if (item.background_color) existing.background_color = item.background_color;

        // Merge categories
        if (item.categories) {
           existing.categories = [...(existing.categories || []), ...item.categories];
           // Deduplicate by name
           const seen = new Set<string>();
           existing.categories = existing.categories.filter(c => {
               if (seen.has(c.name)) return false;
               seen.add(c.name);
               return true;
           });
        }

        // Merge synonyms
        if (item.synonyms) {
            existing.synonyms = [...(existing.synonyms || []), ...item.synonyms];
            // Deduplicate by synonym string
            const seen = new Set<string>();
            existing.synonyms = existing.synonyms.filter(s => {
                const lowerSyn = s.synonym.toLowerCase();
                if (seen.has(lowerSyn)) return false;
                seen.add(lowerSyn);
                return true;
            });
        }
      } else {
        aggregatedItems.set(lowerName, { ...item }); // clone to avoid mutating input directly if nested
      }
    }

    const uniqueItems = Array.from(aggregatedItems.values());

    const createdOrUpdatedStockRefs: Stock[] = [];
    const batchOps: any[] = [];

    await database.write(async () => {
      const stockCollection = database.collections.get("stock");
      const synonymCollection = database.collections.get("ingredient_synonym");
      const stockCategoryCollection = database.collections.get("stock_category");

      for (const item of uniqueItems) {
        try {
          const existingStock = stockMapByLowerName.get(item.name.toLowerCase());

          let stockItem: Stock;

          if (existingStock) {
            const op = existingStock.prepareUpdate((stock) => {
              (stock as Stock).quantity = existingStock.quantity + item.quantity;
              if (typeof item.image_url === "string") {
                (stock as Stock).imageUrl = item.image_url;
              }
              if (item.unit) (stock as Stock).unit = item.unit;
              if (item.expiry_date) (stock as Stock).expiryDate = item.expiry_date;
              if (item.type) (stock as Stock).storageType = item.type;
              if (item.background_color) (stock as Stock).backgroundColor = item.background_color;
            });
            batchOps.push(op);
            stockItem = existingStock;
          } else {
            stockItem = stockCollection.prepareCreate((stock) => {
              (stock as Stock).name = item.name;
              (stock as Stock).quantity = item.quantity;
              (stock as Stock).unit = item.unit;
              if (item.expiry_date) (stock as Stock).expiryDate = item.expiry_date;
              if (item.type) (stock as Stock).storageType = item.type;
              if (item.background_color) (stock as Stock).backgroundColor = item.background_color;
              if (typeof item.image_url === "string") (stock as Stock).imageUrl = item.image_url;
            }) as Stock;
            batchOps.push(stockItem);
            stockMapByLowerName.set(item.name.toLowerCase(), stockItem);
          }

          if (!existingStock && item.categories && item.categories.length > 0) {
            for (const category of item.categories) {
              let categoryRecord = categoryMapByName.get(category.name);
              if (!categoryRecord) {
                categoryRecord = categoryCollection.prepareCreate((cat) => {
                  (cat as IngredientCategory).name = category.name;
                  (cat as IngredientCategory).syncedAt = Date.now();
                }) as IngredientCategory;
                batchOps.push(categoryRecord);
                categoryMapByName.set(category.name, categoryRecord);
              }
              const scOp = stockCategoryCollection.prepareCreate((sc) => {
                (sc as StockCategory).stockId = stockItem.id;
                (sc as StockCategory).categoryId = categoryRecord!.id;
              });
              batchOps.push(scOp);
            }
          }

          if (!existingStock && item.synonyms && item.synonyms.length > 0) {
            for (const synonym of item.synonyms) {
              const synOp = synonymCollection.prepareCreate((syn) => {
                (syn as IngredientSynonym).stockId = stockItem.id;
                (syn as IngredientSynonym).synonym = synonym.synonym.toLowerCase();
              });
              batchOps.push(synOp);
            }
          }

          createdOrUpdatedStockRefs.push(stockItem);
        } catch (error) {
          log.error(`Failed to add/update pantry item ${item.name}:`, error);
        }
      }

      if (batchOps.length > 0) {
        await database.batch(...batchOps);
      }
    });

    const batchSize = 10;
    const createdItems: PantryItem[] = [];
    for (let i = 0; i < createdOrUpdatedStockRefs.length; i += batchSize) {
      const batch = createdOrUpdatedStockRefs.slice(i, i + batchSize);
      const converted = await Promise.all(
        batch.map((s) =>
          convertStockToPantryItem(s).catch((err) => {
            log.error("Error converting stock item:", s.id, err);
            return null;
          })
        )
      );
      createdItems.push(...converted.filter((c): c is PantryItem => c !== null));
    }
    log.info("addPantryItemsWithMetadata: created/updated", createdItems.length, "items");
    return createdItems;
  },

  /**
   * Add an array of new pantry items
   */
  async addPantryItems(
    items: Omit<PantryItem, "id" | "created_at" | "updated_at">[]
  ): Promise<PantryItem[]> {
    const createdItems: PantryItem[] = [];
    const stockCollection = database.collections.get("stock");
    const stockRecordsToCreate: any[] = [];

    // Prepare all stock items directly in memory
    for (const item of items) {
      try {
        const preparedStock = stockCollection.prepareCreate((stock) => {
          (stock as Stock).name = item.name;
          (stock as Stock).quantity = item.quantity;
          (stock as Stock).unit = item.unit;
          if (item.expiry_date) (stock as Stock).expiryDate = item.expiry_date;
          if (item.type) (stock as Stock).storageType = item.type;
          if (item.background_color) (stock as Stock).backgroundColor = item.background_color;
          if (typeof item.image_url === "string") (stock as Stock).imageUrl = item.image_url;
        });
        stockRecordsToCreate.push(preparedStock);
      } catch (error) {
        log.error(`Failed to prepare pantry item ${item.name}:`, error);
        // Continue with other items instead of failing completely
      }
    }

    // Process all items in a single transaction
    if (stockRecordsToCreate.length > 0) {
      try {
        await database.write(async () => {
          await database.batch(...stockRecordsToCreate);
        });

        // After batch insert is successful, convert to PantryItem
        for (const stockItem of stockRecordsToCreate) {
          try {
            const convertedItem = await convertStockToPantryItem(stockItem as Stock);
            createdItems.push(convertedItem);
          } catch (conversionError) {
            log.error("Failed to convert created stock item to pantry item:", conversionError);
          }
        }
      } catch (batchError) {
        log.error("Failed to execute batch insert for pantry items:", batchError);
      }
    }

    return createdItems;
  },

  /**
   * Update an existing pantry item
   */
  async updatePantryItem(id: string, updates: Partial<PantryItem>): Promise<PantryItem> {
    return withErrorLogging(async () => {
      const stock = await databaseFacade.getStockById(id);

      if (!stock) {
        throw new Error("Stock item not found");
      }

      await stock.updateStock({
        name: updates.name,
        quantity: updates.quantity,
        unit: updates.unit,
        expiryDate: updates.expiry_date,
        storageType: updates.type,
        backgroundColor: updates.background_color,
        imageUrl: typeof updates.image_url === "string" ? updates.image_url : undefined,
      });

      // Fetch the updated item
      const updatedStock = await databaseFacade.getStockById(id);
      if (!updatedStock) {
        throw new Error("Failed to fetch updated stock item");
      }

      return convertStockToPantryItem(updatedStock);
    }, "Error updating pantry item");
  },

  /**
   * Result-based variant of updatePantryItem.
   */
  async updatePantryItemResult(
    id: string,
    updates: Partial<PantryItem>
  ): Promise<AppResult<PantryItem, AppError>> {
    return logAndWrapResult(async () => {
      const stock = await databaseFacade.getStockById(id);

      if (!stock) {
        throw new Error("Stock item not found");
      }

      await stock.updateStock({
        name: updates.name,
        quantity: updates.quantity,
        unit: updates.unit,
        expiryDate: updates.expiry_date,
        storageType: updates.type,
        backgroundColor: updates.background_color,
        imageUrl: typeof updates.image_url === "string" ? updates.image_url : undefined,
      });

      const updatedStock = await databaseFacade.getStockById(id);
      if (!updatedStock) {
        throw new Error("Failed to fetch updated stock item");
      }

      return convertStockToPantryItem(updatedStock);
    }, "Error updating pantry item");
  },

  /**
   * Delete a pantry item
   */
  async deletePantryItem(id: string): Promise<void> {
    await databaseFacade.deleteStock(id);
  },

  /**
   * Result-based variant of deletePantryItem.
   */
  async deletePantryItemResult(id: string): Promise<AppResult<void, AppError>> {
    return wrapResult(async () => {
      await databaseFacade.deleteStock(id);
    });
  },

  /**
   * Get pantry items by type
   */
  async getPantryItemsByType(type: Exclude<ItemType, "all">): Promise<PantryItem[]> {
    const allItems = await this.fetchAllPantryItems();
    return allItems.filter((item) => item.type === type);
  },

  /**
   * Search pantry items by name
   */
  async searchPantryItems(query: string): Promise<PantryItem[]> {
    const allItems = await this.fetchAllPantryItems();
    const lowerQuery = query.toLowerCase();
    return allItems.filter((item) => item.name.toLowerCase().includes(lowerQuery));
  },

  /**
   * Get expiring items
   */
  async getExpiringItems(days: number = 3): Promise<PantryItem[]> {
    const allItems = await this.fetchAllPantryItems();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return allItems.filter((item) => {
      if (!item.expiry_date) return false;
      return new Date(item.expiry_date) <= cutoffDate;
    });
  },
};

// Helper function to convert Stock + BaseIngredient to PantryItem
const convertStockToPantryItem = async (stock: Stock): Promise<PantryItem> => {
  // Fetch synonyms if available
  let synonyms: Array<{ id: string; synonym: string }> = [];
  try {
    // Add timeout to prevent hanging
    const synonymRecords = await Promise.race([

      stock.synonyms.fetch(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Synonym fetch timeout")), 3000)
      ),
    ]);
    synonyms = synonymRecords.map((s) => ({ id: s.id, synonym: s.synonym }));
  } catch (error) {
    // Silent fail for synonyms - they're not critical
    log.warn("Could not fetch synonyms for stock:", stock.id);
  }

  // Fetch categories if available
  let categories: Array<{ id: string; name: string }> = [];
  try {
    const stockCategoryRecords = await Promise.race([
      stock.stockCategories.query().fetch(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("StockCategory fetch timeout")), 3000)
      ),
    ]);

    // Fetch the actual category names
    if (stockCategoryRecords.length > 0) {
      const categoryPromises = stockCategoryRecords.map((sc) =>
        // @ts-ignore - WatermelonDB relation typings might be missing fetch() but it exists at runtime
        typeof sc.category?.fetch === "function" ? sc.category.fetch() : Promise.resolve(null)
      );
      const categoryRecords = await Promise.all(categoryPromises);
      categories = categoryRecords.filter(Boolean).map((c: any) => ({ id: c.id, name: c.name }));
    }
  } catch (error) {
    log.warn("Could not fetch categories for stock:", stock.id);
  }

  return {
    id: stock.id,
    name: stock.name,
    quantity: stock.quantity,
    unit: stock.unit,
    expiry_date: stock.expiryDate || undefined,
    category: categories && categories.length > 0 ? categories[0]?.name || "" : "",
    categories,
    type: mapDbTypeToType(stock.storageType),
    image_url: stock.imageUrl,
    background_color: stock.backgroundColor,
    created_at: stock.createdAt,
    updated_at: stock.updatedAt,
    steps_to_store: [], // TODO: Load from StepsToStore model
    synonyms,
  };
};
// Map database dbType to ItemType
const mapDbTypeToType = (type?: string): Exclude<ItemType, "all"> => {
  if (!type) return "fridge";
  const lowerDbType = type.toLowerCase();
  if (lowerDbType.includes("cabinet") || lowerDbType.includes("pantry")) return "cabinet";
  if (lowerDbType.includes("freezer")) return "freezer";
  return "fridge"; // default
};
