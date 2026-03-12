import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "../RecipeRankingStrategy";

/**
 * Strategy that scores recipes based on total cooking time.
 *
 * Shorter recipes (under the threshold) receive higher scores to prioritize
 * quick meals for busy users. Total time is calculated as prepMinutes + cookMinutes.
 *
 * Scoring formula: score = max(0, maxTimeForBonus - totalTime) / divisor
 * - Instant recipes (0 min): score = maxTimeForBonus / divisor
 * - At threshold: score = 0
 * - Over threshold: score = 0
 *
 * @example
 * const strategy = new TimeStrategy(120, 10); // 120 min threshold, divisor 10
 * const score = strategy.score(recipe); // 12 for instant (0 min), 6 for 60 min recipe
 */
export class TimeStrategy implements RecipeRankingStrategy {
  /**
   * Maximum time in minutes to receive any bonus (default: 120 minutes / 2 hours)
   */
  private readonly maxTimeForBonus: number;

  /**
   * Divisor for score calculation (default: 10)
   */
  private readonly divisor: number;

  /**
   * Create a new time-based ranking strategy
   * @param maxTimeForBonus Maximum total minutes to receive any score (default: 120)
   * @param divisor Divisor for score calculation (default: 10)
   */
  constructor(maxTimeForBonus: number = 120, divisor: number = 10) {
    this.maxTimeForBonus = maxTimeForBonus;
    this.divisor = divisor;
  }

  /**
   * Calculate score based on total cooking time (shorter = higher score)
   * @param recipe The recipe to score
   * @param _context Unused context (retained for interface compatibility)
   * @returns Score where faster recipes get higher values, 0 if over threshold
   */
  score(recipe: Recipe, _context?: RankingContext): number {
    const prepTime = recipe.prepMinutes ?? 0;
    const cookTime = recipe.cookMinutes ?? 0;
    const totalTime = prepTime + cookTime;

    // Score: recipes under maxTimeForBonus get bonus points
    // Max score: 120 / 10 = 12 for instant recipes
    // Min score: 0 for recipes at or over 2 hours
    return Math.max(0, this.maxTimeForBonus - totalTime) / this.divisor;
  }
}
