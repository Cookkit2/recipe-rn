import type { Recipe } from "~/types/Recipe";

/**
 * Context passed to filter strategies for additional data
 */
export interface FilterContext {
  /** Map of recipeId -> completion percentage (0-100) */
  completionPercentages?: Map<string, number>;
  /** Selected category tags to filter by */
  selectedCategories?: string[];
}

/**
 * Strategy interface for recipe filtering
 * 
 * Implementations determine whether a recipe should be included
 * in the results based on specific criteria.
 */
export interface RecipeFilterStrategy {
  /**
   * Determine if a recipe passes the filter
   * @param recipe The recipe to evaluate
   * @param context Optional context with additional data
   * @returns true if recipe should be included, false to exclude
   */
  filter(recipe: Recipe, context?: FilterContext): boolean;
}
