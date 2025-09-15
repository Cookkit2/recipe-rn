import type { PantryItem } from "~/types/PantryItem";
import { dummyPantryItems } from "../dummy/dummy-data";
import { BaseRepository } from "./base-repository";
import { storageFacade } from "../storage";
import uuid from "react-native-uuid";

const PANTRY_KEY = "pantryItems";

/**
 * Modern pantry repository using the new storage facade and base repository
 */
class PantryRepository extends BaseRepository<PantryItem> {
  constructor() {
    super(PANTRY_KEY, storageFacade);
    this.initializeIfEmpty(dummyPantryItems);
  }

  /**
   * Get pantry item by ID
   */
  getById(id: string): PantryItem | null {
    return this.findFirst((item) => item.id === id);
  }

  /**
   * Update an existing pantry item by ID
   */
  update(item: PantryItem): boolean {
    return this.updateWhere(
      (existing) => existing.id === item.id,
      () => ({ ...item, updated_at: new Date() })
    );
  }

  /**
   * Delete a pantry item by ID
   */
  delete(id: string): boolean {
    return this.deleteWhere((item) => item.id === id) > 0;
  }

  /**
   * Get items by type (fridge or cabinet)
   */
  getByType(type: "fridge" | "cabinet"): PantryItem[] {
    return this.findWhere((item) => item.type === type);
  }

  /**
   * Get items by category
   */
  getByCategory(category: string): PantryItem[] {
    return this.findWhere((item) => item.category === category);
  }

  /**
   * Get items that are expiring soon
   */
  getExpiringSoon(days: number = 3): PantryItem[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return this.findWhere((item) => {
      if (!item.expiry_date) return false;
      return new Date(item.expiry_date) <= cutoffDate;
    });
  }

  /**
   * Get expired items
   */
  getExpired(): PantryItem[] {
    const now = new Date();
    return this.findWhere((item) => {
      if (!item.expiry_date) return false;
      return new Date(item.expiry_date) < now;
    });
  }

  /**
   * Search items by name
   */
  searchByName(query: string): PantryItem[] {
    const lowerQuery = query.toLowerCase();
    return this.findWhere((item) =>
      item.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get unique categories
   */
  getCategories(): string[] {
    const categories = this.getAll().map((item) => item.category);
    return Array.from(new Set(categories));
  }

  /**
   * Seed database with dummy data (replaces all existing data)
   */
  seedWithDummyData(): void {
    this.setAll(dummyPantryItems);
  }

  /**
   * Add a new item with automatic ID generation
   */
  addWithAutoId(
    itemData: Omit<PantryItem, "id" | "created_at" | "updated_at">
  ): PantryItem {
    const newId = uuid.v4() as string;

    const newItem: PantryItem = {
      ...itemData,
      id: newId,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.add(newItem);
    return newItem;
  }

  /**
   * Bulk update items
   */
  updateMany(items: PantryItem[]): number {
    let updatedCount = 0;
    items.forEach((item) => {
      if (this.update(item)) {
        updatedCount++;
      }
    });
    return updatedCount;
  }

  /**
   * Delete items by IDs
   */
  deleteMany(ids: string[]): number {
    return this.deleteWhere((item) => ids.includes(item.id));
  }
}

// Create and export the repository instance
export const pantryRepository = new PantryRepository();

// Export the class for testing or advanced usage
export { PantryRepository };
