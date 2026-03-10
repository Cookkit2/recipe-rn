import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "../RecipeRankingStrategy";

/**
 * Configuration options for ExpiringIngredientsRankingStrategy
 */
export interface ExpiringIngredientsRankingStrategyOptions {
  /** Base bonus score for each expiring ingredient used (default: 20) */
  baseBonus?: number;
  /** Multiplier bonus for recipes using multiple expiring ingredients (default: 1.5) */
  multipleIngredientMultiplier?: number;
  /** Minimum number of expiring ingredients to trigger multiplier (default: 2) */
  multiplierThreshold?: number;
}

/**
 * Strategy that scores recipes based on how many expiring ingredients they use.
 *
 * Recipes that use more ingredients approaching expiration score higher.
 * This helps reduce food waste by prioritizing recipes that use ingredients
 * that need to be consumed soon.
 *
 * Requires expiringIngredients data in RankingContext (Set of ingredient IDs).
 */
export class ExpiringIngredientsRankingStrategy implements RecipeRankingStrategy {
  private readonly baseBonus: number;
  private readonly multipleIngredientMultiplier: number;
  private readonly multiplierThreshold: number;

  constructor(options: ExpiringIngredientsRankingStrategyOptions = {}) {
    this.baseBonus = options.baseBonus ?? 20;
    this.multipleIngredientMultiplier = options.multipleIngredientMultiplier ?? 1.5;
    this.multiplierThreshold = options.multiplierThreshold ?? 2;
  }

  score(recipe: Recipe, context?: RankingContext): number {
    if (!context?.expiringIngredients || context.expiringIngredients.size === 0) {
      return 0;
    }

    // Count how many of the recipe's ingredients are expiring
    const expiringCount = recipe.ingredients.filter((ingredient) =>
      context.expiringIngredients!.has(ingredient.relatedIngredientId)
    ).length;

    if (expiringCount === 0) {
      return 0;
    }

    // Base score from expiring ingredients
    let score = expiringCount * this.baseBonus;

    // Apply multiplier bonus for recipes using multiple expiring ingredients
    if (expiringCount >= this.multiplierThreshold) {
      score *= this.multipleIngredientMultiplier;
    }

    return score;
  }
}
