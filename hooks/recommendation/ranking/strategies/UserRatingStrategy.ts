import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "../RecipeRankingStrategy";

/**
 * Configuration options for UserRatingStrategy
 */
export interface UserRatingStrategyOptions {
  /** Bonus for highly rated recipes (default: 30) */
  highRatingBonus?: number;
  /** Minimum rating to receive bonus (default: 4) */
  minRatingForBonus?: number;
}

/**
 * Strategy that boosts recipes the user has rated highly.
 *
 * When users rate a recipe after cooking, it reflects their
 * actual experience. High ratings indicate:
 * - They enjoyed cooking it
 * - The dish turned out well
 * - They'd likely want to make it again
 *
 * Requires cookingHistory data (with ratings) in RankingContext.
 */
export class UserRatingStrategy implements RecipeRankingStrategy {
  private readonly highRatingBonus: number;
  private readonly minRatingForBonus: number;

  constructor(options: UserRatingStrategyOptions = {}) {
    this.highRatingBonus = options.highRatingBonus ?? 30;
    this.minRatingForBonus = options.minRatingForBonus ?? 4;
  }

  score(recipe: Recipe, context?: RankingContext): number {
    if (!context?.cookingHistory) {
      return 0;
    }

    const rating = context.cookingHistory.ratings.get(recipe.id);

    if (rating !== undefined && rating >= this.minRatingForBonus) {
      return this.highRatingBonus;
    }

    return 0;
  }
}
