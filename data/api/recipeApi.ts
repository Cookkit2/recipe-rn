import {
  databaseFacade,
  type AvailableRecipesResult,
  type RecipeWithDetails,
} from "~/data/db/DatabaseFacade";
import type { Recipe as DbRecipe } from "~/data/db/models";
import { RecipeType } from "~/data/db/models/Recipe";
import type { Recipe } from "~/types/Recipe";
import { getRecipeMatchCategory } from "~/types/RecipeMatching";
import { storage } from "~/data";
import {
  PREF_DIET_KEY,
  PREF_ALLERGENS_KEY,
  PREF_OTHER_ALLERGENS_KEY,
  PREF_APPLIANCES_KEY,
} from "~/constants/storage-keys";
import type { Allergen } from "~/types/Allergen";
import type { Diet } from "~/types/Diet";
import type { PantryItem } from "~/types/PantryItem";
import { log } from "~/utils/logger";
import { generateGeminiContent } from "~/utils/gemini-api";
import { SYSTEM_PROMPT } from "~/lib/tailored-recipe/systemPrompt";
import {
  buildPantryHash,
  buildTailoredPrompt,
  parseTailoredRecipeResponse,
  convertDbTailoredRecipeToUIRecipe,
} from "~/lib/tailored-recipe/helpers";
import { convertDbRecipesToUIRecipesBatch } from "./recipe-conversion";
import {
  type RecipeRankingStrategy,
  type RankingContext,
  type RecipeFilterStrategy,
  type FilterContext,
  type CookingHistoryData,
  createHistoryAwareRankingStrategy,
  CompositeFilterStrategy,
  CategoryFilter,
  DietaryFilter,
  ExpiringIngredientsRankingStrategy,
} from "~/hooks/recommendation";
import {
  withErrorHandling,
  withErrorLogging,
  withSilentError,
  logAndWrapResult,
  wrapResult,
} from "~/utils/api-error-handler";
import type { AppResult } from "~/utils/result";
import type { AppError } from "~/types/AppError";

/**
 * Pure API functions for recipe operations
 * These functions only handle database interactions and data transformation
 */
