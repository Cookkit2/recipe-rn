import { databaseFacade } from "~/data/db/DatabaseFacade";
import { MealPlanRepository } from "~/data/db/repositories/MealPlanRepository";
import { GroceryItemCheckRepository } from "~/data/db/repositories/GroceryItemCheckRepository";
import { log } from "~/utils/logger";
import { withErrorHandling, withErrorLogging, logAndWrapResult } from "~/utils/api-error-handler";
import type { AppResult } from "~/utils/result";
import type { AppError } from "~/types/AppError";

// Re-export types from helpers for backward compatibility
export type { MealPlanItemWithRecipe, GroceryItem } from "./mealPlanApi-helpers";

import {
  buildRecipeDataFromDetails,
  buildUnknownRecipeData,
  buildMealPlanItem,
  enrichMealPlanItemsBatch,
  fetchRecipeDataForItem,
  fetchRecipeDataForItemViaFacade,
  type MealPlanItemWithRecipe,
} from "./mealPlanApi-helpers";

// Lazy initialization of repositories to avoid timing issues
let _mealPlanRepository: MealPlanRepository | null = null;
let _groceryItemCheckRepository: GroceryItemCheckRepository | null = null;

function getMealPlanRepository(): MealPlanRepository {
  if (!_mealPlanRepository) {
    _mealPlanRepository = new MealPlanRepository();
  }
  return _mealPlanRepository;
}

function getGroceryItemCheckRepository(): GroceryItemCheckRepository {
  if (!_groceryItemCheckRepository) {
    _groceryItemCheckRepository = new GroceryItemCheckRepository();
  }
  return _groceryItemCheckRepository;
}

// ---------------------------------------------------------------------------
// Core logic functions (shared between throw-based and Result-based variants)
// ---------------------------------------------------------------------------

async function isRecipeInPlanCore(recipeId: string): Promise<boolean> {
  const mealPlanRepo = getMealPlanRepository();
  return await mealPlanRepo.isRecipeInPlan(recipeId);
}

async function removeFromPlanCore(recipeId: string): Promise<boolean> {
  log.info("🗑️ Removing recipe from meal plan:", recipeId);
  const mealPlanRepo = getMealPlanRepository();
  const success = await mealPlanRepo.removeFromPlan(recipeId);
  log.info("✅ Removed from meal plan:", success);
  return success;
}

async function updateServingsCore(recipeId: string, servings: number): Promise<boolean> {
  const mealPlanRepo = getMealPlanRepository();
  const updated = await mealPlanRepo.updateServings(recipeId, servings);
  return updated !== null;
}

async function clearAllPlannedRecipesCore(): Promise<void> {
  const mealPlanRepo = getMealPlanRepository();
  await mealPlanRepo.clearAllPlannedRecipes();
  log.info("✅ Cleared all planned recipes");
}

async function getPlannedRecipeCountCore(): Promise<number> {
  const mealPlanRepo = getMealPlanRepository();
  return await mealPlanRepo.getPlannedRecipeCount();
}

async function getGroceryAttributesCore(): Promise<
  Map<string, { isChecked: boolean; isDeleted: boolean }>
> {
  const groceryCheckRepo = getGroceryItemCheckRepository();
  return await groceryCheckRepo.getCheckAttributesMap();
}

async function getGroceryCheckStatesCore(): Promise<Map<string, boolean>> {
  const groceryCheckRepo = getGroceryItemCheckRepository();
  return await groceryCheckRepo.getCheckStatesMap();
}

async function toggleGroceryItemCheckCore(ingredientName: string): Promise<boolean> {
  const groceryCheckRepo = getGroceryItemCheckRepository();
  return await groceryCheckRepo.toggleChecked(ingredientName);
}

async function setGroceryItemDeletedCore(
  ingredientName: string,
  isDeleted: boolean
): Promise<void> {
  const groceryCheckRepo = getGroceryItemCheckRepository();
  await groceryCheckRepo.setDeleted(ingredientName, isDeleted);
  log.info(`✅ Set deleted state for ${ingredientName} to ${isDeleted}`);
}

async function setGroceryItemsDeletedBatchCore(
  items: { name: string; isDeleted: boolean }[]
): Promise<void> {
  const groceryCheckRepo = getGroceryItemCheckRepository();
  await groceryCheckRepo.setDeletedBatch(items);
  log.info(`✅ Set deleted state for ${items.length} items`);
}

