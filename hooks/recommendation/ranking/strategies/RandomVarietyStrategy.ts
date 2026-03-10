import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "../RecipeRankingStrategy";

/**
 * Strategy that adds a random factor to recipe scoring.
 * This helps introduce variety in recommendations and prevents
 * the same recipes from always appearing at the top.
 */
export class RandomVarietyStrategy implements RecipeRankingStrategy {
  /**
   * Maximum random bonus points
   */
  private readonly maxVariety: number;

  constructor(maxVariety: number = 20) {
    this.maxVariety = maxVariety;
  }

  score(_recipe: Recipe, _context?: RankingContext): number {
    // Random score between 0 and maxVariety
    return Math.random() * this.maxVariety;
  }
}
