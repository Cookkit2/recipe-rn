import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "../RecipeRankingStrategy";

/**
 * Configuration options for ReadinessStrategy
 */
export interface ReadinessStrategyOptions {
  /** Bonus multiplier for completion percentage (default: 1) */
  multiplier?: number;
  /** Extra bonus for 100% completion (default: 1000) */
  fullReadinessBonus?: number;
}

/**
 * Strategy that scores recipes based on ingredient readiness/completion.
 *
 * Recipes where the user has more ingredients available score higher.
 * This helps surface recipes the user can actually make right now.
 *
 * Requires completionPercentages data in RankingContext mapping recipe IDs
 * to their completion percentage (0-100).
 *
 * Scoring formula: score = (completion * multiplier) + fullReadinessBonus (if 100%)
 * - 0% ready: score = 0
 * - 50% ready: score = 50 * multiplier
 * - 100% ready: score = 100 * multiplier + fullReadinessBonus
 *
 * @example
 * const strategy = new ReadinessStrategy({ multiplier: 1, fullReadinessBonus: 50 });
 * const score = strategy.score(recipe, context); // 150 for 100% ready, 50 for 50% ready
 */
export class ReadinessStrategy implements RecipeRankingStrategy {
  private readonly multiplier: number;
  private readonly fullReadinessBonus: number;

  /**
   * Create a new readiness-based ranking strategy
   * @param options Configuration options for scoring behavior
   */
  constructor(options: ReadinessStrategyOptions = {}) {
    this.multiplier = options.multiplier ?? 1;
    this.fullReadinessBonus = options.fullReadinessBonus ?? 1000;
  }

  /**
   * Calculate score based on ingredient availability percentage
   * @param recipe The recipe to score
   * @param context Context containing completionPercentages map
   * @returns Score based on completion percentage, with extra bonus for 100% ready recipes
   */
  score(recipe: Recipe, context?: RankingContext): number {
    if (!context?.completionPercentages) {
      return 0;
    }

    const completion = context.completionPercentages.get(recipe.id) ?? 0;

    // Base score from completion percentage
    let score = completion * this.multiplier;

    // Extra bonus for recipes that are 100% ready
    if (completion === 100) {
      score += this.fullReadinessBonus;
    }

    return score;
  }
}