async function setGroceryItemCheckedCore(
  ingredientName: string,
  isChecked: boolean
): Promise<void> {
  const groceryCheckRepo = getGroceryItemCheckRepository();
  await groceryCheckRepo.setChecked(ingredientName, isChecked);
}

async function uncheckAllGroceryItemsCore(): Promise<void> {
  const groceryCheckRepo = getGroceryItemCheckRepository();
  await groceryCheckRepo.uncheckAll();
  log.info("✅ Unchecked all grocery items");
}

async function clearGroceryChecksCore(): Promise<void> {
  const groceryCheckRepo = getGroceryItemCheckRepository();
  await groceryCheckRepo.clearAll();
  log.info("✅ Cleared all grocery checks");
}

// ---------------------------------------------------------------------------
// Shared add-to-plan core
// ---------------------------------------------------------------------------

async function addToPlanCore(
  recipeId: string,
  servings: number,
  date?: Date,
  mealSlot?: string
): Promise<MealPlanItemWithRecipe | null> {
  log.info("📅 Adding recipe to meal plan:", recipeId, "servings:", servings);

  const mealPlanRepo = getMealPlanRepository();

  // Check if already in plan
  const existing = await mealPlanRepo.getByRecipeId(recipeId);

  if (existing) {
    log.info("Recipe already in plan, updating servings");
    await mealPlanRepo.updateServings(recipeId, servings);
  } else {
    const mealPlanItem = await mealPlanRepo.addToPlan({
      recipeId,
      servings,
      date,
      mealSlot,
    });
    log.info("✅ Added to meal plan:", mealPlanItem.id);
  }

  return null; // caller must fetch the result via the appropriate method
}

/**
 * Handles the grocery-item un-deletion after a recipe is added to the plan.
 */
async function restoreGroceryItemsForRecipe(
  result: MealPlanItemWithRecipe | null,
  setDeletedBatch: (items: { name: string; isDeleted: boolean }[]) => Promise<void>
): Promise<void> {
  if (result?.recipe?.ingredients.length) {
    await setDeletedBatch(
      result.recipe.ingredients.map((ingredient) => ({
        name: ingredient.name,
        isDeleted: false,
      }))
    );
  }
}

// ---------------------------------------------------------------------------
// Shared single-item enrichment (throw-based variant)
// ---------------------------------------------------------------------------

async function getMealPlanItemByRecipeIdCore(
  recipeId: string
): Promise<MealPlanItemWithRecipe | null> {
  const mealPlanRepo = getMealPlanRepository();
  const item = await mealPlanRepo.getByRecipeId(recipeId);
  if (!item) return null;

  const recipeData = await fetchRecipeDataForItem(item);
  return buildMealPlanItem(item, recipeData);
}

// ---------------------------------------------------------------------------
// Shared single-item enrichment (Result-based variant)
// ---------------------------------------------------------------------------

async function getMealPlanItemByRecipeIdResultCore(
  recipeId: string
): Promise<MealPlanItemWithRecipe | null> {
  const mealPlanRepo = getMealPlanRepository();
  const item = await mealPlanRepo.getByRecipeId(recipeId);
  if (!item) return null;

  const recipeData = await fetchRecipeDataForItemViaFacade(item);
  return buildMealPlanItem(item, recipeData);
}

// ---------------------------------------------------------------------------
// API object
// ---------------------------------------------------------------------------

/**
 * Pure API functions for meal plan operations
 */
