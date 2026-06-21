/**
 * Shared helpers for mealPlanApi.ts.
 *
 * Eliminates duplication between throw-based and Result-based API variants
 * by extracting common data-building and recipe-enrichment logic.
 */

import type MealPlan from "~/data/db/models/MealPlan";
import type Recipe from "~/data/db/models/Recipe";
import { databaseFacade, type RecipeWithDetails } from "~/data/db/DatabaseFacade";
import { log } from "~/utils/logger";

// ---------------------------------------------------------------------------
// Exported types (re-exported by mealPlanApi.ts for backward compatibility)
// ---------------------------------------------------------------------------

export interface MealPlanItemWithRecipe {
  id: string;
  recipeId: string;
  servings: number;
  date: Date;
  mealSlot: string;
  templateId?: string;
  createdAt: Date;
  recipe: {
    id: string;
    title: string;
    imageUrl: string;
    servings: number;
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
    }>;
  } | null;
}

export interface GroceryItem {
  name: string;
  totalQuantity: number;
  unit: string;
  neededQuantity: number;
  fromRecipes: string[];
  category: "produce" | "dairy" | "meat" | "pantry" | "other";
  isChecked: boolean;
  isCovered: boolean;
}

// ---------------------------------------------------------------------------
// Recipe data builders
// ---------------------------------------------------------------------------

/**
 * Build the `recipe` field of `MealPlanItemWithRecipe` from `RecipeWithDetails`.
 */
export function buildRecipeDataFromDetails(
  details: RecipeWithDetails
): NonNullable<MealPlanItemWithRecipe["recipe"]> {
  const { recipe, ingredients } = details;
  return {
    id: recipe.id,
    title: recipe.title,
    imageUrl: recipe.imageUrl || "",
    servings: recipe.servings,
    ingredients: ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
    })),
  };
}

/**
 * Build a placeholder recipe data object for a missing / unknown recipe.
 */
export function buildUnknownRecipeData(
  recipeId: string
): NonNullable<MealPlanItemWithRecipe["recipe"]> {
  return {
    id: recipeId,
    title: "Unknown Recipe",
    imageUrl: "",
    servings: 0,
    ingredients: [],
  };
}

// ---------------------------------------------------------------------------
// MealPlan item builder
// ---------------------------------------------------------------------------

/**
 * Build a `MealPlanItemWithRecipe` from a WatermelonDB `MealPlan` model
 * and the already-resolved recipe data.
 */
export function buildMealPlanItem(
  item: MealPlan,
  recipeData: MealPlanItemWithRecipe["recipe"]
): MealPlanItemWithRecipe {
  const date = item.date instanceof Date ? item.date : new Date((item as any).date ?? Date.now());
  const mealSlot = item.mealSlot ?? "dinner";

  return {
    id: item.id,
    recipeId: item.recipeId,
    servings: item.servings,
    date,
    mealSlot,
    templateId: item.templateId,
    createdAt: item.createdAt,
    recipe: recipeData,
  };
}

// ---------------------------------------------------------------------------
// Batch enrichment
// ---------------------------------------------------------------------------

export interface EnrichBatchOptions {
  /** When true, skip items whose recipe details are missing (instead of using a placeholder). */
  skipMissing?: boolean;
}

/**
 * Enrich an array of MealPlan items with recipe details using batch fetching.
 * Avoids N+1 queries by fetching all recipe details in one go.
 */
export async function enrichMealPlanItemsBatch(
  items: MealPlan[],
  options?: EnrichBatchOptions
): Promise<MealPlanItemWithRecipe[]> {
  const itemsWithRecipes: MealPlanItemWithRecipe[] = [];

  const recipeIds = Array.from(new Set(items.map((item) => item.recipeId)));
  const recipeDetailsMap = await databaseFacade.getRecipesWithDetails(recipeIds);

  for (const item of items) {
    try {
      const recipeDetails = recipeDetailsMap.get(item.recipeId);

      if (recipeDetails && recipeDetails.recipe) {
        itemsWithRecipes.push(buildMealPlanItem(item, buildRecipeDataFromDetails(recipeDetails)));
      } else if (options?.skipMissing) {
        log.warn(`Recipe not found for meal plan item ${item.id}`);
        // skip this item entirely
      } else {
        log.warn(`Recipe missing for meal plan item ${item.id} (recipeId: ${item.recipeId})`);
        itemsWithRecipes.push(buildMealPlanItem(item, buildUnknownRecipeData(item.recipeId)));
      }
    } catch (error) {
      log.error("Error fetching recipe for meal plan item:", item.id, error);
      // Continue with other items
    }
  }

  return itemsWithRecipes;
}

