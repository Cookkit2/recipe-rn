import { databaseFacade } from "~/data/db/DatabaseFacade";
import { database } from "~/data/db/database";
import type { Stock } from "~/data/db/models";
import type { ItemType, PantryItem } from "~/types/PantryItem";

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
      console.log("🔍 Fetching pantry items...");

      // Check database health first
      const isHealthy = await databaseFacade.isHealthy();
      console.log("Database healthy:", isHealthy);

      // Get raw count from database
      const stockCount = await databaseFacade.stock.count();
      console.log("Stock count in database:", stockCount);

      const stockItems = await databaseFacade.stock.findAll();

      if (stockItems.length === 0) {
        console.warn("⚠️ No stock items found in database");
        return [];
      }

      const pantryItemsConverted = await Promise.all(
        stockItems.map(convertStockToPantryItem)
      );

      console.log("✅ Converted pantry items:", pantryItemsConverted.length);
      return pantryItemsConverted;
    } catch (error) {
      console.error("❌ Error fetching pantry items:", error);
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
      console.log("🔍 Adding pantry item:", item);

      // First create or find base ingredient
      let baseIngredient = await databaseFacade.ingredients.findByName(
        item.name
      );
      if (!baseIngredient) {
        console.log("📦 Creating new base ingredient:", item.name);
        baseIngredient = await databaseFacade.ingredients.create({
          name: item.name,
          synonyms: [],
        });
        console.log(
          "✅ Base ingredient created:",
          baseIngredient.id,
          baseIngredient.name
        );
      } else {
        console.log(
          "✅ Found existing base ingredient:",
          baseIngredient.id,
          baseIngredient.name
        );
      }

      // Prepare stock data
      const stockData = {
        baseIngredientId: baseIngredient.id,
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

      console.log("📦 Creating stock item with data:", stockData);

      // Create stock item
      const stockItem = await databaseFacade.stock.create(stockData);

      console.log("✅ Stock item created:", stockItem.id, stockItem.name);
      console.log("📊 Stock item details:", {
        id: stockItem.id,
        baseIngredientId: stockItem.baseIngredientId,
        name: stockItem.name,
        quantity: stockItem.quantity,
        backgroundColor: stockItem.backgroundColor,
      });

      const convertedItem = await convertStockToPantryItem(stockItem);
      console.log("✅ Converted pantry item:", convertedItem);

      return convertedItem;
    } catch (error) {
      console.error("❌ Error adding pantry item:", error);
      console.error("Error details:", error);
      throw error;
    }
  },

  /**
   * Add an array of new pantry items
   */
  async addPantryItems(
    items: Omit<PantryItem, "id" | "created_at" | "updated_at">[]
  ): Promise<PantryItem[]> {
    const ingredientIdCache = new Map<string, string>();
    const createdItems: PantryItem[] = [];

    // Process all items in a single transaction to avoid nested transactions
    await database.write(async () => {
      for (const item of items) {
        try {
          // Find or create base ingredient (with simple in-memory cache per batch)
          let baseIngredientId = ingredientIdCache.get(item.name);
          if (!baseIngredientId) {
            let baseIngredient = await databaseFacade.ingredients.findByName(
              item.name
            );
            if (!baseIngredient) {
              // Use raw create method to avoid nested transaction
              baseIngredient = await databaseFacade.ingredients.createRaw({
                name: item.name,
                synonyms: [],
              });
            }
            baseIngredientId = baseIngredient.id;
            ingredientIdCache.set(item.name, baseIngredientId);
          }

          // Create stock item using raw method to avoid nested transaction
          const stockItem = await databaseFacade.stock.createRaw({
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
          });

          const convertedItem = await convertStockToPantryItem(stockItem);
          createdItems.push(convertedItem);
        } catch (error) {
          console.error(`Failed to add pantry item ${item.name}:`, error);
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
    const stock = await databaseFacade.stock.findById(id);

    if (!stock) {
      throw new Error("Stock item not found");
    }

    await stock.updateStock({
      name: updates.name,
      quantity: updates.quantity,
      unit: updates.unit,
      expiryDate: updates.expiry_date,
      type: updates.type,
      backgroundColor: updates.background_color,
      imageUrl:
        typeof updates.image_url === "string" ? updates.image_url : undefined,
      x: updates.x,
      y: updates.y,
      scale: updates.scale,
    });

    // Fetch the updated item
    const updatedStock = await databaseFacade.stock.findById(id);
    if (!updatedStock) {
      throw new Error("Failed to fetch updated stock item");
    }

    return convertStockToPantryItem(updatedStock);
  },

  /**
   * Delete a pantry item
   */
  async deletePantryItem(id: string): Promise<void> {
    await databaseFacade.stock.delete(id);
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
  return {
    id: stock.id,
    name: stock.name,
    quantity: stock.quantity,
    unit: stock.unit,
    expiry_date: stock.expiryDate || undefined,
    category: "", // TODO: Load from BaseIngredient category if available
    type: mapDbTypeToType(stock.type),
    image_url: stock.imageUrl,
    background_color: stock.backgroundColor,
    x: stock.x || 0,
    y: stock.y || 0,
    scale: stock.scale || 1,
    created_at: stock.createdAt,
    updated_at: stock.updatedAt,
    steps_to_store: [], // TODO: Load from StepsToStore model
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
