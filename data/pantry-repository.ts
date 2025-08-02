import { storage } from "./db";
import type { PantryItem } from "~/types/PantryItem";
import { dummyPantryItems } from "./dummy-data";

const PANTRY_KEY = "pantryItems";

// Initialize with dummy data if no data exists
if (!storage.contains(PANTRY_KEY)) {
  storage.set(PANTRY_KEY, JSON.stringify(dummyPantryItems));
}

// Database operations for pantry items
export const pantryRepository = {
  // Get all pantry items
  getAll: (): PantryItem[] => {
    const items = storage.getString(PANTRY_KEY);
    return items ? JSON.parse(items) : [];
  },

  // Add a new pantry item
  add: (item: PantryItem): void => {
    const items = pantryRepository.getAll();
    items.push(item);
    storage.set(PANTRY_KEY, JSON.stringify(items));
  },

  // Update an existing pantry item
  update: (item: PantryItem): void => {
    let items = pantryRepository.getAll();
    items = items.map((i) => (i.id === item.id ? item : i));
    storage.set(PANTRY_KEY, JSON.stringify(items));
  },

  // Delete a pantry item by ID
  delete: (id: number): void => {
    let items = pantryRepository.getAll();
    items = items.filter((i) => i.id !== id);
    storage.set(PANTRY_KEY, JSON.stringify(items));
  },

  // Seed database with dummy data
  seedWithDummyData: (): void => {
    storage.set(PANTRY_KEY, JSON.stringify(dummyPantryItems));
  },

  // Get items by type
  getByType: (type: "fridge" | "cabinet"): PantryItem[] => {
    const items = pantryRepository.getAll();
    return items.filter((i) => i.type === type);
  },

  // Clear all items
  clear: (): void => {
    storage.delete(PANTRY_KEY);
  },
};