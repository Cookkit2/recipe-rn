import { db } from "./db";
import type { PantryItem } from "~/types/PantryItem";
import { dummyPantryItems } from "./dummy-data";

// Database operations for pantry items
export const pantryRepository = {
  // Get all pantry items
  getAll: async (): Promise<PantryItem[]> => {
    return await db.pantryItems.toArray();
  },

  // Add a new pantry item
  add: async (item: PantryItem): Promise<void> => {
    await db.pantryItems.add(item);
  },

  // Update an existing pantry item
  update: async (item: PantryItem): Promise<void> => {
    console.log("updatePantryItem", item);
    await db.pantryItems.put(item);
  },

  // Delete a pantry item by ID
  delete: async (id: number): Promise<void> => {
    await db.pantryItems.delete(id);
  },

  // Seed database with dummy data
  seedWithDummyData: async (): Promise<void> => {
    const existingItems = await db.pantryItems.toArray();
    if (existingItems.length === 0) {
      await db.pantryItems.bulkAdd(dummyPantryItems);
    }
  },

  // Get items by type
  getByType: async (type: "fridge" | "cabinet"): Promise<PantryItem[]> => {
    return await db.pantryItems.where("type").equals(type).toArray();
  },

  // Clear all items
  clear: async (): Promise<void> => {
    await db.pantryItems.clear();
  },
};

// Legacy hook for backward compatibility - will be removed in future
export default function usePantryItems() {
  console.warn("usePantryItems is deprecated. Use usePantryStore instead.");
  // This can be removed once all components are updated to use the store
  return {
    pantryItems: [],
    fridgeItems: [],
    cabinetItems: [],
    loaded: false,
    addPantryItem: async () => {},
    updatePantryItem: async () => {},
    deletePantryItem: async () => {},
  };
}
