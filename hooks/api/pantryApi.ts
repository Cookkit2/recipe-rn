import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { Stock } from "~/data/db/models";
import type { ItemType, PantryItem } from "~/types/PantryItem";

// Helper function to convert Stock + BaseIngredient to PantryItem
const convertStockToPantryItem = async (stock: Stock): Promise<PantryItem> => {
  // Get base ingredient for future use if needed
  await stock.baseIngredient;

  // Map database category to ItemType
  const mapCategoryToType = (category?: string): Exclude<ItemType, "all"> => {
    if (!category) return "fridge";
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("cabinet") || lowerCategory.includes("pantry"))
      return "cabinet";
    if (lowerCategory.includes("freezer")) return "freezer";
    return "fridge"; // default
  };

  return {
    id: stock.id,
    name: stock.name,
    quantity: stock.quantity,
    unit: stock.unit,
    expiry_date: stock.expiryDate || undefined,
    category: stock.category || "Other",
    type: mapCategoryToType(stock.category),
    image_url: stock.imageUrl,
    x: stock.x || 0,
    y: stock.y || 0,
    scale: stock.scale || 1,
    created_at: stock.createdAt,
    updated_at: stock.updatedAt,
    steps_to_store: [], // TODO: Load from StepsToStore model
  };
};

/**
 * Pure API functions for pantry operations
 * These functions only handle database interactions and data transformation
 */
export const pantryApi = {
  /**
   * Fetch all pantry items from database
   */
  async fetchAllPantryItems(): Promise<PantryItem[]> {
    if (!databaseFacade) {
      throw new Error("DatabaseFacade is undefined - import failed");
    }

    if (!databaseFacade.stock) {
      throw new Error(
        `databaseFacade.stock is undefined. DatabaseFacade: ${!!databaseFacade}`
      );
    }

    // Run health check
    const isHealthy = await databaseFacade.isHealthy();
    if (!isHealthy) {
      throw new Error("Database health check failed");
    }

    const stockItems = await databaseFacade.stock.findAll();

    const pantryItemsConverted = await Promise.all(
      stockItems.map(convertStockToPantryItem)
    );

    return pantryItemsConverted;
  },

  /**
   * Add a new pantry item
   */
  async addPantryItem(
    item: Omit<PantryItem, "id" | "created_at" | "updated_at">
  ): Promise<PantryItem> {
    // First create or find base ingredient
    let baseIngredient = await databaseFacade.ingredients.findByName(item.name);
    if (!baseIngredient) {
      baseIngredient = await databaseFacade.ingredients.create({
        name: item.name,
        synonyms: [],
      });
    }

    // Create stock item
    const stockItem = await databaseFacade.stock.create({
      baseIngredientId: baseIngredient.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiry_date,
      category: item.category,
      imageUrl: typeof item.image_url === "string" ? item.image_url : undefined,
      x: item.x,
      y: item.y,
      scale: item.scale,
    });

    return convertStockToPantryItem(stockItem);
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
      category: updates.category,
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
