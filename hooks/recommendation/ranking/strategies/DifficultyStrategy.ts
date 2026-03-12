import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "../RecipeRankingStrategy";

/**
 * Strategy that scores recipes based on difficulty level.
 *
 * Easier recipes (lower difficulty stars) receive higher scores to prioritize
 * recipes that are less complex and more likely to succeed.
 *
 * Scoring formula: score = (6 - difficulty) * multiplier
 * - Difficulty 1 (easiest): score = 5 * multiplier
 * - Difficulty 3 (medium): score = 3 * multiplier
 * - Difficulty 5 (hardest): score = 1 * multiplier
 *
 * @example
 * const strategy = new DifficultyStrategy(10);
 * const score = strategy.score(recipe); // 50 for easiest (1 star), 10 for hardest (5 stars)
 */
export class DifficultyStrategy implements RecipeRankingStrategy {
  /**
   * Score multiplier for difficulty calculation
   * Default: 10 points per difficulty level below max
   */
  private readonly multiplier: number;

  /**
   * Create a new difficulty-based ranking strategy
   * @param multiplier Score multiplier (default: 10)
   */
  constructor(multiplier: number = 10) {
    this.multiplier = multiplier;
  }

  /**
   * Calculate score based on recipe difficulty (easier = higher score)
   * @param recipe The recipe to score
   * @param _context Unused context (retained for interface compatibility)
   * @returns Score where easier recipes get higher values
   */
  score(recipe: Recipe, _context?: RankingContext): number {
    // Difficulty is 1-5 stars, default to 3 (medium) if not set
    const difficulty = recipe.difficultyStars ?? 3;
    // Score: easier recipes (lower difficulty) get higher scores
    // Max score: (6 - 1) * 10 = 50 for easiest
    // Min score: (6 - 5) * 10 = 10 for hardest
    return (6 - difficulty) * this.multiplier;
  }
}
