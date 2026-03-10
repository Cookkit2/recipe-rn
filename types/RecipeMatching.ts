import type { Recipe, RecipeIngredient } from "./Recipe";

/**
 * Status of a single ingredient's availability in pantry
 */
export type IngredientMatchStatus = "available" | "partial" | "missing";

/**
 * Detailed match information for a single ingredient
 * Includes pantry stock details and deficit quantity
 */
export interface IngredientMatchDetail {
  name: string;
  relatedIngredientId: string;
  requiredQuantity: number;
  requiredUnit: string;
  notes?: string;
  status: IngredientMatchStatus;
  // Pantry stock information
  pantryQuantity?: number;
  pantryUnit?: string;
  // If partial or missing, the deficit amount
  missingQuantity?: number;
  missingUnit?: string;
}

/**
 * Recipe match category based on missing ingredient count
 */
export type RecipeMatchCategory =
  | "can_make_now" // All ingredients available in sufficient quantities
  | "missing_1_2" // Missing 1-2 ingredients or insufficient quantities
  | "missing_3_plus"; // Missing 3 or more ingredients

/**
 * Display-friendly labels for recipe match categories
 */
export const RECIPE_MATCH_CATEGORY_LABELS: Record<RecipeMatchCategory, string> = {
  can_make_now: "Can make now",
  missing_1_2: "Missing 1-2 ingredients",
  missing_3_plus: "Missing 3+ ingredients",
};

/**
 * Recipe with detailed matching information against pantry inventory
 */
export interface RecipeWithMatchInfo {
  recipe: Recipe;
  matchCategory: RecipeMatchCategory;
  completionPercentage: number; // 0-100
  ingredientMatches: IngredientMatchDetail[];
  missingIngredientCount: number;
  totalIngredientCount: number;
}

/**
 * Helper function to determine recipe match category from missing ingredient count
 */
export function getRecipeMatchCategory(
  missingCount: number,
  totalIngredients: number
): RecipeMatchCategory {
  if (missingCount === 0) {
    return "can_make_now";
  } else if (missingCount <= 2) {
    return "missing_1_2";
  } else {
    return "missing_3_plus";
  }
}

/**
 * Shopping list item with calculated deficit quantity
 */
export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

/**
 * Available ingredient in pantry with stock details
 */
export interface AvailableIngredientItem {
  name: string;
  quantity: number;
  unit: string;
  stockQuantity: number;
  stockUnit: string;
}
