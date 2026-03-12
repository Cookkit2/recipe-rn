import type { Recipe } from "~/types/Recipe";

/**
 * Data structure for cooking history used in ranking
 */
export interface CookingHistoryData {
  /** Map of recipeId -> { cookCount, lastCookedAt timestamp } */
  mostCooked: Map<string, { cookCount: number; lastCookedAt: number }>;
  /** Map of recipeId -> average rating (1-5) */
  ratings: Map<string, number>;
}

/**
 * Context passed to ranking strategies for additional data
 */
export interface RankingContext {
  /** Pre-fetched cooking history data for history-based ranking */
  cookingHistory?: CookingHistoryData;
  /** Map of recipeId -> completion percentage (0-100) based on pantry availability */
  completionPercentages?: Map<string, number>;
  /** Set of ingredient IDs that are expiring soon (for expiring-based ranking) */
  expiringIngredients?: Set<string>;
}

/**
 * Strategy interface for recipe ranking algorithms
 * 
 * Implementations calculate a numeric score for a recipe.
 * Higher scores indicate higher priority in recommendations.
 */
export interface RecipeRankingStrategy {
  /**
   * Calculate a score for a recipe
   * @param recipe The recipe to score
   * @param context Optional context with additional data for scoring
   * @returns A numeric score (higher = better ranking)
   */
  score(recipe: Recipe, context?: RankingContext): number;
}
