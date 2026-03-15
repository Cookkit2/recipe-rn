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

    const createdOrUpdatedStockRefs: Stock[] = [];

    await database.write(async () => {
      const stockCollection = database.collections.get("stock");
      const synonymCollection = database.collections.get("ingredient_synonym");
      const stockCategoryCollection = database.collections.get("stock_category");

      for (const item of items) {
        try {
          const existingStock = stockMapByLowerName.get(item.name.toLowerCase());

          let stockItem: Stock;

          if (existingStock) {
            await existingStock.update((stock) => {
              (stock as Stock).quantity = existingStock.quantity + item.quantity;
              if (typeof item.image_url === "string") {
                (stock as Stock).imageUrl = item.image_url;
              }
              if (item.unit) (stock as Stock).unit = item.unit;
              if (item.expiry_date) (stock as Stock).expiryDate = item.expiry_date;
              if (item.type) (stock as Stock).storageType = item.type;
              if (item.background_color) (stock as Stock).backgroundColor = item.background_color;
            });
            stockItem = existingStock;
          } else {
            stockItem = (await stockCollection.create((stock) => {
              (stock as Stock).name = item.name;
              (stock as Stock).quantity = item.quantity;
              (stock as Stock).unit = item.unit;
              if (item.expiry_date) (stock as Stock).expiryDate = item.expiry_date;
              if (item.type) (stock as Stock).storageType = item.type;
              if (item.background_color) (stock as Stock).backgroundColor = item.background_color;
              if (typeof item.image_url === "string") (stock as Stock).imageUrl = item.image_url;
            })) as Stock;
            stockMapByLowerName.set(item.name.toLowerCase(), stockItem);
          }

          if (!existingStock && item.categories && item.categories.length > 0) {
            for (const category of item.categories) {
              let categoryRecord = categoryMapByName.get(category.name);
              if (!categoryRecord) {
                categoryRecord = (await categoryCollection.create((cat) => {
                  (cat as IngredientCategory).name = category.name;
                  (cat as IngredientCategory).syncedAt = Date.now();
                })) as IngredientCategory;
                categoryMapByName.set(category.name, categoryRecord);
              }
              await stockCategoryCollection.create((sc) => {
                (sc as StockCategory).stockId = stockItem.id;
                (sc as StockCategory).categoryId = categoryRecord!.id;
              });
            }
          }

          if (!existingStock && item.synonyms && item.synonyms.length > 0) {
            for (const synonym of item.synonyms) {
              await synonymCollection.create((syn) => {
                (syn as IngredientSynonym).stockId = stockItem.id;
                (syn as IngredientSynonym).synonym = synonym.synonym.toLowerCase();
              });
            }
          }

          createdOrUpdatedStockRefs.push(stockItem);
        } catch (error) {
          log.error(`Failed to add/update pantry item ${item.name}:`, error);
        }
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

    // Process all items in a single transaction
    await database.write(async () => {
      const stockCollection = database.collections.get("stock");

      for (const item of items) {
        try {
          // Create stock item directly in collection (within transaction)
          const stockItem = await stockCollection.create((stock) => {
            (stock as Stock).name = item.name;
            (stock as Stock).quantity = item.quantity;
            (stock as Stock).unit = item.unit;
            if (item.expiry_date) (stock as Stock).expiryDate = item.expiry_date;
            if (item.type) (stock as Stock).storageType = item.type;
            if (item.background_color) (stock as Stock).backgroundColor = item.background_color;
            if (typeof item.image_url === "string") (stock as Stock).imageUrl = item.image_url;
          });

          const convertedItem = await convertStockToPantryItem(stockItem as Stock);
          createdItems.push(convertedItem);
        } catch (error) {
          log.error(`Failed to add pantry item ${item.name}:`, error);
          // Continue with other items instead of failing completely
        }
      }
    });

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
      // TODO: Check correct query syntax
      stock.synonyms.query().fetch(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Synonym fetch timeout")), 3000)
      ),
    ]);
    synonyms = synonymRecords.map((s) => ({ id: s.id, synonym: s.synonym }));
  } catch (error) {
    // Silent fail for synonyms - they're not critical
    log.warn("Could not fetch synonyms for stock:", stock.id);
  }

  return {
    id: stock.id,
    name: stock.name,
    quantity: stock.quantity,
    unit: stock.unit,
    expiry_date: stock.expiryDate || undefined,
    category: "", // TODO: Load from BaseIngredient category if available
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
