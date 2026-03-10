import type { Recipe } from "~/types/Recipe";
import type { RecipeFilterStrategy, FilterContext } from "./RecipeFilterStrategy";

/**
 * Configuration options for AvailabilityFilter
 */
export interface AvailabilityFilterOptions {
  /** Minimum completion percentage required (default: 0) */
  minAvailability?: number;
  /** Maximum completion percentage allowed (default: 100) */
  maxAvailability?: number;
}

/**
 * Filter that includes/excludes recipes based on ingredient availability.
 *
 * Filters recipes based on what percentage of required ingredients the user has.
 * Requires completionPercentages in FilterContext, which maps recipe IDs to
 * their completion percentage (0-100).
 *
 * @example
 * // Only show recipes where user has at least 50% of ingredients
 * const filter = new AvailabilityFilter({ minAvailability: 50 });
 * const canMake = filter.filter(recipe, context); // true if completion >= 50%
 */
export class AvailabilityFilter implements RecipeFilterStrategy {
  private readonly minAvailability: number;
  private readonly maxAvailability: number;

  /**
   * Create a new availability filter
   * @param options Configuration options for min/max availability thresholds
   */
  constructor(options: AvailabilityFilterOptions = {}) {
    this.minAvailability = options.minAvailability ?? 0;
    this.maxAvailability = options.maxAvailability ?? 100;
  }

  /**
   * Check if a recipe falls within the availability range
   * @param recipe The recipe to check
   * @param context Context containing completionPercentages map
   * @returns true if recipe completion is within range, false otherwise
   */
  filter(recipe: Recipe, context?: FilterContext): boolean {
    if (!context?.completionPercentages) {
      // No completion data - include by default
      return true;
    }

    const completion = context.completionPercentages.get(recipe.id) ?? 0;
    return completion >= this.minAvailability && completion <= this.maxAvailability;
  }
}
