import { useMemo } from "react";
import type { Recipe } from "~/types/Recipe";
import {
  scaleRecipeIngredients,
  calculateScalingFactor,
  getScalingDirection,
  formatScalingChange,
  isValidServingSize,
} from "~/utils/recipe-scaling";

export interface RecipeScalingResult {
  scaledIngredients: Recipe["ingredients"];
  originalServings: number;
  currentServings: number;
  scalingFactor: number;
  scalingDirection: "up" | "down" | "none";
  scalingLabel: string;
  isScaled: boolean;
}

/**
 * Hook for scaling recipe ingredients based on serving size.
 * Returns memoized scaled ingredients and scaling metadata.
 *
 * @param recipe - The recipe to scale (optional)
 * @param currentServings - The desired number of servings (optional, defaults to recipe.servings)
 * @returns Scaled ingredients and metadata about the scaling operation
 */
export default function useRecipeScaling(
  recipe?: Recipe | null,
  currentServings?: number | null
): RecipeScalingResult {
  return useMemo(() => {
    // Default values if recipe or servings are not provided
    const originalServings = recipe?.servings ?? 1;
    const effectiveServings =
      currentServings && isValidServingSize(currentServings) ? currentServings : originalServings;
    const ingredients = recipe?.ingredients ?? [];

    // Calculate scaling metadata
    const scalingFactor = calculateScalingFactor(originalServings, effectiveServings);
    const scalingDirection = getScalingDirection(originalServings, effectiveServings);
    const scalingLabel = formatScalingChange(originalServings, effectiveServings);
    const isScaled = originalServings !== effectiveServings;

    // Scale ingredients if needed
    const scaledIngredients = isScaled
      ? scaleRecipeIngredients(ingredients, originalServings, effectiveServings)
      : ingredients;

    return {
      scaledIngredients,
      originalServings,
      currentServings: effectiveServings,
      scalingFactor,
      scalingDirection,
      scalingLabel,
      isScaled,
    };
  }, [recipe, currentServings]);
}
