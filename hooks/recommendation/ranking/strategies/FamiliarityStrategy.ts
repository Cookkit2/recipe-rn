import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "../RecipeRankingStrategy";

/**
 * Configuration options for FamiliarityStrategy
 */
export interface FamiliarityStrategyOptions {
  /** Bonus for recipes cooked 1-2 times (default: 15) */
  bonusLow?: number;
  /** Bonus for recipes cooked 3+ times (default: 25) */
  bonusHigh?: number;
  /** Threshold for high bonus (default: 3 cooks) */
  highThreshold?: number;
}

/**
 * Strategy that boosts recipes the user has cooked before.
 *
 * Recipes the user is familiar with get a bonus because:
 * - They know how to make it
 * - They've had a successful experience with it
 * - Less risk of a failed dish
 *
 * Requires cookingHistory data in RankingContext with mostCooked map.
 *
 * Scoring tiers:
 * - Never cooked: 0 points
 * - Cooked 1-(highThreshold-1) times: bonusLow points
 * - Cooked highThreshold+ times: bonusHigh points
 *
 * @example
 * const strategy = new FamiliarityStrategy({ bonusLow: 15, bonusHigh: 25, highThreshold: 3 });
 * const score = strategy.score(recipe, context); // 25 if cooked 3+ times, 15 if cooked 1-2 times
 */
export class FamiliarityStrategy implements RecipeRankingStrategy {
  private readonly bonusLow: number;
  private readonly bonusHigh: number;
  private readonly highThreshold: number;

  /**
   * Create a new familiarity-based ranking strategy
   * @param options Configuration options for bonus points and thresholds
   */
  constructor(options: FamiliarityStrategyOptions = {}) {
    this.bonusLow = options.bonusLow ?? 15;
    this.bonusHigh = options.bonusHigh ?? 25;
    this.highThreshold = options.highThreshold ?? 3;
  }

  /**
   * Calculate score based on how many times user has cooked the recipe
   * @param recipe The recipe to score
   * @param context Context containing cookingHistory with mostCooked map
   * @returns bonusHigh for frequent cooks, bonusLow for occasional cooks, 0 for never cooked
   */
  score(recipe: Recipe, context?: RankingContext): number {
    if (!context?.cookingHistory) {
      return 0;
    }

    const cookingData = context.cookingHistory.mostCooked.get(recipe.id);

    if (!cookingData) {
      return 0;
    }

    // Higher bonus for frequently cooked recipes
    if (cookingData.cookCount >= this.highThreshold) {
      return this.bonusHigh;
    } else if (cookingData.cookCount >= 1) {
      return this.bonusLow;
    }

    return 0;
  }
}
