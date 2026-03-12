import type { Recipe } from "~/types/Recipe";
import type { RecipeFilterStrategy, FilterContext } from "./RecipeFilterStrategy";

/**
 * Configuration options for CategoryFilter
 */
export interface CategoryFilterOptions {
  /** Categories to filter by (if empty, no filtering is applied) */
  categories?: string[];
  /** If true, recipe must have ALL categories. If false (default), ANY category matches */
  requireAll?: boolean;
}

/**
 * Filter that includes/excludes recipes based on category tags.
 *
 * Can use categories from options or from FilterContext.selectedCategories.
 *
 * Filtering behavior:
 * - If no categories specified in options or context, includes all recipes
 * - If requireAll is true: recipe must have ALL specified categories
 * - If requireAll is false (default): recipe must have ANY of the specified categories
 * - Category matching is case-insensitive
 *
 * @example
 * const filter = new CategoryFilter({ categories: ["dinner", "quick"], requireAll: false });
 * const passes = filter.filter(recipe); // true if recipe has "dinner" OR "quick" tag
 */
export class CategoryFilter implements RecipeFilterStrategy {
  private readonly categories: string[];
  private readonly requireAll: boolean;

  /**
   * Create a new category filter
   * @param options Configuration options for the filter
   */
  constructor(options: CategoryFilterOptions = {}) {
    this.categories = options.categories ?? [];
    this.requireAll = options.requireAll ?? false;
  }

  /**
   * Check if a recipe passes the category filter
   * @param recipe The recipe to check
   * @param context Optional context containing selectedCategories as fallback
   * @returns true if recipe matches the category criteria, false otherwise
   */
  filter(recipe: Recipe, context?: FilterContext): boolean {
    // Use categories from options or context
    const categoriesToMatch = this.categories.length > 0 
      ? this.categories 
      : context?.selectedCategories ?? [];

    // No categories specified - include all
    if (categoriesToMatch.length === 0) {
      return true;
    }

    const recipeTags = recipe.tags ?? [];

    if (this.requireAll) {
      // Recipe must have ALL specified categories
      return categoriesToMatch.every((cat) =>
        recipeTags.some((tag) => tag.toLowerCase() === cat.toLowerCase())
      );
    } else {
      // Recipe must have ANY of the specified categories
      return categoriesToMatch.some((cat) =>
        recipeTags.some((tag) => tag.toLowerCase() === cat.toLowerCase())
      );
    }
  }
}
