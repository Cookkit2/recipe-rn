import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "../RecipeRankingStrategy";
import { storage } from "~/data";

import { PREF_DIET_KEY } from "~/constants/storage-keys";

/**
 * Strategy that boosts recipes matching the user's dietary preferences.
 *
 * Provides a ranking bonus for recipes that match the user's stored dietary
 * preference (vegetarian, vegan, etc.). This is a BOOST strategy, not a filter.
 *
 * Note: This strategy provides a RANKING BOOST for matching recipes.
 * For FILTERING (excluding non-matching recipes), use DietaryFilter instead.
 *
 * @example
 * const strategy = new DietaryStrategy(50); // 50 point bonus for matches
 * const score = strategy.score(recipe); // 50 if recipe matches user's diet, 0 otherwise
 */
export class DietaryStrategy implements RecipeRankingStrategy {
  /**
   * Bonus points for matching dietary preference
   */
  private readonly matchBonus: number;

  // Cached preference values to avoid repeated storage reads and lowercasing
  private initialized = false;
  private cachedUserDiet: string | null = null;

  /**
   * Create a new dietary preference ranking strategy
   * @param matchBonus Bonus points to award for matching recipes (default: 50)
   */
  constructor(matchBonus: number = 50) {
    this.matchBonus = matchBonus;
  }

  /**
   * Lazily loads dietary preference from storage.
   * Caches the result to prevent repeated reads on every score call.
   */
  private ensureInitialized() {
    if (this.initialized) return;

    const userDiet = storage.get(PREF_DIET_KEY) as string | undefined;
    this.cachedUserDiet = userDiet && userDiet !== "none" ? userDiet.toLowerCase() : null;

    this.initialized = true;
  }

  /**
   * Calculate score based on dietary preference match
   * @param recipe The recipe to score
   * @param _context Unused context (retained for interface compatibility)
   * @returns matchBonus if recipe matches user's diet, 0 otherwise
   */
  score(recipe: Recipe, _context?: RankingContext): number {
    this.ensureInitialized();

    // No preference set or "none" selected
    if (!this.cachedUserDiet) {
      return 0;
    }

    // Check if any recipe tag matches the user's dietary preference
    const hasMatchingTag = recipe.tags?.some((tag) => tag.toLowerCase() === this.cachedUserDiet);

    return hasMatchingTag ? this.matchBonus : 0;
  }
}