export const mealPlanApi = {
  /**
   * Get all meal plan items with their associated recipes
   */
  async getAllMealPlanItems(): Promise<MealPlanItemWithRecipe[]> {
    return withErrorHandling(
      async () => {
        log.info("🔍 Fetching meal plan items...");

        const mealPlanRepo = getMealPlanRepository();
        const mealPlanItems = await mealPlanRepo.getAllMealPlanItems();
        log.info(`Found ${mealPlanItems.length} raw meal plan items`);

        const result = await enrichMealPlanItemsBatch(mealPlanItems);

        log.info("✅ Fetched meal plan items:", result.length);
        return result;
      },
      "Error fetching meal plan items",
      []
    );
  },

  /**
   * Result-based variant of getAllMealPlanItems.
   */
  async getAllMealPlanItemsResult(): Promise<AppResult<MealPlanItemWithRecipe[], AppError>> {
    return logAndWrapResult(async () => {
      log.info("🔍 Fetching meal plan items...");

      const mealPlanRepo = getMealPlanRepository();
      const mealPlanItems = await mealPlanRepo.getAllMealPlanItems();
      log.info(`Found ${mealPlanItems.length} raw meal plan items`);

      const result = await enrichMealPlanItemsBatch(mealPlanItems);

      log.info("✅ Fetched meal plan items:", result.length);
      return result;
    }, "Error fetching meal plan items");
  },

  /**
   * Add a recipe to the meal plan
   * @param recipeId - The recipe ID to add
   * @param servings - Number of servings
   * @param date - Optional date for calendar meal planning
   * @param mealSlot - Optional meal slot (breakfast, lunch, dinner, snack)
   */
  async addToPlan(
    recipeId: string,
    servings: number,
    date?: Date,
    mealSlot?: string
  ): Promise<MealPlanItemWithRecipe | null> {
    return withErrorLogging(async () => {
      await addToPlanCore(recipeId, servings, date, mealSlot);

      const result = await this.getMealPlanItemByRecipeId(recipeId);
      await restoreGroceryItemsForRecipe(result, (items) =>
        this.setGroceryItemsDeletedBatch(items)
      );
      return result;
    }, "Error adding to meal plan");
  },

  /**
   * Result-based variant of addToPlan.
   */
  async addToPlanResult(
    recipeId: string,
    servings: number
  ): Promise<AppResult<MealPlanItemWithRecipe | null, AppError>> {
    return logAndWrapResult(async () => {
      await addToPlanCore(recipeId, servings);

      const result = await this.getMealPlanItemByRecipeId(recipeId);
      await restoreGroceryItemsForRecipe(result, (items) =>
        this.setGroceryItemsDeletedBatch(items)
      );
      return result;
    }, "Error adding to meal plan");
  },

  /**
   * Get meal plan item by recipe ID
   */
  async getMealPlanItemByRecipeId(recipeId: string): Promise<MealPlanItemWithRecipe | null> {
    return withErrorHandling(
      () => getMealPlanItemByRecipeIdCore(recipeId),
      "Error getting meal plan item",
      null
    );
  },

  /**
   * Result-based variant of getMealPlanItemByRecipeId.
   */
  async getMealPlanItemByRecipeIdResult(
    recipeId: string
  ): Promise<AppResult<MealPlanItemWithRecipe | null, AppError>> {
    return logAndWrapResult(
      () => getMealPlanItemByRecipeIdResultCore(recipeId),
      "Error getting meal plan item"
    );
  },

  /**
   * Check if a recipe is in the meal plan
   */
  async isRecipeInPlan(recipeId: string): Promise<boolean> {
    return withErrorHandling(
      () => isRecipeInPlanCore(recipeId),
      "Error checking if recipe is in plan",
      false
    );
  },

  /**
   * Result-based variant of isRecipeInPlan.
   */
  async isRecipeInPlanResult(recipeId: string): Promise<AppResult<boolean, AppError>> {
    return logAndWrapResult(
      () => isRecipeInPlanCore(recipeId),
      "Error checking if recipe is in plan"
    );
  },

  /**
   * Remove a recipe from the meal plan
   */
  async removeFromPlan(recipeId: string): Promise<boolean> {
    return withErrorLogging(() => removeFromPlanCore(recipeId), "Error removing from meal plan");
  },

  /**
   * Result-based variant of removeFromPlan.
   */
  async removeFromPlanResult(recipeId: string): Promise<AppResult<boolean, AppError>> {
    return logAndWrapResult(() => removeFromPlanCore(recipeId), "Error removing from meal plan");
  },

  /**
   * Update servings for a planned recipe
   */
  async updateServings(recipeId: string, servings: number): Promise<boolean> {
    return withErrorHandling(
      () => updateServingsCore(recipeId, servings),
      "Error updating servings",
      false
    );
  },

  /**
   * Result-based variant of updateServings.
   */
  async updateServingsResult(
    recipeId: string,
    servings: number
  ): Promise<AppResult<boolean, AppError>> {
    return logAndWrapResult(
      () => updateServingsCore(recipeId, servings),
      "Error updating servings"
    );
  },

  /**
   * Clear all planned recipes
   */
  async clearAllPlannedRecipes(): Promise<void> {
    return withErrorHandling(
      () => clearAllPlannedRecipesCore(),
      "Error clearing planned recipes",
      undefined
    );
  },

  /**
   * Result-based variant of clearAllPlannedRecipes.
   */
  async clearAllPlannedRecipesResult(): Promise<AppResult<void, AppError>> {
    return logAndWrapResult(() => clearAllPlannedRecipesCore(), "Error clearing planned recipes");
  },

  /**
   * Get count of planned recipes
   */
  async getPlannedRecipeCount(): Promise<number> {
    return withErrorHandling(
      () => getPlannedRecipeCountCore(),
      "Error getting planned recipe count",
      0
    );
  },

  /**
   * Result-based variant of getPlannedRecipeCount.
   */
  async getPlannedRecipeCountResult(): Promise<AppResult<number, AppError>> {
    return logAndWrapResult(
      () => getPlannedRecipeCountCore(),
      "Error getting planned recipe count"
    );
  },

  // ========================================
  // CALENDAR METHODS
  // ========================================

  /**
   * Get meal plans for a date range
   */
  async getMealPlansForDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<MealPlanItemWithRecipe[]> {
    try {
      log.info("📅 Fetching meal plans for date range:", startDate, "to", endDate);

      const mealPlanRepo = getMealPlanRepository();
      const mealPlanItems = await mealPlanRepo.getByDateRange(startDate, endDate);
      log.info(`Found ${mealPlanItems.length} meal plans in date range`);

      const result = await enrichMealPlanItemsBatch(mealPlanItems, { skipMissing: true });

      log.info("✅ Fetched meal plans for date range:", result.length);
      return result;
    } catch (error) {
      log.error("❌ Error fetching meal plans for date range:", error);
      return [];
    }
  },

  /**
   * Assign a meal plan to a specific date and meal slot
   */
  async assignToDateSlot(
    mealPlanId: string,
    date: Date,
    mealSlot: string
  ): Promise<MealPlanItemWithRecipe | null> {
    try {
      log.info("📅 Assigning meal plan to date slot:", mealPlanId, date, mealSlot);

      const mealPlanRepo = getMealPlanRepository();
      const updated = await mealPlanRepo.updateDateAndSlot(mealPlanId, date, mealSlot);

      if (!updated) {
        log.warn(`Meal plan ${mealPlanId} not found`);
        return null;
      }

      log.info("✅ Assigned meal plan to date slot:", updated.id);

      const recipeDetails = await databaseFacade.getRecipeWithDetails(updated.recipeId);
      let recipeData: MealPlanItemWithRecipe["recipe"] | null = null;

      if (recipeDetails) {
        recipeData = buildRecipeDataFromDetails(recipeDetails);
      }
      if (!recipeData) {
        recipeData = buildUnknownRecipeData(updated.recipeId);
      }

      return buildMealPlanItem(updated, recipeData);
    } catch (error) {
      log.error("❌ Error assigning meal plan to date slot:", error);
      throw error;
    }
  },

  /**
   * Remove a meal plan from a specific date and meal slot
   */
  async removeFromDateSlot(date: Date, mealSlot: string): Promise<boolean> {
    try {
      log.info("🗑️ Removing meal plan from date slot:", date, mealSlot);

      const mealPlanRepo = getMealPlanRepository();
      const mealPlan = await mealPlanRepo.getByDateAndMealSlot(date, mealSlot);

      if (!mealPlan) {
        log.warn(`No meal plan found for date ${date} and slot ${mealSlot}`);
        return false;
      }

      const success = await mealPlanRepo.removeFromPlan(mealPlan.recipeId);
      log.info("✅ Removed meal plan from date slot:", success);
      return success;
    } catch (error) {
      log.error("❌ Error removing meal plan from date slot:", error);
      throw error;
    }
  },

  // ========================================
  // GROCERY ITEM CHECK METHODS
  // ========================================

  /**
   * Get all grocery item attributes (checked, deleted)
   */
  async getGroceryItemAttributes(): Promise<
    Map<string, { isChecked: boolean; isDeleted: boolean }>
  > {
    return withErrorHandling(
      () => getGroceryAttributesCore(),
      "Error getting grocery attributes",
      new Map()
    );
  },

  /**
   * Result-based variant of getGroceryItemAttributes.
   */
  async getGroceryItemAttributesResult(): Promise<
    AppResult<Map<string, { isChecked: boolean; isDeleted: boolean }>, AppError>
  > {
    return logAndWrapResult(() => getGroceryAttributesCore(), "Error getting grocery attributes");
  },

  /**
   * Get all grocery item check states
   * @deprecated Use getGroceryItemAttributes instead
   */
  async getGroceryCheckStates(): Promise<Map<string, boolean>> {
    return withErrorHandling(
      () => getGroceryCheckStatesCore(),
      "Error getting grocery check states",
      new Map()
    );
  },

  /**
   * Result-based variant of getGroceryCheckStates.
   */
  async getGroceryCheckStatesResult(): Promise<AppResult<Map<string, boolean>, AppError>> {
    return logAndWrapResult(
      () => getGroceryCheckStatesCore(),
      "Error getting grocery check states"
    );
  },

  /**
   * Toggle checked state for an ingredient
   */
  async toggleGroceryItemCheck(ingredientName: string): Promise<boolean> {
    return withErrorHandling(
      () => toggleGroceryItemCheckCore(ingredientName),
      "Error toggling grocery item check",
      false
    );
  },

  /**
   * Result-based variant of toggleGroceryItemCheck.
   */
  async toggleGroceryItemCheckResult(
    ingredientName: string
  ): Promise<AppResult<boolean, AppError>> {
    return logAndWrapResult(
      () => toggleGroceryItemCheckCore(ingredientName),
      "Error toggling grocery item check"
    );
  },

  /**
   * Set deleted state for an ingredient
   */
  async setGroceryItemDeleted(ingredientName: string, isDeleted: boolean): Promise<void> {
    return withErrorHandling(
      () => setGroceryItemDeletedCore(ingredientName, isDeleted),
      "Error setting grocery item deleted",
      undefined
    );
  },

  /**
   * Result-based variant of setGroceryItemDeleted.
   */
  async setGroceryItemDeletedResult(
    ingredientName: string,
    isDeleted: boolean
  ): Promise<AppResult<void, AppError>> {
    return logAndWrapResult(
      () => setGroceryItemDeletedCore(ingredientName, isDeleted),
      "Error setting grocery item deleted"
    );
  },

  /**
   * Set deleted state for multiple ingredients
   */
  async setGroceryItemsDeletedBatch(items: { name: string; isDeleted: boolean }[]): Promise<void> {
    return withErrorHandling(
      () => setGroceryItemsDeletedBatchCore(items),
      "Error setting grocery items deleted batch",
      undefined
    );
  },

  /**
   * Result-based variant of setGroceryItemsDeletedBatch.
   */
  async setGroceryItemsDeletedBatchResult(
    items: { name: string; isDeleted: boolean }[]
  ): Promise<AppResult<void, AppError>> {
    return logAndWrapResult(
      () => setGroceryItemsDeletedBatchCore(items),
      "Error setting grocery items deleted batch"
    );
  },

  /**
   * Set checked state for an ingredient
   */
  async setGroceryItemChecked(ingredientName: string, isChecked: boolean): Promise<void> {
    return withErrorHandling(
      () => setGroceryItemCheckedCore(ingredientName, isChecked),
      "Error setting grocery item checked",
      undefined
    );
  },

  /**
   * Result-based variant of setGroceryItemChecked.
   */
  async setGroceryItemCheckedResult(
    ingredientName: string,
    isChecked: boolean
  ): Promise<AppResult<void, AppError>> {
    return logAndWrapResult(
      () => setGroceryItemCheckedCore(ingredientName, isChecked),
      "Error setting grocery item checked"
    );
  },

  /**
   * Clear all checked items (uncheck all)
   */
  async uncheckAllGroceryItems(): Promise<void> {
    return withErrorHandling(
      () => uncheckAllGroceryItemsCore(),
      "Error unchecking all grocery items",
      undefined
    );
  },

  /**
   * Result-based variant of uncheckAllGroceryItems.
   */
  async uncheckAllGroceryItemsResult(): Promise<AppResult<void, AppError>> {
    return logAndWrapResult(
      () => uncheckAllGroceryItemsCore(),
      "Error unchecking all grocery items"
    );
  },

  /**
   * Clear all grocery check records
   */
  async clearGroceryChecks(): Promise<void> {
    return withErrorHandling(
      () => clearGroceryChecksCore(),
      "Error clearing grocery checks",
      undefined
    );
  },

  /**
   * Result-based variant of clearGroceryChecks.
   */
  async clearGroceryChecksResult(): Promise<AppResult<void, AppError>> {
    return logAndWrapResult(() => clearGroceryChecksCore(), "Error clearing grocery checks");
  },
};
