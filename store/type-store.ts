import { create } from "zustand";
import type { ItemType } from "~/types/PantryItem";

type ItemTypeStore = {
  selectedItemType: ItemType;
  changeItemType: (type: ItemType) => void;
};

// Create the store
const useItemTypeStore = create<ItemTypeStore>((set) => ({
  selectedItemType: "all", // Initial state
  changeItemType: (type: ItemType) => set({ selectedItemType: type }),
}));

export default useItemTypeStore;
