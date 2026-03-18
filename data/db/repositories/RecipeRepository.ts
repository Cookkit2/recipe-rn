import { Q } from "@nozbe/watermelondb";
import Recipe, { type RecipeData } from "../models/Recipe";
import RecipeStep, { type RecipeStepData } from "../models/RecipeStep";
import RecipeIngredient, { type RecipeIngredientData } from "../models/RecipeIngredient";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";
import { recipeApi, type SupabaseRecipeWithDetails } from "~/data/supabase-api/RecipeApi";
import type { Tables } from "~/lib/supabase/supabase-types";
import { log } from "~/utils/logger";

export interface RecipeSearchOptions extends SearchOptions {
  tags?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  maxDifficulty?: number;
  minServings?: number;
  maxServings?: number;
}

export interface CreateRecipeWithDetailsData {
  recipe: RecipeData;
  steps?: RecipeStepData[];
  ingredients?: RecipeIngredientData[];
}

export class RecipeRepository extends BaseRepository<Recipe> {
  private isInitialized = false;

  constructor() {
    super("recipe"); // Updated from "recipes" to "recipe"
  }

  // Initialize repository and sync recipes from Supabase
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Sync from Supabase on start - use high limit to get all recipes
      await this.syncFromSupabase(1000);

      this.isInitialized = true;
    } catch (error) {
      // Don't throw error during initialization to prevent app crashes
      // The app can still function with local-only recipes
      this.isInitialized = true;
    }
  }

  // Search recipes with advanced filters
  async searchRecipes(options: RecipeSearchOptions = {}): Promise<Recipe[]> {
    let query = this.collection.query();

    // Text search
    if (options.searchTerm) {
      query = this.buildSearchQuery(query, options.searchTerm, ["title", "description"]);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      const tagConditions = options.tags.map((tag) =>
        Q.where("tags", Q.like(`%"${Q.sanitizeLikeString(tag)}"%`))
      );
      query = query.extend(Q.or(...tagConditions));
    }

    // Filter by prep time
    if (options.maxPrepTime) {
      query = query.extend(Q.where("prep_minutes", Q.lte(options.maxPrepTime)));
    }

    // Filter by cook time
    if (options.maxCookTime) {
      query = query.extend(Q.where("cook_minutes", Q.lte(options.maxCookTime)));
    }

    // Filter by difficulty
    if (options.maxDifficulty) {
      query = query.extend(Q.where("difficulty_stars", Q.lte(options.maxDifficulty)));
    }

    // Filter by servings
    if (options.minServings) {
      query = query.extend(Q.where("servings", Q.gte(options.minServings)));
    }
    if (options.maxServings) {
      query = query.extend(Q.where("servings", Q.lte(options.maxServings)));
    }

    // Apply sorting
    query = this.applySorting(query, options.sortBy || "created_at", options.sortOrder);

    // Apply pagination
    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    return await query.fetch();
  }

  // Get favorite recipes
  async getFavoriteRecipes(options: SearchOptions = {}): Promise<Recipe[]> {
    let query = this.collection.query(Q.where("is_favorite", true));

    // Apply sorting
    query = this.applySorting(query, options.sortBy || "title", options.sortOrder || "asc");

    // Apply pagination
    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    return await query.fetch();
  }

  // Toggle recipe favorite status
  async toggleFavorite(recipeId: string): Promise<Recipe | null> {
    const recipe = await this.findById(recipeId);
    if (!recipe) return null;

    await recipe.toggleFavorite();
    return recipe;
  }

  // Set recipe favorite status
  async setFavorite(recipeId: string, isFavorite: boolean): Promise<Recipe | null> {
    const recipe = await this.findById(recipeId);
    if (!recipe) return null;

    await database.write(async () => {
      await recipe.update((r) => {
        r.isFavorite = isFavorite;
      });
    });

    return recipe;
  }

  // Get recipe with all related data
  async getRecipeWithDetails(id: string): Promise<{
    recipe: Recipe;
    steps: RecipeStep[];
    ingredients: RecipeIngredient[];
  } | null> {
    try {
      const recipe = await this.findById(id);
      if (!recipe) return null;

      // Add defensive checks to ensure the recipe has the expected properties
      if (!recipe.steps || typeof recipe.steps.fetch !== "function") {
        // Fallback: query collections directly
        return await this.getRecipeWithDetailsDirectQuery(id);
      }

      if (!recipe.ingredients || typeof recipe.ingredients.fetch !== "function") {
        // Fallback: query collections directly
        return await this.getRecipeWithDetailsDirectQuery(id);
      }

      const [steps, ingredients] = await Promise.all([
        recipe.steps.fetch(),
        recipe.ingredients.fetch(),
      ]);

      return {
        recipe,
        steps: steps.sort((a, b) => a.step - b.step),
        ingredients,
      };
    } catch (error) {
      // Fallback: try direct query approach
      return await this.getRecipeWithDetailsDirectQuery(id);
    }
  }

  /**
   * Get multiple recipes with their details in a single batch query.
   *
   * **Performance Benefit:** This method uses Q.oneOf() to fetch all recipes, steps,
   * and ingredients in just 3 database queries total, regardless of how many recipes
   * are requested. Compare this to calling getRecipeWithDetails() in a loop, which
   * would result in 3 queries per recipe (N+1 problem).
   *
   * **When to use:** Use this method when you need to fetch details for multiple recipes
   * at once, such as in recipe lists, search results, or recommendation features.
   *
   * **When NOT to use:** For fetching a single recipe's details, use getRecipeWithDetails() instead.
   *
   * @param recipeIds - Array of recipe IDs to fetch details for
   * @returns Map<recipeId, RecipeWithDetails> where each entry contains the recipe with its steps and ingredients
   *
   * @example
   * // ✅ GOOD: Batch fetch for multiple recipes
   * const recipeIds = dbRecipes.map(r => r.id);
   * const detailsMap = await recipeRepository.getRecipesWithDetails(recipeIds);
   *
   * @example
   * // ❌ BAD: Using this for a single recipe (use getRecipeWithDetails instead)
   * const details = await recipeRepository.getRecipesWithDetails([singleId]);
   * const singleRecipe = details.get(singleId);
   */
  async getRecipesWithDetails(recipeIds: string[]): Promise<
    Map<
      string,
      {
        recipe: Recipe;
        steps: RecipeStep[];
        ingredients: RecipeIngredient[];
      }
    >
  > {
    // Handle empty input
    if (recipeIds.length === 0) {
      return new Map();
    }

    try {
      // Batch fetch all recipes using Q.oneOf
      const recipes = await this.collection.query(Q.where("id", Q.oneOf(recipeIds))).fetch();

      if (recipes.length === 0) {
        return new Map();
      }

      // Batch fetch all steps for these recipes in a single query
      const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
      const allSteps = await stepsCollection
        .query(Q.where("recipe_id", Q.oneOf(recipeIds)))
        .fetch();

      // Batch fetch all ingredients for these recipes in a single query
      const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");
      const allIngredients = await ingredientsCollection
        .query(Q.where("recipe_id", Q.oneOf(recipeIds)))
        .fetch();

      // Build the result Map
      const resultMap = new Map<
        string,
        {
          recipe: Recipe;
          steps: RecipeStep[];
          ingredients: RecipeIngredient[];
        }
      >();

      // Initialize map with recipes
      recipes.forEach((recipe) => {
        resultMap.set(recipe.id, {
          recipe,
          steps: [],
          ingredients: [],
        });
      });

      // Group steps by recipe_id and sort by step number
      allSteps.forEach((step) => {
        const entry = resultMap.get(step.recipeId);
        if (entry) {
          entry.steps.push(step);
        }
      });

      // Group ingredients by recipe_id
      allIngredients.forEach((ingredient) => {
        const entry = resultMap.get(ingredient.recipeId);
        if (entry) {
          entry.ingredients.push(ingredient);
        }
      });

      // Sort steps by step number for each recipe
      resultMap.forEach((entry) => {
        entry.steps.sort((a, b) => a.step - b.step);
      });

      return resultMap;
    } catch (error) {
      log.error("Error in getRecipesWithDetails:", error);
      return new Map();
    }
  }

  async clearAllRecipes(): Promise<void> {
    await database.write(async () => {
      const allRecipes = await this.collection.query().fetch();
      await Promise.all(allRecipes.map((recipe) => recipe.destroyPermanently()));

      // Also clear related steps and ingredients
      const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
      const allSteps = await stepsCollection.query().fetch();
      await Promise.all(allSteps.map((step) => step.destroyPermanently()));

      const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");
      const allIngredients = await ingredientsCollection.query().fetch();
      await Promise.all(allIngredients.map((ingredient) => ingredient.destroyPermanently()));
    });
  }

  // Alternative method using direct collection queries
  private async getRecipeWithDetailsDirectQuery(id: string): Promise<{
    recipe: Recipe;
    steps: RecipeStep[];
    ingredients: RecipeIngredient[];
  } | null> {
    try {
      const recipe = await this.findById(id);
      if (!recipe) return null;

      const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
      const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");

      const [steps, ingredients] = await Promise.all([
        stepsCollection.query(Q.where("recipe_id", id)).fetch(),
        ingredientsCollection.query(Q.where("recipe_id", id)).fetch(),
      ]);

      return {
        recipe,
        steps: steps.sort((a, b) => a.step - b.step),
        ingredients,
      };
    } catch (error) {
      return null;
    }
  }

  // Create recipe with steps and ingredients
  async createRecipeWithDetails(data: CreateRecipeWithDetailsData): Promise<Recipe> {
    return await database.write(async () => {
      return await this.createRecipeWithDetailsRaw(data);
    });
  }

  // Get recipes by tag
  async getRecipesByTag(tag: string, options: SearchOptions = {}): Promise<Recipe[]> {
    let query = this.collection.query(Q.where("tags", Q.like(`%"${Q.sanitizeLikeString(tag)}"%`)));

    query = this.applySorting(query, options.sortBy || "created_at", options.sortOrder);

    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    return await query.fetch();
  }

  // Get all unique tags
  async getAllTags(): Promise<string[]> {
    const recipes = await this.collection.query().fetch();
    const tagSet = new Set<string>();

    recipes.forEach((recipe) => {
      recipe.tags.forEach((tag) => tagSet.add(tag));
    });

    return Array.from(tagSet).sort();
  }

  // Get popular recipes (most recently created for now, could be enhanced with rating/view count)
  async getPopularRecipes(limit: number = 10): Promise<Recipe[]> {
    return await this.collection
      .query()
      .extend(Q.sortBy("created_at", Q.desc))
      .extend(Q.take(limit))
      .fetch();
  }

  // Get quick recipes (under 30 minutes total time)
  async getQuickRecipes(maxTotalMinutes: number = 30): Promise<Recipe[]> {
    // Note: WatermelonDB doesn't support computed columns in queries directly
    // So we'll fetch and filter in JavaScript
    const recipes = await this.collection.query().fetch();
    return recipes.filter((recipe) => recipe.prepMinutes + recipe.cookMinutes <= maxTotalMinutes);
  }

  // Sync recipes from Supabase
  async syncFromSupabase(limit: number = 1000): Promise<void> {
    try {
      const recipesWithDetails = await recipeApi.getRecipesWithDetailsSupabase(limit);
      log.info(`Syncing ${recipesWithDetails.length} recipes from Supabase...`);

      if (recipesWithDetails.length === 0) {
        log.info("No recipes found to sync from Supabase");
        return;
      }

      log.info(`First recipe: ${recipesWithDetails[0]?.recipe.title}`);

      // Get all existing recipes
      const existingRecipes = await this.collection.query().fetch();
      const existingRecipesMap = new Map(existingRecipes.map((r) => [r.id, r]));

      // Separate new recipes from existing ones
      const newRecipes: SupabaseRecipeWithDetails[] = [];
      const existingRecipesToUpdate: SupabaseRecipeWithDetails[] = [];

      recipesWithDetails.forEach((supabaseRecipe) => {
        if (existingRecipesMap.has(supabaseRecipe.recipe.id)) {
          existingRecipesToUpdate.push(supabaseRecipe);
        } else {
          newRecipes.push(supabaseRecipe);
        }
      });

      log.info(
        `Found ${newRecipes.length} new recipes and ${existingRecipesToUpdate.length} existing recipes to update`
      );

      // Pre-fetch steps and ingredients for existing recipes to update
      const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
      const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");

      const existingRecipeIdsArray = existingRecipesToUpdate.map((r) => r.recipe.id);

      // We need to fetch steps and ingredients in chunks to avoid SQLite parameter limits
      const chunkedFetch = async <T>(collection: any, ids: string[], foreignKey: string) => {
        const CHUNK_SIZE = 500;
        let results: T[] = [];
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
          const chunk = ids.slice(i, i + CHUNK_SIZE);
          const fetched = await collection.query(Q.where(foreignKey, Q.oneOf(chunk))).fetch();
          results = results.concat(fetched);
        }
        return results;
      };

      const existingSteps = await chunkedFetch<RecipeStep>(
        stepsCollection,
        existingRecipeIdsArray,
        "recipe_id"
      );
      const existingIngredients = await chunkedFetch<RecipeIngredient>(
        ingredientsCollection,
        existingRecipeIdsArray,
        "recipe_id"
      );

      const stepsByRecipeId = new Map<string, RecipeStep[]>();
      existingSteps.forEach((s) => {
        const recipeId = s.recipeId;
        if (!stepsByRecipeId.has(recipeId)) stepsByRecipeId.set(recipeId, []);
        stepsByRecipeId.get(recipeId)!.push(s);
      });

      const ingredientsByRecipeId = new Map<string, RecipeIngredient[]>();
      existingIngredients.forEach((i) => {
        const recipeId = i.recipeId;
        if (!ingredientsByRecipeId.has(recipeId)) ingredientsByRecipeId.set(recipeId, []);
        ingredientsByRecipeId.get(recipeId)!.push(i);
      });

      // Prepare operations
      const batchOps: import("@nozbe/watermelondb").Model[] = [];

      for (const supabaseRecipe of newRecipes) {
        batchOps.push(...this.prepareSyncSingleRecipe(supabaseRecipe));
      }

      for (const supabaseRecipe of existingRecipesToUpdate) {
        const recipeId = supabaseRecipe.recipe.id;
        const existingRecipe = existingRecipesMap.get(recipeId);
        if (existingRecipe) {
          batchOps.push(
            ...this.prepareUpdateExistingRecipe(
              supabaseRecipe,
              existingRecipe,
              stepsByRecipeId.get(recipeId) || [],
              ingredientsByRecipeId.get(recipeId) || []
            )
          );
        }
      }

      // Execute all operations in chunks inside a single transaction
      if (batchOps.length > 0) {
        await database.write(async () => {
          const BATCH_SIZE = 500;
          for (let i = 0; i < batchOps.length; i += BATCH_SIZE) {
            await database.batch(...batchOps.slice(i, i + BATCH_SIZE));
          }
        });
      }

      // Verify sync worked
      const localCount = await this.count();
      log.info(`Local database now has ${localCount} recipes`);
    } catch (error) {
      log.error("Error syncing from Supabase:", error);
      throw error;
    }
  }

  // Helper method to transform and sync a single recipe
  private prepareSyncSingleRecipe(
    supabaseRecipe: SupabaseRecipeWithDetails
  ): import("@nozbe/watermelondb").Model[] {
    const ops: import("@nozbe/watermelondb").Model[] = [];
    const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
    const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");

    const recipeData = this.transformSupabaseRecipe(supabaseRecipe.recipe);

    const recipe = this.collection.prepareCreate((r) => {
      r._raw.id = recipeData.id;
      r.title = recipeData.title;
      r.description = recipeData.description;
      if (recipeData.imageUrl) r.imageUrl = recipeData.imageUrl;
      r.prepMinutes = recipeData.prepMinutes;
      r.cookMinutes = recipeData.cookMinutes;
      r.difficultyStars = recipeData.difficultyStars;
      r.servings = recipeData.servings;
      if (recipeData.sourceUrl) r.sourceUrl = recipeData.sourceUrl;
      if (recipeData.calories) r.calories = recipeData.calories;
      if (recipeData.tags) r.tags = recipeData.tags;
      if (recipeData.type) r.type = recipeData.type;
      r.syncedAt = Date.now(); // Set sync time
      r.isFavorite = false; // Default to false
    });
    ops.push(recipe);

    for (const stepData of supabaseRecipe.steps) {
      const transformedStep = this.transformSupabaseStep(stepData);
      ops.push(
        stepsCollection.prepareCreate((step) => {
          step.step = transformedStep.step;
          step.title = transformedStep.title;
          step.description = transformedStep.description;
          step.recipeId = recipe.id;
        })
      );
    }

    for (const ingredientData of supabaseRecipe.ingredients) {
      const transformedIngredient = this.transformSupabaseIngredient(ingredientData);
      ops.push(
        ingredientsCollection.prepareCreate((ingredient) => {
          ingredient.recipeId = recipe.id;
          ingredient.name = transformedIngredient.name;
          ingredient.quantity = transformedIngredient.quantity;
          ingredient.unit = transformedIngredient.unit;
          ingredient.notes = transformedIngredient.notes;
        })
      );
    }

    return ops;
  }

  // Helper method to update an existing recipe with Supabase data
  private prepareUpdateExistingRecipe(
    supabaseRecipe: SupabaseRecipeWithDetails,
    existingRecipe: Recipe,
    existingSteps: RecipeStep[],
    existingIngredients: RecipeIngredient[]
  ): import("@nozbe/watermelondb").Model[] {
    const ops: import("@nozbe/watermelondb").Model[] = [];
    const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
    const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");
    const recipeId = existingRecipe.id;

    ops.push(
      existingRecipe.prepareUpdate((recipe) => {
        const transformedRecipe = this.transformSupabaseRecipe(supabaseRecipe.recipe);
        recipe.title = transformedRecipe.title;
        recipe.description = transformedRecipe.description;
        if (transformedRecipe.imageUrl) recipe.imageUrl = transformedRecipe.imageUrl;
        recipe.prepMinutes = transformedRecipe.prepMinutes;
        recipe.cookMinutes = transformedRecipe.cookMinutes;
        recipe.difficultyStars = transformedRecipe.difficultyStars;
        recipe.servings = transformedRecipe.servings;
        if (transformedRecipe.sourceUrl) recipe.sourceUrl = transformedRecipe.sourceUrl;
        if (transformedRecipe.calories) recipe.calories = transformedRecipe.calories;
        if (transformedRecipe.tags) recipe.tags = transformedRecipe.tags;
      })
    );

    for (const step of existingSteps) {
      ops.push(step.prepareDestroyPermanently());
    }

    for (const stepData of supabaseRecipe.steps) {
      const transformedStep = this.transformSupabaseStep(stepData);
      ops.push(
        stepsCollection.prepareCreate((step) => {
          step.step = transformedStep.step;
          step.title = transformedStep.title;
          step.description = transformedStep.description;
          step.recipeId = recipeId;
        })
      );
    }

    for (const ingredient of existingIngredients) {
      ops.push(ingredient.prepareDestroyPermanently());
    }

    for (const ingredientData of supabaseRecipe.ingredients) {
      const transformedIngredient = this.transformSupabaseIngredient(ingredientData);
      ops.push(
        ingredientsCollection.prepareCreate((ingredient) => {
          ingredient.recipeId = recipeId;
          ingredient.name = transformedIngredient.name;
          ingredient.quantity = transformedIngredient.quantity;
          ingredient.unit = transformedIngredient.unit;
          ingredient.notes = transformedIngredient.notes;
        })
      );
    }

    return ops;
  }

  // Create recipe with steps and ingredients without database.write wrapper (for use within transactions)
  private async createRecipeWithDetailsRaw(
    data: CreateRecipeWithDetailsData & { recipe: RecipeData & { id?: string } }
  ): Promise<Recipe> {
    const batchOps: import("@nozbe/watermelondb").Model[] = [];

    // Create recipe
    const recipe = this.collection.prepareCreate((r) => {
      if (data.recipe.id) r._raw.id = data.recipe.id;
      r.title = data.recipe.title;
      r.description = data.recipe.description;
      if (data.recipe.imageUrl) r.imageUrl = data.recipe.imageUrl;
      r.prepMinutes = data.recipe.prepMinutes;
      r.cookMinutes = data.recipe.cookMinutes;
      r.difficultyStars = data.recipe.difficultyStars;
      r.servings = data.recipe.servings;
      if (data.recipe.sourceUrl) r.sourceUrl = data.recipe.sourceUrl;
      if (data.recipe.calories) r.calories = data.recipe.calories;
      if (data.recipe.tags) r.tags = data.recipe.tags;
      if (data.recipe.type) r.type = data.recipe.type;
      r.syncedAt = Date.now(); // Set sync time
      r.isFavorite = data.recipe.isFavorite ?? false; // Default to false
    });

    batchOps.push(recipe);

    // Create steps if provided
    if (data.steps && data.steps.length > 0) {
      const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
      data.steps.forEach((stepData) => {
        batchOps.push(
          stepsCollection.prepareCreate((step) => {
            step.step = stepData.step;
            step.title = stepData.title;
            step.description = stepData.description;
            step.recipeId = recipe.id; // Use the new recipe's ID
          })
        );
      });
    }

    // Create ingredients if provided
    if (data.ingredients && data.ingredients.length > 0) {
      const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");
      data.ingredients.forEach((ingredientData) => {
        batchOps.push(
          ingredientsCollection.prepareCreate((ingredient) => {
            ingredient.recipeId = recipe.id; // Use the new recipe's ID
            ingredient.name = ingredientData.name;
            ingredient.quantity = ingredientData.quantity;
            ingredient.unit = ingredientData.unit;
            ingredient.notes = ingredientData.notes;
          })
        );
      });
    }

    await database.batch(...batchOps);

    return recipe;
  }

  // Transform Supabase recipe to local format
  private transformSupabaseRecipe(supabaseRecipe: Tables<"recipe">): RecipeData & { id: string } {
    return {
      id: supabaseRecipe.id, // Preserve the Supabase ID
      title: supabaseRecipe.title,
      description: supabaseRecipe.description || "",
      imageUrl: supabaseRecipe.image_url || undefined,
      prepMinutes: supabaseRecipe.prep_minutes || 0,
      cookMinutes: supabaseRecipe.cook_minutes || 0,
      difficultyStars: supabaseRecipe.difficulty_stars || 1,
      servings: supabaseRecipe.servings || 1,
      sourceUrl: supabaseRecipe.source_url || undefined,
      calories: supabaseRecipe.calories || undefined,
      tags: supabaseRecipe.tags || [],
    };
  }

  // Transform Supabase recipe step to local format
  private transformSupabaseStep(supabaseStep: Tables<"recipe_step">): RecipeStepData {
    return {
      step: supabaseStep.step,
      title: supabaseStep.title || "",
      description: supabaseStep.description || "",
      recipeId: supabaseStep.recipe_id,
    };
  }

  // Transform Supabase recipe ingredient to local format
  private transformSupabaseIngredient(
    supabaseIngredient: Tables<"pivot_recipe_ingredient">
  ): RecipeIngredientData {
    return {
      recipeId: supabaseIngredient.recipe_id,
      name: supabaseIngredient.name || "",
      quantity: supabaseIngredient.quantity || 1,
      unit: supabaseIngredient.unit || "unit",
      notes: supabaseIngredient.notes || undefined,
    };
  }

  // Update recipe with steps and ingredients
  async updateRecipeWithDetails(
    recipeId: string,
    data: Partial<CreateRecipeWithDetailsData>
  ): Promise<Recipe> {
    return await database.write(async () => {
      const recipe = await this.collection.find(recipeId);
      const batchOps: import("@nozbe/watermelondb").Model[] = [];

      // Update recipe fields
      if (data.recipe) {
        batchOps.push(
          recipe.prepareUpdate((r) => {
            if (data.recipe!.title !== undefined) r.title = data.recipe!.title;
            if (data.recipe!.description !== undefined) r.description = data.recipe!.description;
            if (data.recipe!.imageUrl !== undefined) r.imageUrl = data.recipe!.imageUrl;
            if (data.recipe!.prepMinutes !== undefined) r.prepMinutes = data.recipe!.prepMinutes;
            if (data.recipe!.cookMinutes !== undefined) r.cookMinutes = data.recipe!.cookMinutes;
            if (data.recipe!.difficultyStars !== undefined)
              r.difficultyStars = data.recipe!.difficultyStars;
            if (data.recipe!.servings !== undefined) r.servings = data.recipe!.servings;
            if (data.recipe!.sourceUrl !== undefined) r.sourceUrl = data.recipe!.sourceUrl;
            if (data.recipe!.calories !== undefined) r.calories = data.recipe!.calories;
            if (data.recipe!.tags !== undefined) r.tags = data.recipe!.tags;
            if (data.recipe!.isFavorite !== undefined) r.isFavorite = data.recipe!.isFavorite;
            if (data.recipe!.type !== undefined) r.type = data.recipe!.type;
          })
        );
      }

      // Update steps if provided
      if (data.steps) {
        const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
        const existingSteps = await stepsCollection.query(Q.where("recipe_id", recipeId)).fetch();

        // Delete existing steps
        existingSteps.forEach((step) => {
          batchOps.push(step.prepareDestroyPermanently());
        });

        // Create new steps
        if (data.steps.length > 0) {
          data.steps.forEach((stepData) => {
            batchOps.push(
              stepsCollection.prepareCreate((step) => {
                step.step = stepData.step;
                step.title = stepData.title;
                step.description = stepData.description;
                step.recipeId = recipeId;
              })
            );
          });
        }
      }

      // Update ingredients if provided
      if (data.ingredients) {
        const ingredientsCollection =
          database.collections.get<RecipeIngredient>("recipe_ingredient");
        const existingIngredients = await ingredientsCollection
          .query(Q.where("recipe_id", recipeId))
          .fetch();

        // Delete existing ingredients
        existingIngredients.forEach((ingredient) => {
          batchOps.push(ingredient.prepareDestroyPermanently());
        });

        // Create new ingredients
        if (data.ingredients.length > 0) {
          data.ingredients.forEach((ingredientData) => {
            batchOps.push(
              ingredientsCollection.prepareCreate((ingredient) => {
                ingredient.recipeId = recipeId;
                ingredient.name = ingredientData.name;
                ingredient.quantity = ingredientData.quantity;
                ingredient.unit = ingredientData.unit;
                ingredient.notes = ingredientData.notes;
              })
            );
          });
        }
      }

      if (batchOps.length > 0) {
        await database.batch(...batchOps);
      }

      return recipe;
    });
  }

  // Duplicate a recipe with optional modifications
  async duplicateRecipe(
    recipeId: string,
    modifications?: Partial<CreateRecipeWithDetailsData>
  ): Promise<Recipe> {
    return await database.write(async () => {
      const originalRecipe = await this.collection.find(recipeId);

      // Fetch original steps and ingredients
      const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
      const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");

      const [originalSteps, originalIngredients] = await Promise.all([
        stepsCollection.query(Q.where("recipe_id", recipeId)).fetch(),
        ingredientsCollection.query(Q.where("recipe_id", recipeId)).fetch(),
      ]);

      // Apply modifications to recipe data
      const recipeData: RecipeData = {
        title: modifications?.recipe?.title
          ? modifications.recipe.title
          : `${originalRecipe.title} (Copy)`,
        description: modifications?.recipe?.description ?? originalRecipe.description,
        imageUrl: modifications?.recipe?.imageUrl ?? originalRecipe.imageUrl,
        prepMinutes: modifications?.recipe?.prepMinutes ?? originalRecipe.prepMinutes,
        cookMinutes: modifications?.recipe?.cookMinutes ?? originalRecipe.cookMinutes,
        difficultyStars: modifications?.recipe?.difficultyStars ?? originalRecipe.difficultyStars,
        servings: modifications?.recipe?.servings ?? originalRecipe.servings,
        sourceUrl: modifications?.recipe?.sourceUrl ?? originalRecipe.sourceUrl,
        calories: modifications?.recipe?.calories ?? originalRecipe.calories,
        tags: modifications?.recipe?.tags ?? originalRecipe.tags,
        type: modifications?.recipe?.type,
        isFavorite: false, // Copies are not favorited by default
      };

      // Use provided steps/ingredients or original ones
      const stepsData = modifications?.steps ?? originalSteps;
      const ingredientsData = modifications?.ingredients ?? originalIngredients;

      // Create the duplicate using createRecipeWithDetailsRaw
      const newRecipe = await this.createRecipeWithDetailsRaw({
        recipe: recipeData,
        steps: stepsData.map((step) => ({
          step: step.step,
          title: step.title,
          description: step.description,
          recipeId: "", // Will be set by createRecipeWithDetailsRaw
        })),
        ingredients: ingredientsData.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          notes: ingredient.notes,
          recipeId: "", // Will be set by createRecipeWithDetailsRaw
        })),
      });

      return newRecipe;
    });
  }

  // Delegate method to get versions for a recipe
  // This method imports RecipeVersionRepository lazily to avoid circular dependencies
  async getVersionsForRecipe(
    recipeId: string,
    options?: SearchOptions
  ): Promise<import("../models/RecipeVersion").default[]> {
    const { RecipeVersionRepository } = await import("./RecipeVersionRepository");
    const versionRepo = new RecipeVersionRepository();
    return await versionRepo.getVersionsForRecipe(recipeId, options);
  }

  // Delegate method to create a version
  async createRecipeVersion(
    data: import("../models/RecipeVersion").RecipeVersionData
  ): Promise<import("../models/RecipeVersion").default> {
    const { RecipeVersionRepository } = await import("./RecipeVersionRepository");
    const versionRepo = new RecipeVersionRepository();
    return await versionRepo.createVersion(data);
  }

  // Delegate method to get the next version number
  async getNextVersionNumber(recipeId: string): Promise<number> {
    const { RecipeVersionRepository } = await import("./RecipeVersionRepository");
    const versionRepo = new RecipeVersionRepository();
    return await versionRepo.getNextVersionNumber(recipeId);
  }
}
