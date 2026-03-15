import type { Recipe } from "~/types/Recipe";
import type { RecipeFilterStrategy, FilterContext } from "./RecipeFilterStrategy";

/**
 * Composite filter that combines multiple filters.
 *
 * By default, uses AND logic - recipe must pass ALL filters.
 * Can be configured to use OR logic - recipe must pass ANY filter.
 *
 * @example
 * const filter = new CompositeFilterStrategy()
 *   .addFilter(new AvailabilityFilter({ minAvailability: 50 }))
 *   .addFilter(new CategoryFilter({ categories: ["meal"] }));
 */
export class CompositeFilterStrategy implements RecipeFilterStrategy {
  private filters: RecipeFilterStrategy[] = [];
  private readonly useOrLogic: boolean;

  /**
   * @param useOrLogic If true, uses OR logic (any filter passes). Default: false (AND logic)
   */
  constructor(useOrLogic: boolean = false) {
    this.useOrLogic = useOrLogic;
  }

  /**
   * Add a filter to the composite
   * @param filter The filter to add
   * @returns this for method chaining
   */
  addFilter(filter: RecipeFilterStrategy): this {
    this.filters.push(filter);
    return this;
  }

  /**
   * Remove all filters
   * @returns this for method chaining
   */
  clear(): this {
    this.filters = [];
    return this;
  }

  /**
   * Get the number of filters in this composite
   */
  get filterCount(): number {
    return this.filters.length;
  }

  /**
   * Apply all filters to a recipe
   * @param recipe The recipe to filter
   * @param context Optional context passed to all filters
   * @returns true if recipe passes (AND: all pass, OR: any passes)
   */
  filter(recipe: Recipe, context?: FilterContext): boolean {
    if (this.filters.length === 0) {
      return true;
    }

    if (this.useOrLogic) {
      // OR logic - any filter passing is enough
      return this.filters.some((f) => f.filter(recipe, context));
    } else {
      // AND logic - all filters must pass
      return this.filters.every((f) => f.filter(recipe, context));
    }
  }
}