export const recipeApi = {
  /**
   * Fetch all recipes from database
   */
  async fetchAllRecipes(): Promise<Recipe[]> {
    return withErrorLogging(async () => {
      if (!databaseFacade) {
        throw new Error("DatabaseFacade is undefined - import failed");
      }

      // Run health check
      const isHealthy = await databaseFacade.isHealthy();
      if (!isHealthy) {
        throw new Error("Database health check failed");
      }

      const dbRecipes = await databaseFacade.getAllRecipes();

      // Use batch query to get all recipe details in one call
      const recipeIds = dbRecipes.map((r) => r.id);
      const recipeDetailsMap = await databaseFacade.getRecipesWithDetails(recipeIds);

      // Use batch conversion to avoid N+1 queries
      const uiRecipes = convertDbRecipesToUIRecipesBatch(dbRecipes, recipeDetailsMap);

      return uiRecipes;
    }, "Error fetching all recipes");
  },

  /**
   * Result-based variant of fetchAllRecipes (does not throw).
   */
  async fetchAllRecipesResult(): Promise<AppResult<Recipe[], AppError>> {
    return logAndWrapResult(async () => {
      if (!databaseFacade) {
        throw new Error("DatabaseFacade is undefined - import failed");
      }

      const isHealthy = await databaseFacade.isHealthy();
      if (!isHealthy) {
        throw new Error("Database health check failed");
      }

      const dbRecipes = await databaseFacade.getAllRecipes();
      const uiRecipes = await Promise.all(dbRecipes.map(convertDbRecipeToUIRecipe));

      return uiRecipes;
    }, "Error fetching all recipes");
  },

  /**
   * Get a single recipe by ID
   */
  async getRecipeById(id: string): Promise<Recipe | null> {
    return withErrorHandling(
      async () => {
        const dbRecipe = await databaseFacade.getRecipeById(id);
        if (!dbRecipe) return null;

        const recipe = await convertDbRecipeToUIRecipe(dbRecipe);

        log.info("Found recipe in DB:", recipe.ingredients);

        return recipe;
      },
      "Error getting recipe by id",
      null
    );
  },

  /**
   * Result-based variant of getRecipeById.
   */
  async getRecipeByIdResult(id: string): Promise<AppResult<Recipe | null, AppError>> {
    return logAndWrapResult(async () => {
      const dbRecipe = await databaseFacade.getRecipeById(id);
      if (!dbRecipe) return null;

      const recipe = await convertDbRecipeToUIRecipe(dbRecipe);

      log.info("Found recipe in DB:", recipe.ingredients);

      return recipe;
    }, "Error getting recipe by id");
  },

  /**
   * Search recipes with filters
   */
  async searchRecipes(
    searchTerm: string,
    filters?: {
      tags?: string[];
      maxPrepTime?: number;
      maxCookTime?: number;
      minTotalTime?: number;
      maxTotalTime?: number;
      difficulty?: number;
    }
  ): Promise<Recipe[]> {
    return withErrorHandling(
      async () => {
        const dbRecipes = await databaseFacade.searchRecipes(searchTerm, {
          tags: filters?.tags,
          maxPrepTime: filters?.maxPrepTime,
          maxCookTime: filters?.maxCookTime,
          minTotalTime: filters?.minTotalTime,
          maxTotalTime: filters?.maxTotalTime,
          difficulty: filters?.difficulty,
        });

        // Use batch query to get all recipe details in one call
        const recipeIds = dbRecipes.map((r) => r.id);
        const recipeDetailsMap = await databaseFacade.getRecipesWithDetails(recipeIds);

        // Use batch conversion to avoid N+1 queries
        return convertDbRecipesToUIRecipesBatch(dbRecipes, recipeDetailsMap);
      },
      "Error searching recipes",
      []
    );
  },

  /**
   * Result-based variant of searchRecipes.
   */
  async searchRecipesResult(
    searchTerm: string,
    filters?: {
      tags?: string[];
      maxPrepTime?: number;
      maxCookTime?: number;
      minTotalTime?: number;
      maxTotalTime?: number;
      difficulty?: number;
    }
  ): Promise<AppResult<Recipe[], AppError>> {
    return logAndWrapResult(async () => {
      const dbRecipes = await databaseFacade.searchRecipes(searchTerm, {
        tags: filters?.tags,
        maxPrepTime: filters?.maxPrepTime,
        maxCookTime: filters?.maxCookTime,
        minTotalTime: filters?.minTotalTime,
        maxTotalTime: filters?.maxTotalTime,
        difficulty: filters?.difficulty,
      });

      return await Promise.all(dbRecipes.map(convertDbRecipeToUIRecipe));
    }, "Error searching recipes");
  },

  /**
   * Add a new recipe
   */
  async addRecipe(recipe: Omit<Recipe, "id">): Promise<Recipe> {
    return withErrorLogging(async () => {
      await databaseFacade.createRecipe({
        title: recipe.title,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        prepMinutes: recipe.prepMinutes || 0,
        cookMinutes: recipe.cookMinutes || 0,
        difficultyStars: recipe.difficultyStars || 1,
        servings: recipe.servings || 1,
        sourceUrl: recipe.sourceUrl,
        calories: recipe.calories,
        tags: recipe.tags,
        type: RecipeType.STANDARD,
        steps: recipe.instructions.map((step) => ({
          step: step.step,
          title: step.title,
          description: step.description,
        })),
        ingredients: recipe.ingredients.map((ing) => ({
          baseIngredientId: ing.relatedIngredientId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        })),
      });

      // Return the updated recipes list to get the new recipe with ID
      const allRecipes = await this.fetchAllRecipes();
      const newRecipe = allRecipes.find((r) => r.title === recipe.title);

      if (!newRecipe) {
        throw new Error("Failed to retrieve newly created recipe");
      }

      return newRecipe;
    }, "Error adding recipe");
  },

  /**
   * Result-based variant of addRecipe.
   */
  async addRecipeResult(recipe: Omit<Recipe, "id">): Promise<AppResult<Recipe, AppError>> {
    return logAndWrapResult(async () => {
      await databaseFacade.createRecipe({
        title: recipe.title,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        prepMinutes: recipe.prepMinutes || 0,
        cookMinutes: recipe.cookMinutes || 0,
        difficultyStars: recipe.difficultyStars || 1,
        servings: recipe.servings || 1,
        sourceUrl: recipe.sourceUrl,
        calories: recipe.calories,
        tags: recipe.tags,
        type: RecipeType.STANDARD,
        steps: recipe.instructions.map((step) => ({
          step: step.step,
          title: step.title,
          description: step.description,
        })),
        ingredients: recipe.ingredients.map((ing) => ({
          baseIngredientId: ing.relatedIngredientId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        })),
      });

      const allRecipes = await this.fetchAllRecipes();
      const newRecipe = allRecipes.find((r) => r.title === recipe.title);

      if (!newRecipe) {
        throw new Error("Failed to retrieve newly created recipe");
      }

      return newRecipe;
    }, "Error adding recipe");
  },

  /**
   * Update an existing recipe
   */
  async updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    return withErrorLogging(async () => {
      const dbRecipe = await databaseFacade.getRecipeById(id);
      if (!dbRecipe) {
        throw new Error("Recipe not found");
      }

      await dbRecipe.updateRecipe({
        title: updates.title,
        description: updates.description,
        imageUrl: updates.imageUrl,
        prepMinutes: updates.prepMinutes,
        cookMinutes: updates.cookMinutes,
        difficultyStars: updates.difficultyStars,
        servings: updates.servings,
        sourceUrl: updates.sourceUrl,
        calories: updates.calories,
        tags: updates.tags,
      });

      // Fetch the updated recipe
      const updatedRecipe = await this.getRecipeById(id);
      if (!updatedRecipe) {
        throw new Error("Failed to fetch updated recipe");
      }

      return updatedRecipe;
    }, "Error updating recipe");
  },

  /**
   * Result-based variant of updateRecipe.
   */
  async updateRecipeResult(
    id: string,
    updates: Partial<Recipe>
  ): Promise<AppResult<Recipe, AppError>> {
    return logAndWrapResult(async () => {
      const dbRecipe = await databaseFacade.getRecipeById(id);
      if (!dbRecipe) {
        throw new Error("Recipe not found");
      }

      await dbRecipe.updateRecipe({
        title: updates.title,
        description: updates.description,
        imageUrl: updates.imageUrl,
        prepMinutes: updates.prepMinutes,
        cookMinutes: updates.cookMinutes,
        difficultyStars: updates.difficultyStars,
        servings: updates.servings,
        sourceUrl: updates.sourceUrl,
        calories: updates.calories,
        tags: updates.tags,
      });

      const updatedRecipe = await this.getRecipeById(id);
      if (!updatedRecipe) {
        throw new Error("Failed to fetch updated recipe");
      }

      return updatedRecipe;
    }, "Error updating recipe");
  },

  /**
   * Delete a recipe
   */
  async deleteRecipe(id: string): Promise<void> {
    return withErrorLogging(async () => {
      await databaseFacade.deleteRecipe(id);
    }, "Error deleting recipe");
  },

  /**
   * Result-based variant of deleteRecipe.
   */
  async deleteRecipeResult(id: string): Promise<AppResult<void, AppError>> {
    return logAndWrapResult(async () => {
      await databaseFacade.deleteRecipe(id);
    }, "Error deleting recipe");
  },

  /**
   * Get recipes that can be made with current pantry items
   */
  async getAvailableRecipes(): Promise<{
    canMake: Recipe[];
    partiallyCanMake: Array<{ recipe: Recipe; completionPercentage: number }>;
  }> {
    return withSilentError(
      async () => {
        const availability = await databaseFacade.getAvailableRecipes();

        const canMake = await Promise.all(availability.canMake.map(convertDbRecipeToUIRecipe));

        const partiallyCanMake = await Promise.all(
          availability.partiallyCanMake.map(async (item) => {
            return {
              recipe: await convertDbRecipeToUIRecipe(item.recipe),
              completionPercentage: item.completionPercentage,
            };
          })
        );

        return { canMake, partiallyCanMake };
      },
      { canMake: [], partiallyCanMake: [] }
    );
  },

  /**
   * Result-based variant of getAvailableRecipes (no logging on error).
   */
  async getAvailableRecipesResult(): Promise<
    AppResult<
      {
        canMake: Recipe[];
        partiallyCanMake: Array<{ recipe: Recipe; completionPercentage: number }>;
      },
      AppError
    >
  > {
    return wrapResult(async () => {
      const availability = await databaseFacade.getAvailableRecipes();

      // Collect all recipe IDs for batch query
      const canMakeIds = availability.canMake.map((r) => r.id);
      const partiallyMakeIds = availability.partiallyCanMake.map((item) => item.recipe.id);
      const allRecipeIds = [...canMakeIds, ...partiallyMakeIds];

      // Fetch all recipe details in a single batch call to avoid N+1 queries
      const recipeDetailsMap = await databaseFacade.getRecipesWithDetails(allRecipeIds);

      // Convert canMake recipes using batch approach
      const canMake = convertDbRecipesToUIRecipesBatch(availability.canMake, recipeDetailsMap);

      // Convert partiallyCanMake recipes using batch approach
      const partiallyCanMake = availability.partiallyCanMake
        .map((item) => {
          const uiRecipes = convertDbRecipesToUIRecipesBatch([item.recipe], recipeDetailsMap);
          if (uiRecipes.length === 0) {
            return null;
          }
          return {
            recipe: uiRecipes[0],
            completionPercentage: item.completionPercentage,
          };
        })
        .filter((item): item is { recipe: Recipe; completionPercentage: number } => item !== null);

      return { canMake, partiallyCanMake };
    });
  },

  /**
   * Get shopping list for a recipe
   */
  async getShoppingListForRecipe(recipeId: string): Promise<{
    missingIngredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      notes?: string;
    }>;
    availableIngredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      stockQuantity: number;
      stockUnit: string;
    }>;
  }> {
    return withSilentError(
      async () => {
        return await databaseFacade.getShoppingListForRecipe(recipeId);
      },
      { missingIngredients: [], availableIngredients: [] }
    );
  },

  /**
   * Result-based variant of getShoppingListForRecipe (no logging on error).
   */
  async getShoppingListForRecipeResult(recipeId: string): Promise<
    AppResult<
      {
        missingIngredients: Array<{
          name: string;
          quantity: number;
          unit: string;
          notes?: string;
        }>;
        availableIngredients: Array<{
          name: string;
          quantity: number;
          unit: string;
          stockQuantity: number;
          stockUnit: string;
        }>;
      },
      AppError
    >
  > {
    return wrapResult(async () => {
      return await databaseFacade.getShoppingListForRecipe(recipeId);
    });
  },

  /**
   * Get smart recipe recommendations based on pantry availability
   *
   * Fetches all recipes, applies filtering and ranking strategies,
   * and returns a unified list with completion percentages.
   *
   * @param options.filterStrategy - Custom filter strategy (e.g., DietaryFilter)
   * @param options.rankingStrategy - Custom ranking strategy
   */
  async getRecipeRecommendations(options?: {
    /** Maximum recommendations to return */
    maxRecommendations?: number;
    /** Filter by recipe tags/categories */
    categories?: string[];
    /** Custom filter strategy to apply (e.g., DietaryFilter, CategoryFilter) */
    filterStrategy?: RecipeFilterStrategy;
    /** Custom ranking strategy (defaults to createHistoryAwareRankingStrategy()) */
    rankingStrategy?: RecipeRankingStrategy;
    /** Pre-built ranking context (for strategies that need external data like cooking history) */
    rankingContext?: RankingContext;
    /** Pre-fetched availability data (optional - if provided, skips database call) */
    preFetchedAvailability?: AvailableRecipesResult;
    /** Pre-fetched cooking history data (optional - if provided, skips database call) */
    preFetchedCookingHistory?: CookingHistoryData;
  }): Promise<{
    /** Unified list of recipes with completion percentages, filtered and ranked */
    recipes: Array<{ recipe: Recipe; completionPercentage: number }>;
  }> {
    return withSilentError(
      async () => {
        const {
          maxRecommendations,
          categories,
          filterStrategy: providedStrategy,
          rankingStrategy = createHistoryAwareRankingStrategy(),
          rankingContext,
        } = options || {};

        // Ensure categories are filtered if provided
        let filterStrategy = providedStrategy;

        if (categories && categories.length > 0) {
          const categoryFilter = new CategoryFilter({ categories });

          if (filterStrategy) {
            // Combine provided strategy with category filter
            filterStrategy = new CompositeFilterStrategy()
              .addFilter(filterStrategy)
              .addFilter(categoryFilter);
          } else {
            // Use category filter as the strategy
            filterStrategy = categoryFilter;
          }
        }

        // Get availability data (needed for completion percentages)
        const availability =
          options?.preFetchedAvailability ?? (await databaseFacade.getAvailableRecipes());

        // Build completion percentage map
        const completionMap = new Map<string, number>();
        for (const recipe of availability.canMake) {
          completionMap.set(recipe.id, 100);
        }
        for (const item of availability.partiallyCanMake) {
          completionMap.set(item.recipe.id, item.completionPercentage);
        }

        // Auto-fetch cooking history data if not provided in context or pre-fetched
        let cookingHistoryData: CookingHistoryData | undefined =
          rankingContext?.cookingHistory || options?.preFetchedCookingHistory;

        if (!cookingHistoryData) {
          try {
            const mostCookedData = await databaseFacade.getMostCookedRecipes(100);
            const mostCookedMap = new Map(
              mostCookedData.map((d) => [
                d.recipeId,
                { cookCount: d.cookCount, lastCookedAt: d.lastCookedAt },
              ])
            );

            const cookingHistory = await databaseFacade.getCookingHistory(500);
            const ratingsMap = new Map<string, number>();
            const ratingsByRecipe = new Map<string, number[]>();

            for (const record of cookingHistory) {
              if (record.rating !== undefined && record.rating >= 1 && record.rating <= 5) {
                const existing = ratingsByRecipe.get(record.recipeId) || [];
                existing.push(record.rating);
                ratingsByRecipe.set(record.recipeId, existing);
              }
            }

            for (const [recipeId, ratings] of ratingsByRecipe) {
              const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
              ratingsMap.set(recipeId, avgRating);
            }

            cookingHistoryData = {
              mostCooked: mostCookedMap,
              ratings: ratingsMap,
            };
          } catch (error) {
            log.warn("Failed to fetch cooking history for ranking", error);
          }
        }

        // Build contexts for filtering and ranking
        const filterCtx: FilterContext = {
          completionPercentages: completionMap,
          selectedCategories: categories,
        };

        const rankingCtx: RankingContext = {
          ...rankingContext,
          completionPercentages: completionMap,
          cookingHistory: cookingHistoryData,
        };

        const scoreRecipe = (recipe: Recipe) => rankingStrategy!.score(recipe, rankingCtx);

        // Fetch ALL recipes, excluding tailored recipes from the main list
        const allDbRecipes = await databaseFacade.getAllRecipes();

        // Use batch query to get all recipe details in one call
        const recipeIds = allDbRecipes
          .filter((r) => r.type !== RecipeType.TAILORED)
          .map((r) => r.id);
        const recipeDetailsMap = await databaseFacade.getRecipesWithDetails(recipeIds);

        // Use batch conversion to avoid N+1 queries
        let allRecipes = convertDbRecipesToUIRecipesBatch(allDbRecipes, recipeDetailsMap);

        // Apply filter strategy
        if (filterStrategy) {
          allRecipes = allRecipes.filter((recipe) => filterStrategy.filter(recipe, filterCtx));
        }

        // Map to recipes with completion percentages
        let recipesWithCompletion = allRecipes.map((recipe) => ({
          recipe,
          completionPercentage: completionMap.get(recipe.id) ?? 0,
        }));

        // Apply ranking strategy
        recipesWithCompletion.sort((a, b) => scoreRecipe(b.recipe) - scoreRecipe(a.recipe));

        // Apply limit if specified
        if (maxRecommendations && maxRecommendations < recipesWithCompletion.length) {
          recipesWithCompletion = recipesWithCompletion.slice(0, maxRecommendations);
        }

        return { recipes: recipesWithCompletion };
      },
      { recipes: [] }
    );
  },

  /**
   * Get recipe recommendations based on ingredients expiring soon
   *
   * This method prioritizes recipes that use ingredients approaching expiration,
   * helping to reduce food waste. It uses ExpiringIngredientsRankingStrategy to
   * rank recipes by how many expiring ingredients they use, and applies
   * DietaryFilter to respect user preferences.
   *
   * @param options.daysBeforeExpiry - Days threshold for expiring ingredients (default: 3)
   * @param options.maxRecommendations - Maximum recommendations to return
   * @returns Ranked recipes with completion percentages and list of expiring ingredient IDs
   */
  async getRecipeRecommendationsForExpiring(options?: {
    /** Number of days to look ahead for expiring ingredients (default: 3) */
    daysBeforeExpiry?: number;
    /** Maximum recommendations to return */
    maxRecommendations?: number;
  }): Promise<{
    /** Recipes ranked by how many expiring ingredients they use */
    recipes: Array<{ recipe: Recipe; completionPercentage: number }>;
    /** Set of ingredient IDs that are expiring (for UI display) */
    expiringIngredientIds: Set<string>;
  }> {
    try {
      const { daysBeforeExpiry = 3, maxRecommendations } = options || {};

      // Step 1: Fetch expiring stock items
      const expiringStock = await databaseFacade.getExpiringStock(daysBeforeExpiry);

      if (expiringStock.length === 0) {
        // No expiring ingredients, return empty result
        return { recipes: [], expiringIngredientIds: new Set() };
      }

      // Step 2: Build set of expiring ingredient IDs (stock IDs used for matching)
      const expiringIngredientIds = new Set(expiringStock.map((stock) => stock.id));

      // Step 3: Create ranking strategy for expiring ingredients
      const rankingStrategy = new ExpiringIngredientsRankingStrategy({
        baseBonus: 20,
        multipleIngredientMultiplier: 1.5,
        multiplierThreshold: 2,
      });

      // Step 4: Create filter strategy for dietary preferences
      const filterStrategy = new DietaryFilter({
        checkDietaryPreferences: true,
        checkAllergens: true,
        checkTagsForAllergens: true,
      });

      // Step 5: Build ranking context with expiring ingredients
      const rankingContext: RankingContext = {
        expiringIngredients: expiringIngredientIds,
      };

      // Step 6: Get recipe recommendations using the strategies
      const result = await this.getRecipeRecommendations({
        maxRecommendations,
        filterStrategy,
        rankingStrategy,
        rankingContext,
      });

      return {
        recipes: result.recipes,
        expiringIngredientIds,
      };
    } catch {
      return { recipes: [], expiringIngredientIds: new Set() };
    }
  },

  /**
   * Generate a tailored recipe based on current pantry items
   */
  async generateTailoredRecipe(recipe: Recipe, pantryItems: PantryItem[]): Promise<Recipe> {
    return withErrorLogging(async () => {
      if (!pantryItems.length) {
        throw new Error("No pantry items available for tailoring");
      }

      const pantryHash = buildPantryHash(pantryItems);
      const cached = await databaseFacade.getTailoredRecipeWithDetailsByBaseAndHash(
        recipe.id,
        pantryHash
      );

      if (cached) {
        return convertDbTailoredRecipeToUIRecipe(
          cached.recipe,
          cached.steps,
          cached.ingredients,
          recipe
        );
      }

      const dietaryInfo = recipeApi.getUserDietaryInfo();
      const inputPrompt = buildTailoredPrompt(recipe, pantryItems, dietaryInfo);

      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: inputPrompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });

      const responseText = await generateGeminiContent(body);
      const tailored = parseTailoredRecipeResponse(responseText, recipe);

      // Delete any existing tailored recipes for this base recipe before saving the new one
      await databaseFacade.clearTailoredRecipesForBase(recipe.id);

      const saved = await databaseFacade.createTailoredRecipeWithDetails({
        recipe: {
          baseRecipeId: recipe.id,
          pantryHash,
          title: tailored.title,
          description: tailored.description,
          imageUrl: tailored.imageUrl,
          prepMinutes: tailored.prepMinutes || 0,
          cookMinutes: tailored.cookMinutes || 0,
          difficultyStars: tailored.difficultyStars || 1,
          servings: tailored.servings || 1,
          calories: tailored.calories,
          tags: tailored.tags,
        },
        steps: tailored.instructions.map((step) => ({
          step: step.step,
          title: step.title,
          description: step.description,
        })),
        ingredients: tailored.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        })),
      });

      return {
        ...tailored,
        id: saved.id,
      };
    }, "Failed to generate tailored recipe");
  },

  /**
   * Get user dietary preferences, allergens, and cooking appliances
   */
  getUserDietaryInfo(): {
    diet?: Diet;
    allergens: Allergen[];
    otherAllergens: string[];
    appliances: string[];
  } {
    const diet = storage.get<string>(PREF_DIET_KEY) as Diet | undefined;
    const allergens = (() => {
      const stored = storage.get<string | string[]>(PREF_ALLERGENS_KEY);
      if (Array.isArray(stored)) return stored as Allergen[];
      if (typeof stored !== "string" || !stored) return [];
      return stored.split(",") as Allergen[];
    })();
    const otherAllergens = (() => {
      const stored = storage.get<string | string[]>(PREF_OTHER_ALLERGENS_KEY);
      if (Array.isArray(stored)) return stored as string[];
      if (typeof stored !== "string" || !stored) return [];
      return (stored as string)
        .split(",")
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0);
    })();
    const appliances = (() => {
      const stored = storage.get<string | string[]>(PREF_APPLIANCES_KEY);
      if (Array.isArray(stored)) return stored as string[];
      if (typeof stored !== "string" || !stored) return [];
      return (stored as string)
        .split(",")
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0);
    })();

    return { diet, allergens, otherAllergens, appliances };
  },
};

