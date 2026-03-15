// @ts-nocheck
import { database } from "~/data/db/database";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import type MealPlan from "~/data/db/models/MealPlan";
import type GroceryItemCheck from "~/data/db/models/GroceryItemCheck";
import type Recipe from "~/data/db/models/Recipe";
import { MealPlanRepository } from "~/data/db/repositories/MealPlanRepository";
import { GroceryItemCheckRepository } from "~/data/db/repositories/GroceryItemCheckRepository";
import { StockRepository } from "~/data/db/repositories/StockRepository"; // Added
import { log } from "~/utils/logger";
import { pantryApi } from "~/data/api/pantryApi";
import { isIngredientMatch } from "~/utils/ingredient-matching";
import { withErrorHandling, withErrorLogging, logAndWrapResult } from "~/utils/api-error-handler";
import type { AppResult } from "~/utils/result";
import type { AppError } from "~/types/AppError";

// Lazy initialization of repositories to avoid timing issues
let _mealPlanRepository: MealPlanRepository | null = null;
let _groceryItemCheckRepository: GroceryItemCheckRepository | null = null;
let _stockRepository: StockRepository | null = null; // Added

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

function getStockRepository(): StockRepository {
  if (!_stockRepository) {
    _stockRepository = new StockRepository();
  }
  return _stockRepository;
}

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

        const itemsWithRecipes: MealPlanItemWithRecipe[] = [];

        for (const item of mealPlanItems) {
          try {
            log.info(
              `Fetching recipe for item ${item.id} with recipeId ${item.recipeId}`
            );
            const recipeDetails = await databaseFacade.getRecipeWithDetails(
              item.recipeId
            );

            let recipeData: MealPlanItemWithRecipe["recipe"];
            if (recipeDetails && recipeDetails.recipe) {
              const { recipe, ingredients } = recipeDetails;
              log.info(`Found recipe ${recipe.id}: ${recipe.title}`);
              recipeData = {
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
            } else {
              log.warn(
                `Recipe missing for meal plan item ${item.id} (recipeId: ${item.recipeId})`
              );
              recipeData = {
                id: item.recipeId,
                title: "Unknown Recipe",
                imageUrl: "",
                servings: 0,
                ingredients: [],
              };
            }

            const date =
              item.date instanceof Date
                ? item.date
                : new Date(
                    (item as unknown as { date?: number }).date ?? Date.now()
                  );
            const mealSlot = item.mealSlot ?? "dinner";

            itemsWithRecipes.push({
              id: item.id,
              recipeId: item.recipeId,
              servings: item.servings,
              date,
              mealSlot,
              templateId: item.templateId,
              createdAt: item.createdAt,
              recipe: recipeData,
            });
          } catch (error) {
            log.error(
              "Error fetching recipe for meal plan item:",
              item.id,
              error
            );
            // Continue with other items
          }
        }

        log.info("✅ Fetched meal plan items:", itemsWithRecipes.length);
        return itemsWithRecipes;
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

      const itemsWithRecipes: MealPlanItemWithRecipe[] = [];

      for (const item of mealPlanItems) {
        try {
          log.info(
            `Fetching recipe for item ${item.id} with recipeId ${item.recipeId}`
          );
          const recipeDetails = await databaseFacade.getRecipeWithDetails(
            item.recipeId
          );

          let recipeData: MealPlanItemWithRecipe["recipe"];
          if (recipeDetails && recipeDetails.recipe) {
            const { recipe, ingredients } = recipeDetails;
            log.info(`Found recipe ${recipe.id}: ${recipe.title}`);
            recipeData = {
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
          } else {
            recipeData = {
              id: item.recipeId,
              title: "Unknown Recipe",
              imageUrl: "",
              servings: 0,
              ingredients: [],
            };
          }

          const date =
            item.date instanceof Date
              ? item.date
              : new Date(
                  (item as unknown as { date?: number }).date ?? Date.now()
                );
          const mealSlot = item.mealSlot ?? "dinner";

          itemsWithRecipes.push({
            id: item.id,
            recipeId: item.recipeId,
            servings: item.servings,
            date,
            mealSlot,
            templateId: item.templateId,
            createdAt: item.createdAt,
            recipe: recipeData,
          });
        } catch (error) {
          log.error(
            "Error fetching recipe for meal plan item:",
            item.id,
            error
          );
        }
      }

      log.info("✅ Fetched meal plan items:", itemsWithRecipes.length);
      return itemsWithRecipes;
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
      log.info("📅 Adding recipe to meal plan:", recipeId, "servings:", servings);

      const mealPlanRepo = getMealPlanRepository();

      // Check if already in plan
      const existing = await mealPlanRepo.getByRecipeId(recipeId);

      // Perform write operation using database.write for the meal plan part
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

      // 2. Fetch recipe data (Read)
      const result = await this.getMealPlanItemByRecipeId(recipeId);

      // Post-processing: Check against pantry and mark existing items as deleted
      if (result && result.recipe && result.recipe.ingredients) {
        try {
          // Optimization: Use efficient query method instead of full pantry fetch
          const stockRepo = getStockRepository();
          const stockItems = await stockRepo.getAllWithSynonyms();

          const itemsToHide: { name: string; isDeleted: boolean }[] = [];

          for (const ingredient of result.recipe.ingredients) {
            const baseServings = result.recipe.servings || 1;
            const neededQuantity = (ingredient.quantity / baseServings) * result.servings;

            const matchingStock = stockItems.find((p) =>
              isIngredientMatch(p.name, ingredient.name, p.synonyms)
            );

            if (matchingStock) {
              // Check if we have enough
              if (matchingStock.quantity >= neededQuantity) {
                itemsToHide.push({ name: ingredient.name, isDeleted: true });
              }
            }
          }

          // Execute batch write if needed
          if (itemsToHide.length > 0) {
            await this.setGroceryItemsDeletedBatch(itemsToHide);
          }
        } catch (err) {
          log.warn("⚠️ Failed to auto-hide pantry items:", err);
        }
      }

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
      log.info("📅 Adding recipe to meal plan:", recipeId, "servings:", servings);

      const mealPlanRepo = getMealPlanRepository();

      const existing = await mealPlanRepo.getByRecipeId(recipeId);

      if (existing) {
        log.info("Recipe already in plan, updating servings");
        await mealPlanRepo.updateServings(recipeId, servings);
      } else {
        const mealPlanItem = await mealPlanRepo.addToPlan({
          recipeId,
          servings,
        });
        log.info("✅ Added to meal plan:", mealPlanItem.id);
      }

      const result = await this.getMealPlanItemByRecipeId(recipeId);

      if (result && result.recipe && result.recipe.ingredients) {
        try {
          const stockRepo = getStockRepository();
          const stockItems = await stockRepo.getAllWithSynonyms();

          const itemsToHide: { name: string; isDeleted: boolean }[] = [];

          for (const ingredient of result.recipe.ingredients) {
            const baseServings = result.recipe.servings || 1;
            const neededQuantity = (ingredient.quantity / baseServings) * result.servings;

            const matchingStock = stockItems.find((p) =>
              isIngredientMatch(p.name, ingredient.name, p.synonyms)
            );

            if (matchingStock && matchingStock.quantity >= neededQuantity) {
              itemsToHide.push({ name: ingredient.name, isDeleted: true });
            }
          }

          if (itemsToHide.length > 0) {
            await this.setGroceryItemsDeletedBatch(itemsToHide);
          }
        } catch (err) {
          log.warn("⚠️ Failed to auto-hide pantry items:", err);
        }
      }

      return result;
    }, "Error adding to meal plan");
  },

  /**
   * Get meal plan item by recipe ID
   */
  async getMealPlanItemByRecipeId(recipeId: string): Promise<MealPlanItemWithRecipe | null> {
    return withErrorHandling(
      async () => {
        const mealPlanRepo = getMealPlanRepository();
        const item = await mealPlanRepo.getByRecipeId(recipeId);
        if (!item) return null;

        // Guard relation: item.recipe can be undefined if the model lost its prototype (e.g. bridge)
        let recipe: Recipe | null | undefined = null;
        if (item.recipe != null && typeof (item.recipe as { fetch?: () => Promise<Recipe | undefined> }).fetch === "function") {
          recipe = await (item.recipe as { fetch: () => Promise<Recipe | undefined> }).fetch();
        }

        let recipeData = null;
        if (recipe) {
          const ingredients =
            recipe.ingredients != null && typeof recipe.ingredients.query === "function"
              ? await recipe.ingredients.query().fetch()
              : [];
          recipeData = {
            id: recipe.id,
            title: recipe.title,
            imageUrl: recipe.imageUrl || "",
            servings: recipe.servings,
            ingredients: ingredients.map(
              (ing: { name: string; quantity: number; unit: string }) => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
              })
            ),
          };
        } else {
          const recipeDetails = await databaseFacade.getRecipeWithDetails(item.recipeId);
          if (recipeDetails) {
            const { recipe: detailedRecipe, ingredients } = recipeDetails;
            recipeData = {
              id: detailedRecipe.id,
              title: detailedRecipe.title,
              imageUrl: detailedRecipe.imageUrl || "",
              servings: detailedRecipe.servings,
              ingredients: ingredients.map((ing) => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
              })),
            };
          }
        }

        const date = item.date instanceof Date ? item.date : new Date((item as unknown as { date?: number }).date ?? Date.now());
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
      },
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
    return logAndWrapResult(async () => {
      const mealPlanRepo = getMealPlanRepository();
      const item = await mealPlanRepo.getByRecipeId(recipeId);
      if (!item) return null;

      let recipeData = null;
      if (item.recipe != null && typeof (item.recipe as { fetch?: () => Promise<Recipe | undefined> }).fetch === "function") {
        const recipe = await (item.recipe as { fetch: () => Promise<Recipe | undefined> }).fetch();
        if (recipe) {
          const recipeDetails = await databaseFacade.getRecipeWithDetails(recipe.id);
          if (recipeDetails) {
            recipeData = {
              id: recipe.id,
              title: recipe.title,
              imageUrl: recipe.imageUrl || "",
              servings: recipe.servings,
              ingredients: recipeDetails.ingredients.map((ing: { name: string; quantity: number; unit: string }) => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
              })),
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
      if (!recipeData) {
        const recipeDetails = await databaseFacade.getRecipeWithDetails(item.recipeId);
        if (recipeDetails) {
          const { recipe, ingredients } = recipeDetails;
          recipeData = {
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
      }

      const date = item.date instanceof Date ? item.date : new Date((item as unknown as { date?: number }).date ?? Date.now());
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
    }, "Error getting meal plan item");
  },

  /**
   * Check if a recipe is in the meal plan
   */
  async isRecipeInPlan(recipeId: string): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const mealPlanRepo = getMealPlanRepository();
        return await mealPlanRepo.isRecipeInPlan(recipeId);
      },
      "Error checking if recipe is in plan",
      false
    );
  },

  /**
   * Result-based variant of isRecipeInPlan.
   */
  async isRecipeInPlanResult(recipeId: string): Promise<AppResult<boolean, AppError>> {
    return logAndWrapResult(async () => {
      const mealPlanRepo = getMealPlanRepository();
      return await mealPlanRepo.isRecipeInPlan(recipeId);
    }, "Error checking if recipe is in plan");
  },

  /**
   * Remove a recipe from the meal plan
   */
  async removeFromPlan(recipeId: string): Promise<boolean> {
    return withErrorLogging(async () => {
      log.info("🗑️ Removing recipe from meal plan:", recipeId);

      const mealPlanRepo = getMealPlanRepository();
      const success = await mealPlanRepo.removeFromPlan(recipeId);
      log.info("✅ Removed from meal plan:", success);
      return success;
    }, "Error removing from meal plan");
  },

  /**
   * Result-based variant of removeFromPlan.
   */
  async removeFromPlanResult(recipeId: string): Promise<AppResult<boolean, AppError>> {
    return logAndWrapResult(async () => {
      log.info("🗑️ Removing recipe from meal plan:", recipeId);

      const mealPlanRepo = getMealPlanRepository();
      const success = await mealPlanRepo.removeFromPlan(recipeId);
      log.info("✅ Removed from meal plan:", success);
      return success;
    }, "Error removing from meal plan");
  },

  /**
   * Update servings for a planned recipe
   */
  async updateServings(recipeId: string, servings: number): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const mealPlanRepo = getMealPlanRepository();
        const updated = await mealPlanRepo.updateServings(recipeId, servings);
        return updated !== null;
      },
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
    return logAndWrapResult(async () => {
      const mealPlanRepo = getMealPlanRepository();
      const updated = await mealPlanRepo.updateServings(recipeId, servings);
      return updated !== null;
    }, "Error updating servings");
  },

  /**
   * Clear all planned recipes
   */
  async clearAllPlannedRecipes(): Promise<void> {
    return withErrorHandling(
      async () => {
        const mealPlanRepo = getMealPlanRepository();
        await mealPlanRepo.clearAllPlannedRecipes();
        log.info("✅ Cleared all planned recipes");
      },
      "Error clearing planned recipes",
      undefined
    );
  },

  /**
   * Result-based variant of clearAllPlannedRecipes.
   */
  async clearAllPlannedRecipesResult(): Promise<AppResult<void, AppError>> {
    return logAndWrapResult(async () => {
      const mealPlanRepo = getMealPlanRepository();
      await mealPlanRepo.clearAllPlannedRecipes();
      log.info("✅ Cleared all planned recipes");
    }, "Error clearing planned recipes");
  },

  /**
   * Get count of planned recipes
   */
  async getPlannedRecipeCount(): Promise<number> {
    return withErrorHandling(
      async () => {
        const mealPlanRepo = getMealPlanRepository();
        return await mealPlanRepo.getPlannedRecipeCount();
      },
      "Error getting planned recipe count",
      0
    );
  },

  /**
   * Result-based variant of getPlannedRecipeCount.
   */
  async getPlannedRecipeCountResult(): Promise<AppResult<number, AppError>> {
    return logAndWrapResult(async () => {
      const mealPlanRepo = getMealPlanRepository();
      return await mealPlanRepo.getPlannedRecipeCount();
    }, "Error getting planned recipe count");
  },

  // ========================================
  // CALENDAR METHODS
  // ========================================

  /**
   * Get meal plans for a date range
   */
  async getMealPlansForDateRange(startDate: Date, endDate: Date): Promise<MealPlanItemWithRecipe[]> {
    try {
      log.info("📅 Fetching meal plans for date range:", startDate, "to", endDate);

      const mealPlanRepo = getMealPlanRepository();
      const mealPlanItems = await mealPlanRepo.getByDateRange(startDate, endDate);
      log.info(`Found ${mealPlanItems.length} meal plans in date range`);

      const itemsWithRecipes: MealPlanItemWithRecipe[] = [];

      for (const item of mealPlanItems) {
        try {
          const recipeDetails = await databaseFacade.getRecipeWithDetails(item.recipeId);
          if (!recipeDetails) {
            log.warn(`Recipe not found for meal plan item ${item.id}`);
            continue;
          }

          const { recipe, ingredients } = recipeDetails;

          const recipeData = {
            id: recipe.id,
            title: recipe.title,
            imageUrl: recipe.imageUrl || "",
            servings: recipe.servings,
            ingredients: ingredients.map((ing: any) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
            })),
          };

          const date = item.date instanceof Date ? item.date : new Date((item as unknown as { date?: number }).date ?? Date.now());
          const mealSlot = item.mealSlot ?? "dinner";

          itemsWithRecipes.push({
            id: item.id,
            recipeId: item.recipeId,
            servings: item.servings,
            date,
            mealSlot,
            templateId: item.templateId,
            createdAt: item.createdAt,
            recipe: recipeData,
          });
        } catch (error) {
          log.error("Error fetching recipe for meal plan item:", item.id, error);
        }
      }

      log.info("✅ Fetched meal plans for date range:", itemsWithRecipes.length);
      return itemsWithRecipes;
    } catch (error) {
      log.error("❌ Error fetching meal plans for date range:", error);
      return [];
    }
  },

  /**
   * Assign a meal plan to a specific date and meal slot
   */
  async assignToDateSlot(mealPlanId: string, date: Date, mealSlot: string): Promise<MealPlanItemWithRecipe | null> {
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
        recipeData = {
          id: recipeDetails.recipe.id,
          title: recipeDetails.recipe.title,
          imageUrl: recipeDetails.recipe.imageUrl || "",
          servings: recipeDetails.recipe.servings,
          ingredients: recipeDetails.ingredients.map((ing: any) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        };
      }
      if (!recipeData) {
        recipeData = {
          id: updated.recipeId,
          title: "Unknown Recipe",
          imageUrl: "",
          servings: 0,
          ingredients: [],
        };
      }

      const newDate = updated.date instanceof Date ? updated.date : new Date((updated as unknown as { date?: number }).date ?? Date.now());
      const newMealSlot = updated.mealSlot ?? "dinner";

      return {
        id: updated.id,
        recipeId: updated.recipeId,
        servings: updated.servings,
        date,
        mealSlot,
        templateId: updated.templateId,
        createdAt: updated.createdAt,
        recipe: recipeData,
      };
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
      async () => {
        const groceryCheckRepo = getGroceryItemCheckRepository();
        return await groceryCheckRepo.getCheckAttributesMap();
      },
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
    return logAndWrapResult(async () => {
      const groceryCheckRepo = getGroceryItemCheckRepository();
      return await groceryCheckRepo.getCheckAttributesMap();
    }, "Error getting grocery attributes");
  },

  /**
   * Get all grocery item check states
   * @deprecated Use getGroceryItemAttributes instead
   */
  async getGroceryCheckStates(): Promise<Map<string, boolean>> {
    return withErrorHandling(
      async () => {
        const groceryCheckRepo = getGroceryItemCheckRepository();
        return await groceryCheckRepo.getCheckStatesMap();
      },
      "Error getting grocery check states",
      new Map()
    );
  },

  /**
   * Result-based variant of getGroceryCheckStates.
   */
  async getGroceryCheckStatesResult(): Promise<AppResult<Map<string, boolean>, AppError>> {
    return logAndWrapResult(async () => {
      const groceryCheckRepo = getGroceryItemCheckRepository();
      return await groceryCheckRepo.getCheckStatesMap();
    }, "Error getting grocery check states");
  },

  /**
   * Toggle checked state for an ingredient
   */
  async toggleGroceryItemCheck(ingredientName: string): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const groceryCheckRepo = getGroceryItemCheckRepository();
        return await groceryCheckRepo.toggleChecked(ingredientName);
      },
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
    return logAndWrapResult(async () => {
      const groceryCheckRepo = getGroceryItemCheckRepository();
      return await groceryCheckRepo.toggleChecked(ingredientName);
    }, "Error toggling grocery item check");
  },

  /**
   * Set deleted state for an ingredient
   */
  async setGroceryItemDeleted(ingredientName: string, isDeleted: boolean): Promise<void> {
    return withErrorHandling(
      async () => {
        const groceryCheckRepo = getGroceryItemCheckRepository();
        await groceryCheckRepo.setDeleted(ingredientName, isDeleted);
        log.info(`✅ Set deleted state for ${ingredientName} to ${isDeleted}`);
      },
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
    return logAndWrapResult(async () => {
      const groceryCheckRepo = getGroceryItemCheckRepository();
      await groceryCheckRepo.setDeleted(ingredientName, isDeleted);
      log.info(`✅ Set deleted state for ${ingredientName} to ${isDeleted}`);
    }, "Error setting grocery item deleted");
  },

  /**
   * Set deleted state for multiple ingredients
   */
  async setGroceryItemsDeletedBatch(items: { name: string; isDeleted: boolean }[]): Promise<void> {
    return withErrorHandling(
      async () => {
        const groceryCheckRepo = getGroceryItemCheckRepository();
        await groceryCheckRepo.setDeletedBatch(items);
        log.info(`✅ Set deleted state for ${items.length} items`);
      },
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
    return logAndWrapResult(async () => {
      const groceryCheckRepo = getGroceryItemCheckRepository();
      await groceryCheckRepo.setDeletedBatch(items);
      log.info(`✅ Set deleted state for ${items.length} items`);
    }, "Error setting grocery items deleted batch");
  },

  /**
   * Set checked state for an ingredient
   */
  async setGroceryItemChecked(ingredientName: string, isChecked: boolean): Promise<void> {
    return withErrorHandling(
      async () => {
        const groceryCheckRepo = getGroceryItemCheckRepository();
        await groceryCheckRepo.setChecked(ingredientName, isChecked);
      },
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
    return logAndWrapResult(async () => {
      const groceryCheckRepo = getGroceryItemCheckRepository();
      await groceryCheckRepo.setChecked(ingredientName, isChecked);
    }, "Error setting grocery item checked");
  },

  /**
   * Clear all checked items (uncheck all)
   */
  async uncheckAllGroceryItems(): Promise<void> {
    return withErrorHandling(
      async () => {
        const groceryCheckRepo = getGroceryItemCheckRepository();
        await groceryCheckRepo.uncheckAll();
        log.info("✅ Unchecked all grocery items");
      },
      "Error unchecking all grocery items",
      undefined
    );
  },

  /**
   * Result-based variant of uncheckAllGroceryItems.
   */
  async uncheckAllGroceryItemsResult(): Promise<AppResult<void, AppError>> {
    return logAndWrapResult(async () => {
      const groceryCheckRepo = getGroceryItemCheckRepository();
      await groceryCheckRepo.uncheckAll();
      log.info("✅ Unchecked all grocery items");
    }, "Error unchecking all grocery items");
  },

  /**
   * Clear all grocery check records
   */
  async clearGroceryChecks(): Promise<void> {
    return withErrorHandling(
      async () => {
        const groceryCheckRepo = getGroceryItemCheckRepository();
        await groceryCheckRepo.clearAll();
        log.info("✅ Cleared all grocery checks");
      },
      "Error clearing grocery checks",
      undefined
    );
  },

  /**
   * Result-based variant of clearGroceryChecks.
   */
  async clearGroceryChecksResult(): Promise<AppResult<void, AppError>> {
    return logAndWrapResult(async () => {
      const groceryCheckRepo = getGroceryItemCheckRepository();
      await groceryCheckRepo.clearAll();
      log.info("✅ Cleared all grocery checks");
    }, "Error clearing grocery checks");
  },
};
