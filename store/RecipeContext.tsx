import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { dummyRecipesData } from "~/data/dummy-recipes";
import type { Recipe } from "~/types/Recipe";

interface RecipeContextType {
  selectedRecipeTags: string[];
  updateRecipeTag: (tag: string) => void;

  filteredRecipes: Recipe[];
}

const RecipeContext = createContext<RecipeContextType | null>(null);

// TODO: Fetch Recipes here

export function RecipeProvider({ children }: { children: React.ReactNode }) {
  const [selectedRecipeTags, setSelectedRecipeTags] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>(dummyRecipesData);

  const updateRecipeTag = useCallback((tag: string | string[]) => {
    // If the tag isn't in selected, select it, if it exist, remove it
    if (Array.isArray(tag)) {
      setSelectedRecipeTags((prev) => {
        const newTags = new Set(prev);
        tag.forEach((t) => {
          if (newTags.has(t)) {
            newTags.delete(t);
          } else {
            newTags.add(t);
          }
        });
        return Array.from(newTags);
      });
    } else {
      setSelectedRecipeTags((prev) => {
        const newTags = new Set(prev);
        if (newTags.has(tag)) {
          newTags.delete(tag);
        } else {
          newTags.add(tag);
        }
        return Array.from(newTags);
      });
    }
  }, []);

  const filteredRecipes = useMemo(
    () =>
      recipes.filter((recipe) =>
        selectedRecipeTags.length > 0
          ? recipe.tags?.some((tag) => selectedRecipeTags.includes(tag))
          : true
      ),
    [recipes, selectedRecipeTags]
  );

  return (
    <RecipeContext.Provider
      value={{
        selectedRecipeTags,
        updateRecipeTag,
        filteredRecipes,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
}

export const useRecipeStore = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error("useRecipeStore must be used within a RecipeProvider");
  }
  return context;
};
