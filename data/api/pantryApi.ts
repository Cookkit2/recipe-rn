import { databaseFacade } from "~/data/db/DatabaseFacade";
import { database } from "~/data/db/database";
import type { Stock } from "~/data/db/models";
import type IngredientCategory from "~/data/db/models/IngredientCategory";
import type IngredientSynonym from "~/data/db/models/IngredientSynonym";
import type StockCategory from "~/data/db/models/StockCategory";
import type { ItemType, PantryItem } from "~/types/PantryItem";
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
    try {
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

      const pantryItemsConverted = await Promise.all(
        stockItems.map(convertStockToPantryItem)
      );

      log.info("✅ Converted pantry items:", pantryItemsConverted.length);
      return pantryItemsConverted;
    } catch (error) {
      log.error("❌ Error fetching pantry items:", error);
      return [];
    }
  },

  /**
   * Add a new pantry item
   */
  async addPantryItem(
    item: Omit<PantryItem, "id" | "created_at" | "updated_at">
  ): Promise<PantryItem> {
    try {
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
        imageUrl:
          typeof item.image_url === "string" ? item.image_url : undefined,
        x: item.x,
        y: item.y,
        scale: item.scale,
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
    } catch (error) {
      log.error("❌ Error adding pantry item:", error);
      log.error("Error details:", error);
      throw error;
    }
  },

  /**
   * Add an array of new pantry items with base ingredient metadata
   * If an ingredient already exists, updates its image and quantity instead
   */
  async addPantryItemsWithMetadata(
    items: Omit<PantryItem, "id" | "created_at" | "updated_at">[]
  ): Promise<PantryItem[]> {
    const createdItems: PantryItem[] = [];

    // Process all items in a single transaction
    await database.write(async () => {
      const stockCollection = database.collections.get("stock");
      const categoryCollection = database.collections.get(
        "ingredient_category"
      );
      const synonymCollection = database.collections.get("ingredient_synonym");
      const stockCategoryCollection =
        database.collections.get("stock_category");

      for (const item of items) {
        try {
          // Check if an ingredient with the same name already exists
          const existingStockItems = await stockCollection.query().fetch();
          const existingStock = existingStockItems.find(
            (s) => (s as Stock).name.toLowerCase() === item.name.toLowerCase()
          ) as Stock | undefined;

          let stockItem: Stock;

          if (existingStock) {
            // Update existing stock item
            log.info(`🔄 Updating existing pantry item: ${item.name}`);

            await existingStock.update((stock) => {
              // Update quantity (add to existing quantity)
              (stock as Stock).quantity =
                existingStock.quantity + item.quantity;

              // Update image with new image if provided
              if (typeof item.image_url === "string") {
                (stock as Stock).imageUrl = item.image_url;
              }

              // Update other fields if provided
              if (item.unit) (stock as Stock).unit = item.unit;
              if (item.expiry_date)
                (stock as Stock).expiryDate = item.expiry_date;
              if (item.type) (stock as Stock).storageType = item.type;
              if (item.background_color)
                (stock as Stock).backgroundColor = item.background_color;
              if (item.x !== undefined) (stock as Stock).x = item.x;
              if (item.y !== undefined) (stock as Stock).y = item.y;
              if (item.scale !== undefined) (stock as Stock).scale = item.scale;
            });

            stockItem = existingStock;
          } else {
            // Create new stock item
            log.info(`✨ Creating new pantry item: ${item.name}`);

            stockItem = (await stockCollection.create((stock) => {
              (stock as Stock).name = item.name;
              (stock as Stock).quantity = item.quantity;
              (stock as Stock).unit = item.unit;
              if (item.expiry_date)
                (stock as Stock).expiryDate = item.expiry_date;
              if (item.type) (stock as Stock).storageType = item.type;
              if (item.background_color)
                (stock as Stock).backgroundColor = item.background_color;
              if (typeof item.image_url === "string")
                (stock as Stock).imageUrl = item.image_url;
              if (item.x !== undefined) (stock as Stock).x = item.x;
              if (item.y !== undefined) (stock as Stock).y = item.y;
              if (item.scale !== undefined) (stock as Stock).scale = item.scale;
            })) as Stock;
          }

          // Create categories if they exist (only for new items)
          if (!existingStock && item.categories && item.categories.length > 0) {
            for (const category of item.categories) {
              // First, ensure the category exists (upsert-like behavior)
              const existingCategories = await categoryCollection
                .query()
                .fetch();
              let categoryRecord = existingCategories.find(
                (c) => (c as IngredientCategory).name === category.name
              ) as IngredientCategory | undefined;

              if (!categoryRecord) {
                categoryRecord = (await categoryCollection.create((cat) => {
                  (cat as IngredientCategory).name = category.name;
                  (cat as IngredientCategory).syncedAt = Date.now();
                })) as IngredientCategory;
              }

              // Create the stock-category relationship
              await stockCategoryCollection.create((sc) => {
                (sc as StockCategory).stockId = stockItem.id;
                (sc as StockCategory).categoryId = categoryRecord!.id;
              });
            }
          }

          // Create synonyms if they exist (only for new items)
          if (!existingStock && item.synonyms && item.synonyms.length > 0) {
            for (const synonym of item.synonyms) {
              await synonymCollection.create((syn) => {
                (syn as IngredientSynonym).stockId = stockItem.id;
                (syn as IngredientSynonym).synonym =
                  synonym.synonym.toLowerCase();
              });
            }
          }

          const convertedItem = await convertStockToPantryItem(stockItem);
          createdItems.push(convertedItem);
        } catch (error) {
          log.error(`Failed to add/update pantry item ${item.name}:`, error);
          // Continue with other items instead of failing completely
        }
      }
    });

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
            if (item.expiry_date)
              (stock as Stock).expiryDate = item.expiry_date;
            if (item.type) (stock as Stock).storageType = item.type;
            if (item.background_color)
              (stock as Stock).backgroundColor = item.background_color;
            if (typeof item.image_url === "string")
              (stock as Stock).imageUrl = item.image_url;
            if (item.x !== undefined) (stock as Stock).x = item.x;
            if (item.y !== undefined) (stock as Stock).y = item.y;
            if (item.scale !== undefined) (stock as Stock).scale = item.scale;
          });

          const convertedItem = await convertStockToPantryItem(
            stockItem as Stock
          );
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
  async updatePantryItem(
    id: string,
    updates: Partial<PantryItem>
  ): Promise<PantryItem> {
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
      imageUrl:
        typeof updates.image_url === "string" ? updates.image_url : undefined,
      x: updates.x,
      y: updates.y,
      scale: updates.scale,
    });

    // Fetch the updated item
    const updatedStock = await databaseFacade.getStockById(id);
    if (!updatedStock) {
      throw new Error("Failed to fetch updated stock item");
    }

    return convertStockToPantryItem(updatedStock);
  },

  /**
   * Delete a pantry item
   */
  async deletePantryItem(id: string): Promise<void> {
    await databaseFacade.deleteStock(id);
  },

  /**
   * Get pantry items by type
   */
  async getPantryItemsByType(
    type: Exclude<ItemType, "all">
  ): Promise<PantryItem[]> {
    const allItems = await this.fetchAllPantryItems();
    return allItems.filter((item) => item.type === type);
  },

  /**
   * Search pantry items by name
   */
  async searchPantryItems(query: string): Promise<PantryItem[]> {
    const allItems = await this.fetchAllPantryItems();
    const lowerQuery = query.toLowerCase();
    return allItems.filter((item) =>
      item.name.toLowerCase().includes(lowerQuery)
    );
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
    const synonymRecords = await stock.synonyms.fetch();
    synonyms = synonymRecords.map((s) => ({ id: s.id, synonym: s.synonym }));
  } catch (error) {
    log.error("Error fetching synonyms:", error);
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
    x: stock.x || 0,
    y: stock.y || 0,
    scale: stock.scale || 1,
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
  if (lowerDbType.includes("cabinet") || lowerDbType.includes("pantry"))
    return "cabinet";
  if (lowerDbType.includes("freezer")) return "freezer";
  return "fridge"; // default
};
