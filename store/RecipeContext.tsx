import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { Recipe as DbRecipe } from "~/data/db/models";
import type { Recipe } from "~/types/Recipe";

interface RecipeContextType {
  selectedRecipeTags: string[];
  updateRecipeTag: (tag: string | string[]) => void;

  filteredRecipes: Recipe[];
  allRecipes: Recipe[];
  isLoading: boolean;
  error: string | null;

  // Database operations
  refreshRecipes: () => Promise<void>;
  searchRecipes: (
    searchTerm: string,
    filters?: {
      tags?: string[];
      maxPrepTime?: number;
      maxCookTime?: number;
      maxDifficulty?: number;
    }
  ) => Promise<Recipe[]>;
  getRecipeById: (id: string) => Promise<Recipe | null>;
  addRecipe: (recipe: Omit<Recipe, "id">) => Promise<void>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;

  // Smart features
  getAvailableRecipes: () => Promise<{
    canMake: Recipe[];
    partiallyCanMake: Array<{ recipe: Recipe; completionPercentage: number }>;
  }>;
  getShoppingListForRecipe: (recipeId: string) => Promise<{
    missingIngredients: Array<{
      name: string;
      quantity: string;
      notes?: string;
    }>;
    availableIngredients: Array<{ name: string; quantity: string }>;
  }>;
}

const RecipeContext = createContext<RecipeContextType | null>(null);

// Helper function to convert database recipe to UI Recipe format
const convertDbRecipeToUIRecipe = async (
  dbRecipe: DbRecipe
): Promise<Recipe> => {
  const recipeDetails = await databaseFacade.recipes.getRecipeWithDetails(
    dbRecipe.id
  );

  if (!recipeDetails) {
    throw new Error("Failed to load recipe details");
  }

  const { recipe, steps, ingredients } = recipeDetails;

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    imageUrl: recipe.imageUrl || "",
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    difficultyStars: recipe.difficultyStars,
    servings: recipe.servings,
    sourceUrl: recipe.sourceUrl,
    calories: recipe.calories,
    tags: recipe.tags,
    ingredients: ingredients.map((ing) => ({
      name: ing.name,
      relatedIngredientId: ing.baseIngredientId,
      quantity: ing.quantity,
      notes: ing.notes,
    })),
    instructions: steps.map((step) => ({
      step: step.step,
      title: step.title,
      description: step.description,
      relatedIngredientIds: [], // TODO: Map from database if needed
    })),
  };
};