/**
 * Converts a single database recipe to UI Recipe format.
 *
 * **Use this function for single recipe operations only**, such as:
 * - Fetching a single recipe by ID (e.g., recipe detail page)
 * - Processing individual recipes in isolation
 *
 * **⚠️ DO NOT use this function for batch operations** as it will cause N+1 query problems.
 * For converting multiple recipes, use {@link convertDbRecipesToUIRecipesBatch} instead.
 *
 * **Performance Note:** This function makes a database call to fetch recipe details
 * (ingredients, steps). If called in a loop, it will result in N+1 database queries.
 *
 * @param dbRecipe - The database recipe model to convert
 * @returns Promise<Recipe> - The UI Recipe object with ingredients and instructions
 *
 * @example
 * // ✅ GOOD: Single recipe use case
 * const dbRecipe = await databaseFacade.getRecipeById(id);
 * const uiRecipe = await convertDbRecipeToUIRecipe(dbRecipe);
 *
 * @example
 * // ❌ BAD: Batch use case - causes N+1 queries
 * const dbRecipes = await databaseFacade.getAllRecipes();
 * const uiRecipes = await Promise.all(
 *   dbRecipes.map(r => convertDbRecipeToUIRecipe(r)) // N+1 queries!
 * );
 *
 * @example
 * // ✅ GOOD: Batch use case with proper function
 * const dbRecipes = await databaseFacade.getAllRecipes();
 * const recipeIds = dbRecipes.map(r => r.id);
 * const recipeDetailsMap = await databaseFacade.getRecipesWithDetails(recipeIds);
 * const uiRecipes = convertDbRecipesToUIRecipesBatch(dbRecipes, recipeDetailsMap);
 */
const convertDbRecipeToUIRecipe = async (dbRecipe: DbRecipe): Promise<Recipe> => {
  const recipeDetails = await databaseFacade.getRecipeWithDetails(dbRecipe.id);

  if (!recipeDetails) {
    throw new Error("Failed to load recipe details");
  }

  const { recipe, steps, ingredients } = recipeDetails;

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    imageUrl: recipe.imageUrl || "",
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    difficultyStars: recipe.difficultyStars,
    servings: recipe.servings,
    sourceUrl: recipe.sourceUrl,
    calories: recipe.calories,
    tags: recipe.tags,
    ingredients: ingredients.map((ing) => ({
      name: ing.name,
      relatedIngredientId: ing.id,
      quantity: ing.quantity,
      unit: ing.unit,
      notes: ing.notes,
    })),
    instructions: steps.map((step) => ({
      step: step.step,
      title: step.title,
      description: step.description,
      relatedIngredientIds: [],
    })),
  };
};
