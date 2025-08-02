import type { RecipeRackItem } from "@/type/RecipeRackItem";
import { create } from "zustand";
import { dummyRecipesData } from "@/lib/dummy-recipes";

interface RecipeRackStore {
  rackItems: RecipeRackItem[];
  loaded: boolean;

  // Actions
  setRackItems: (rackItems: RecipeRackItem[]) => void;
  addRackItem: (rackItem: RecipeRackItem) => void;
  updateRackItem: (rackItem: RecipeRackItem) => void;
  deleteRackItem: (id: string) => void;

  // Utility methods
  seedWithDefaultRecipes: () => void;
  clearAllItems: () => void;
}

const useRecipeRackStore = create<RecipeRackStore>((set, get) => ({
  rackItems: [],
  loaded: false,

  setRackItems: (rackItems: RecipeRackItem[]) => {
    set({
      rackItems,
      loaded: true,
    });
  },

  addRackItem: (rackItem: RecipeRackItem) => {
    set((state) => ({
      rackItems: [...state.rackItems, rackItem],
    }));
  },

  updateRackItem: (rackItem: RecipeRackItem) => {
    set((state) => ({
      rackItems: state.rackItems.map((item) =>
        item.id === rackItem.id ? rackItem : item
      ),
    }));
  },

  deleteRackItem: (id: string) => {
    set((state) => ({
      rackItems: state.rackItems.filter((item) => item.id !== id),
    }));
  },

  seedWithDefaultRecipes: () => {
    const defaultRackItems: RecipeRackItem[] = dummyRecipesData
      .slice(0, 8) // Take first 8 recipes
      .map((recipe, index) => ({
        id: `rack-${recipe.id}`,
        title: recipe.title,
        imageUrl: recipe.imageUrl || "/images/recipe-placeholder.jpg",
        recipeId: recipe.id,
        x: 100 + (index % 4) * 80, // 4 items per row
        y: 150 + Math.floor(index / 4) * 100, // 2 rows
        scale: 1,
        created_at: new Date(),
        updated_at: new Date(),
      }));

    get().setRackItems(defaultRackItems);
  },

  clearAllItems: () => {
    set({ rackItems: [], loaded: false });
  },
}));

export default useRecipeRackStore; 