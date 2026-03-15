import type { Recipe } from "~/types/Recipe";
import type { RecipeFilterStrategy, FilterContext } from "./RecipeFilterStrategy";
import { storage } from "~/data";
import {
  PREF_DIET_KEY,
  PREF_ALLERGENS_KEY,
  PREF_OTHER_ALLERGENS_KEY,
} from "~/constants/storage-keys";
import type { Allergen } from "~/types/Allergen";
import type { Diet } from "~/types/Diet";
import { isIngredientMatch } from "~/utils/ingredient-matching";

/**
 * Allergen keyword mappings for robust detection.
 * Maps standard allergens to related ingredient terms.
 */
const ALLERGEN_KEYWORDS: Record<Allergen, string[]> = {
  milk: ["milk", "dairy", "cheese", "butter", "cream", "yogurt", "lactose"],
  eggs: ["egg", "mayonnaise", "mayo"],
  nuts: ["nut", "almond", "walnut", "pecan", "cashew", "pistachio", "hazelnut", "macadamia"],
  fish: ["fish", "salmon", "tuna", "cod", "anchovy", "sardine"],
  shellfish: ["shellfish", "shrimp", "crab", "lobster", "prawn", "scallop", "oyster", "mussel"],
  wheat: ["wheat", "flour", "gluten", "bread", "pasta", "noodle", "soy sauce"],
};

/**
 * Configuration options for DietaryFilter
 */
export interface DietaryFilterOptions {
  /** Whether to check dietary preferences (default: true) */
  checkDietaryPreferences?: boolean;
  /** Whether to check allergens (default: true) */
  checkAllergens?: boolean;
  /** Whether to check recipe tags for allergen mentions (default: true) */
  checkTagsForAllergens?: boolean;
}

/**
 * Filter that excludes recipes not matching user's dietary preferences and allergens.
 *
 * Reads preferences from storage:
 * - PREF_DIET_KEY: User's dietary preference (vegetarian, vegan, etc.)
 * - PREF_ALLERGENS_KEY: Known allergens to avoid
 * - PREF_OTHER_ALLERGENS_KEY: Custom allergens specified by user
 *
 * Features:
 * - Robust allergen detection using keyword mappings (e.g., "milk" catches "cheese", "butter")
 * - Smart matching for custom allergens using isIngredientMatch
 * - Checks both ingredients AND recipe tags for allergen mentions
 *
 * @example
 * const filter = new DietaryFilter({ checkDietaryPreferences: true, checkAllergens: true });
 * const isSafe = filter.filter(recipe); // true if recipe matches user's dietary needs
 */
export class DietaryFilter implements RecipeFilterStrategy {
  private readonly checkDietaryPreferences: boolean;
  private readonly checkAllergens: boolean;
  private readonly checkTagsForAllergens: boolean;

  /**
   * Create a new dietary filter
   * @param options Configuration options for the filter behavior
   */
  constructor(options: DietaryFilterOptions = {}) {
    this.checkDietaryPreferences = options.checkDietaryPreferences ?? true;
    this.checkAllergens = options.checkAllergens ?? true;
    this.checkTagsForAllergens = options.checkTagsForAllergens ?? true;
  }

  /**
   * Check if a recipe is safe based on dietary preferences and allergens
   * @param recipe The recipe to check
   * @param _context Unused context (retained for interface compatibility)
   * @returns true if recipe is safe to eat, false if it violates dietary restrictions
   */
  filter(recipe: Recipe, _context?: FilterContext): boolean {
    // Check dietary preferences
    if (this.checkDietaryPreferences) {
      const userDiet = storage.get(PREF_DIET_KEY) as Diet | undefined;

      if (userDiet && userDiet !== "none") {
        const recipeTags = recipe.tags?.map((tag) => tag.toLowerCase()) ?? [];

        // Recipe must have matching dietary tag
        if (!recipeTags.includes(userDiet.toLowerCase())) {
          return false;
        }
      }
    }

    // Check allergens
    if (this.checkAllergens) {
      const { standardAllergens, customAllergens } = this.getAllergens();
      const allAllergens = [...standardAllergens, ...customAllergens];

      if (allAllergens.length > 0) {
        // Check recipe ingredients for allergens
        for (const ingredient of recipe.ingredients) {
          const ingredientName = ingredient.name.toLowerCase();

          // Check against standard allergens using keyword mappings
          for (const allergen of standardAllergens) {
            if (this.containsStandardAllergen(ingredientName, allergen)) {
              return false;
            }
          }

          // Check against custom allergens using smart ingredient matching
          for (const allergen of customAllergens) {
            if (isIngredientMatch(ingredientName, allergen.toLowerCase())) {
              return false;
            }
          }
        }

        // Also check recipe tags for allergen mentions
        if (this.checkTagsForAllergens) {
          const recipeTags = recipe.tags?.map((tag) => tag.toLowerCase()) ?? [];
          for (const allergen of allAllergens) {
            if (recipeTags.some((tag) => tag.includes(allergen.toLowerCase()))) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * Check if an ingredient contains a standard allergen using keyword mappings
   * @param ingredientName The name of the ingredient to check (lowercase)
   * @param allergen The standard allergen to check for
   * @returns true if the ingredient contains any keyword for the allergen
   */
  private containsStandardAllergen(ingredientName: string, allergen: Allergen): boolean {
    const keywords = ALLERGEN_KEYWORDS[allergen];
    if (!keywords) return false;

    return keywords.some((keyword) => ingredientName.includes(keyword));
  }

  /**
   * Get allergens from storage, separated by type
   * @returns Object containing standard allergens array and custom allergens array
   */
  private getAllergens(): { standardAllergens: Allergen[]; customAllergens: string[] } {
    const standardAllergens: Allergen[] = [];
    const customAllergens: string[] = [];

    // Standard allergens
    const storedAllergens = storage.get(PREF_ALLERGENS_KEY);
    if (typeof storedAllergens === "string" && storedAllergens) {
      standardAllergens.push(...(storedAllergens.split(",") as Allergen[]));
    }

    // Custom allergens
    const otherAllergens = storage.get(PREF_OTHER_ALLERGENS_KEY) as string | undefined;
    if (otherAllergens) {
      const parsed = otherAllergens
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      customAllergens.push(...parsed);
    }

    return { standardAllergens, customAllergens };
  }
}