// ---------------------------------------------------------------------------
// Single-item recipe data fetching
// ---------------------------------------------------------------------------

/**
 * Fetch and build recipe data for a single meal plan item.
 * Tries the WatermelonDB relation first, then falls back to DatabaseFacade.
 *
 * This mirrors the logic in `getMealPlanItemByRecipeId` (throw-based variant):
 *   1. If the WatermelonDB relation has a `fetch` method, call it to get the Recipe.
 *   2. If a recipe is found, extract its ingredients via the relation's `fetch`.
 *   3. If no recipe via relation, fall back to `DatabaseFacade.getRecipeWithDetails`.
 */
export async function fetchRecipeDataForItem(
  item: MealPlan
): Promise<MealPlanItemWithRecipe["recipe"]> {
  // Try WatermelonDB relation
  let recipe: Recipe | null | undefined = null;
  if (
    item.recipe != null &&
    typeof (item.recipe as { fetch?: () => Promise<Recipe | undefined> }).fetch === "function"
  ) {
    recipe = await (item.recipe as { fetch: () => Promise<Recipe | undefined> }).fetch();
  }

  if (recipe) {
    const ingredients =
      recipe.ingredients != null && typeof recipe.ingredients.fetch === "function"
        ? await recipe.ingredients.fetch()
        : [];
    return {
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.imageUrl || "",
      servings: recipe.servings,
      ingredients: ingredients.map((ing: { name: string; quantity: number; unit: string }) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
  }

  // Fallback: use DatabaseFacade
  const recipeDetails = await databaseFacade.getRecipeWithDetails(item.recipeId);
  if (recipeDetails) {
    return buildRecipeDataFromDetails(recipeDetails);
  }

  return null;
}

/**
 * Fetch recipe data for a single item using the DatabaseFacade only.
 *
 * This mirrors the logic in `getMealPlanItemByRecipeIdResult` (Result-based variant)
 * where the relation is used only to resolve the recipe ID, then facade fetches details.
 */
export async function fetchRecipeDataForItemViaFacade(
  item: MealPlan
): Promise<MealPlanItemWithRecipe["recipe"]> {
  let recipeData: MealPlanItemWithRecipe["recipe"] = null;

  // Try WatermelonDB relation to resolve recipe ID
  if (
    item.recipe != null &&
    typeof (item.recipe as { fetch?: () => Promise<Recipe | undefined> }).fetch === "function"
  ) {
    const recipe = await (item.recipe as { fetch: () => Promise<Recipe | undefined> }).fetch();
    if (recipe) {
      const recipeDetails = await databaseFacade.getRecipeWithDetails(recipe.id);
      if (recipeDetails) {
        recipeData = {
          id: recipe.id,
          title: recipe.title,
          imageUrl: recipe.imageUrl || "",
          servings: recipe.servings,
          ingredients: recipeDetails.ingredients.map(
            (ing: { name: string; quantity: number; unit: string }) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
            })
          ),
        };
      } else {
        log.warn(`Recipe details failed to load for meal plan item ${item.id}`);
        recipeData = {
          id: recipe.id,
          title: recipe.title,
          imageUrl: recipe.imageUrl || "",
          servings: recipe.servings,
          ingredients: [],
        };
      }
    }
  }

  // If relation didn't work, try facade directly with item's recipeId
  if (!recipeData) {
    const recipeDetails = await databaseFacade.getRecipeWithDetails(item.recipeId);
    if (recipeDetails) {
      recipeData = buildRecipeDataFromDetails(recipeDetails);
    }
  }

  return recipeData;
}
