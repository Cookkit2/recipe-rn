import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "../RecipeRankingStrategy";

/**
 * Configuration options for AlphabeticalStrategy
 */
export interface AlphabeticalStrategyOptions {
  /** Whether to sort in descending order (Z-A). Default: false (A-Z) */
  descending?: boolean;
  /** Maximum score range (default: 26 for letters A-Z) */
  maxScore?: number;
}

/**
 * Strategy that scores recipes based on alphabetical order of their title.
 *
 * Useful as a tiebreaker or for consistent ordering when other factors are equal.
 * By default, recipes starting with 'A' score highest (ascending order).
 *
 * Score is based on the first character of the title:
 * - A-Z: 26 down to 1 (ascending) or 1 up to 26 (descending)
 */
export class AlphabeticalStrategy implements RecipeRankingStrategy {
  private readonly descending: boolean;
  private readonly maxScore: number;

  constructor(options: AlphabeticalStrategyOptions = {}) {
    this.descending = options.descending ?? false;
    this.maxScore = options.maxScore ?? 26;
  }

  score(recipe: Recipe, _context?: RankingContext): number {
    const title = recipe.title.trim().toUpperCase();

    if (!title) {
      return 0;
    }

    const firstChar = title.charCodeAt(0);

    // Calculate position for A-Z (A=0, Z=25)
    let position: number;
    if (firstChar >= 65 && firstChar <= 90) {
      // A-Z
      position = firstChar - 65;
    } else if (firstChar >= 48 && firstChar <= 57) {
      // 0-9 come before A
      position = -1;
    } else {
      // Other characters at the end
      position = 26;
    }

    // Convert to score
    // Ascending (A-Z): A gets highest score
    // Descending (Z-A): Z gets highest score
    if (this.descending) {
      return Math.min(position + 1, this.maxScore);
    } else {
      return Math.max(Math.min(this.maxScore - position, this.maxScore), 0);
    }
  }
}
