import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "../RecipeRankingStrategy";

/**
 * Configuration options for RecencyPenaltyStrategy
 */
export interface RecencyPenaltyStrategyOptions {
  /** Penalty for recently cooked recipes (default: -20) */
  penalty?: number;
  /** Days threshold for penalty (default: 3) */
  daysThreshold?: number;
}

/**
 * Strategy that penalizes recently cooked recipes to encourage variety.
 * 
 * If a user just made a recipe recently, they probably don't want
 * to make it again right away. This helps surface different options.
 * 
 * Requires cookingHistory data in RankingContext.
 */
export class RecencyPenaltyStrategy implements RecipeRankingStrategy {
  private readonly penalty: number;
  private readonly daysThreshold: number;

  constructor(options: RecencyPenaltyStrategyOptions = {}) {
    this.penalty = options.penalty ?? -20;
    this.daysThreshold = options.daysThreshold ?? 3;
  }

  score(recipe: Recipe, context?: RankingContext): number {
    if (!context?.cookingHistory) {
      return 0;
    }

    const cookingData = context.cookingHistory.mostCooked.get(recipe.id);

    if (!cookingData) {
      return 0;
    }

    // Apply penalty if cooked within threshold days
    const thresholdMs = this.daysThreshold * 24 * 60 * 60 * 1000;
    const timeSinceLastCook = Date.now() - cookingData.lastCookedAt;

    if (timeSinceLastCook < thresholdMs) {
      return this.penalty;
    }

    return 0;
  }
}