export function RecipeProvider({ children }: { children: React.ReactNode }) {
  // UI State
  const [selectedRecipeTags, setSelectedRecipeTags] = useState<string[]>([]);

  // Database State
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load recipes from database
  const refreshRecipes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dbRecipes = await databaseFacade.recipes.findAll();
      const uiRecipes = await Promise.all(
        dbRecipes.map(convertDbRecipeToUIRecipe)
      );

      setRecipes(uiRecipes);
    } catch (err) {
      console.error("Error loading recipes:", err);
      setError("Failed to load recipes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    refreshRecipes();
  }, [refreshRecipes]);

  // Database operations
  const searchRecipes = useCallback(
    async (
      searchTerm: string,
      filters?: {
        tags?: string[];
        maxPrepTime?: number;
        maxCookTime?: number;
        maxDifficulty?: number;
      }
    ) => {
      try {
        const dbRecipes = await databaseFacade.recipes.searchRecipes({
          searchTerm,
          tags: filters?.tags,
          maxPrepTime: filters?.maxPrepTime,
          maxCookTime: filters?.maxCookTime,
          maxDifficulty: filters?.maxDifficulty,
        });

        return await Promise.all(dbRecipes.map(convertDbRecipeToUIRecipe));
      } catch (err) {
        console.error("Error searching recipes:", err);
        return [];
      }
    },
    []
  );

  const getRecipeById = useCallback(
    async (id: string): Promise<Recipe | null> => {
      try {
        const dbRecipe = await databaseFacade.recipes.findById(id);
        if (!dbRecipe) return null;

        return await convertDbRecipeToUIRecipe(dbRecipe);
      } catch (err) {
        console.error("Error getting recipe by id:", err);
        return null;
      }
    },
    []
  );

  const addRecipe = useCallback(
    async (recipe: Omit<Recipe, "id">) => {
      try {
        setError(null);

        await databaseFacade.recipes.createRecipeWithDetails({
          recipe: {
            title: recipe.title,
            description: recipe.description,
            imageUrl: recipe.imageUrl,
            prepMinutes: recipe.prepMinutes || 0,
            cookMinutes: recipe.cookMinutes || 0,
            difficultyStars: recipe.difficultyStars || 1,
            servings: recipe.servings || 1,
            sourceUrl: recipe.sourceUrl,
            calories: recipe.calories,
            tags: recipe.tags,
          },
          steps: recipe.instructions.map((step) => ({
            step: step.step,
            title: step.title,
            description: step.description,
            recipeId: "", // Will be set automatically
          })),
          ingredients: recipe.ingredients.map((ing) => ({
            recipeId: "", // Will be set automatically
            baseIngredientId: ing.relatedIngredientId,
            name: ing.name,
            quantity: ing.quantity,
            notes: ing.notes,
          })),
        });

        await refreshRecipes();
      } catch (err) {
        console.error("Error adding recipe:", err);
        setError("Failed to add recipe");
      }
    },
    [refreshRecipes]
  );

  const updateRecipe = useCallback(
    async (id: string, updates: Partial<Recipe>) => {
      try {
        setError(null);

        const dbRecipe = await databaseFacade.recipes.findById(id);
        if (!dbRecipe) {
          throw new Error("Recipe not found");
        }

        await dbRecipe.updateRecipe({
          title: updates.title,
          description: updates.description,
          imageUrl: updates.imageUrl,
          prepMinutes: updates.prepMinutes,
          cookMinutes: updates.cookMinutes,
          difficultyStars: updates.difficultyStars,
          servings: updates.servings,
          sourceUrl: updates.sourceUrl,
          calories: updates.calories,
          tags: updates.tags,
        });

        await refreshRecipes();
      } catch (err) {
        console.error("Error updating recipe:", err);
        setError("Failed to update recipe");
      }
    },
    [refreshRecipes]
  );

  const deleteRecipe = useCallback(
    async (id: string) => {
      try {
        setError(null);

        await databaseFacade.recipes.delete(id);
        await refreshRecipes();
      } catch (err) {
        console.error("Error deleting recipe:", err);
        setError("Failed to delete recipe");
      }
    },
    [refreshRecipes]
  );

  // Smart features
  const getAvailableRecipes = useCallback(async () => {
    try {
      const availability = await databaseFacade.getAvailableRecipes();

      const canMake = await Promise.all(
        availability.canMake.map(convertDbRecipeToUIRecipe)
      );

      const partiallyCanMake = await Promise.all(
        availability.partiallyCanMake.map(async (item) => ({
          recipe: await convertDbRecipeToUIRecipe(item.recipe),
          completionPercentage: item.completionPercentage,
        }))
      );

      return { canMake, partiallyCanMake };
    } catch (err) {
      console.error("Error getting available recipes:", err);
      return { canMake: [], partiallyCanMake: [] };
    }
  }, []);

  const getShoppingListForRecipe = useCallback(async (recipeId: string) => {
    try {
      return await databaseFacade.getShoppingListForRecipe(recipeId);
    } catch (err) {
      console.error("Error getting shopping list:", err);
      return { missingIngredients: [], availableIngredients: [] };
    }
  }, []);

  // UI callbacks
  const updateRecipeTag = useCallback((tag: string | string[]) => {
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

  // Filtered recipes
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
        allRecipes: recipes,
        isLoading,
        error,
        refreshRecipes,
        searchRecipes,
        getRecipeById,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        getAvailableRecipes,
        getShoppingListForRecipe,
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
