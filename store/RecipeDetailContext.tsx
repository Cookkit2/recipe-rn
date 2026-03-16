import React, { createContext, useCallback, useContext, useState } from "react";
import type { Recipe } from "~/types/Recipe";
import useRecipeScaling from "~/hooks/useRecipeScaling";

interface RecipeDetailContextType {
  // UI State
  servings: number;
  updateServings: (servings: number) => void;

  // Scaled ingredients
  scaledIngredients: Recipe["ingredients"];
  originalServings: number;
  scalingFactor: number;
  isScaled: boolean;
}

const RecipeDetailContext = createContext<RecipeDetailContextType | null>(null);

export function RecipeDetailProvider({
  children,
  recipe,
}: {
  children: React.ReactNode;
  recipe?: Recipe | null;
}) {
  const [servings, setServings] = useState<number>(recipe?.servings ?? 1);

  // Use the recipe scaling hook to get scaled ingredients
  const scalingResult = useRecipeScaling(recipe, servings);

  // UI callbacks
  const updateServings = useCallback((newServings: number) => {
    setServings(newServings);
  }, []);

  return (
    <RecipeDetailContext.Provider
      value={{
        servings,
        updateServings,
        scaledIngredients: scalingResult.scaledIngredients,
        originalServings: scalingResult.originalServings,
        scalingFactor: scalingResult.scalingFactor,
        isScaled: scalingResult.isScaled,
      }}
    >
      {children}
    </RecipeDetailContext.Provider>
  );
}

export const useRecipeDetailStore = () => {
  const context = useContext(RecipeDetailContext);
  if (!context) {
    throw new Error("useRecipeDetailStore must be used within a RecipeDetailProvider");
  }
  return context;
};
