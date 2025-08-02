import type { PantryItem } from "~/types/PantryItem";
import { create } from "zustand";
import { pantryRepository } from "~/data/pantry-repository";

interface PantryStore {
  pantryItems: PantryItem[];
  fridgeItems: PantryItem[];
  cabinetItems: PantryItem[];
  loaded: boolean;

  // Actions
  addPantryItem: (pantryItem: PantryItem) => void;
  updatePantryItem: (pantryItem: PantryItem) => void;
  deletePantryItem: (id: number) => void;

  // Utility methods
  syncFromDatabase: () => void;
  seedWithDummyData: () => void;
  clearAllItems: () => void;
}

export const usePantryStore = create<PantryStore>((set, get) => ({
  pantryItems: [],
  fridgeItems: [],
  cabinetItems: [],
  loaded: false,

  addPantryItem: (pantryItem: PantryItem) => {
    pantryRepository.add(pantryItem);
    get().syncFromDatabase();
  },

  updatePantryItem: (pantryItem: PantryItem) => {
    pantryRepository.update(pantryItem);
    get().syncFromDatabase();
  },

  deletePantryItem: (id: number) => {
    pantryRepository.delete(id);
    get().syncFromDatabase();
  },

  syncFromDatabase: () => {
    try {
      const pantryItems = pantryRepository.getAll();
      const fridgeItems = pantryItems.filter((item) => item.type === "fridge");
      const cabinetItems = pantryItems.filter((item) => item.type === "cabinet");

      set({
        pantryItems,
        fridgeItems,
        cabinetItems,
        loaded: true,
      });
    } catch (error) {
      console.error("Failed to sync pantry items from database:", error);
    }
  },

  seedWithDummyData: () => {
    pantryRepository.seedWithDummyData();
    get().syncFromDatabase();
  },

  clearAllItems: () => {
    pantryRepository.clear();
    get().syncFromDatabase();
  },
}));