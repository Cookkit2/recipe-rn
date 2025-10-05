import { Q } from "@nozbe/watermelondb";
import Recipe, { type RecipeData } from "../models/Recipe";
import RecipeStep, { type RecipeStepData } from "../models/RecipeStep";
import RecipeIngredient, {
  type RecipeIngredientData,
} from "../models/RecipeIngredient";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";
import {
  recipeApi,
  type SupabaseRecipeWithDetails,
} from "~/data/supabase-api/RecipeApi";
import type { Tables } from "~/lib/supabase/supabase-types";

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
      query = this.buildSearchQuery(query, options.searchTerm, [
        "title",
        "description",
      ]);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      const tagConditions = options.tags.map((tag) =>
        Q.where("tags", Q.like(`%"${tag}"%`))
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
      query = query.extend(
        Q.where("difficulty_stars", Q.lte(options.maxDifficulty))
      );
    }

    // Filter by servings
    if (options.minServings) {
      query = query.extend(Q.where("servings", Q.gte(options.minServings)));
    }
    if (options.maxServings) {
      query = query.extend(Q.where("servings", Q.lte(options.maxServings)));
    }

    // Apply sorting
    query = this.applySorting(
      query,
      options.sortBy || "created_at",
      options.sortOrder
    );

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
    query = this.applySorting(
      query,
      options.sortBy || "title",
      options.sortOrder || "asc"
    );

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
  async setFavorite(
    recipeId: string,
    isFavorite: boolean
  ): Promise<Recipe | null> {
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
      if (!recipe.steps || typeof recipe.steps.query !== "function") {
        // Fallback: query collections directly
        return await this.getRecipeWithDetailsDirectQuery(id);
      }

      if (
        !recipe.ingredients ||
        typeof recipe.ingredients.query !== "function"
      ) {
        // Fallback: query collections directly
        return await this.getRecipeWithDetailsDirectQuery(id);
      }

      const [steps, ingredients] = await Promise.all([
        recipe.steps.query().fetch(),
        recipe.ingredients.query().fetch(),
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

  async clearAllRecipes(): Promise<void> {
    await database.write(async () => {
      const allRecipes = await this.collection.query().fetch();
      await Promise.all(
        allRecipes.map((recipe) => recipe.destroyPermanently())
      );

      // Also clear related steps and ingredients
      const stepsCollection =
        database.collections.get<RecipeStep>("recipe_step");
      const allSteps = await stepsCollection.query().fetch();
      await Promise.all(allSteps.map((step) => step.destroyPermanently()));

      const ingredientsCollection =
        database.collections.get<RecipeIngredient>("recipe_ingredient");
      const allIngredients = await ingredientsCollection.query().fetch();
      await Promise.all(
        allIngredients.map((ingredient) => ingredient.destroyPermanently())
      );
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

      const stepsCollection =
        database.collections.get<RecipeStep>("recipe_step");
      const ingredientsCollection =
        database.collections.get<RecipeIngredient>("recipe_ingredient");

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
  async createRecipeWithDetails(
    data: CreateRecipeWithDetailsData
  ): Promise<Recipe> {
    return await database.write(async () => {
      return await this.createRecipeWithDetailsRaw(data);
    });
  }

  // Get recipes by tag
  async getRecipesByTag(
    tag: string,
    options: SearchOptions = {}
  ): Promise<Recipe[]> {
    let query = this.collection.query(Q.where("tags", Q.like(`%"${tag}"%`)));

    query = this.applySorting(
      query,
      options.sortBy || "created_at",
      options.sortOrder
    );

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
    return recipes.filter(
      (recipe) => recipe.prepMinutes + recipe.cookMinutes <= maxTotalMinutes
    );
  }

  // Sync recipes from Supabase
  async syncFromSupabase(limit: number = 1000): Promise<void> {
    try {
      const recipesWithDetails =
        await recipeApi.getRecipesWithDetailsSupabase(limit);
      console.log(
        `Syncing ${recipesWithDetails.length} recipes from Supabase...`
      );
      console.log("First recipe preview:", recipesWithDetails[0]?.ingredients);

      // Check if we have recipes to sync
      if (recipesWithDetails.length === 0) {
        console.log("No recipes found to sync from Supabase");
        return;
      }

      console.log(`First recipe: ${recipesWithDetails[0]?.recipe.title}`);

      // Get all existing recipe IDs to check for updates vs new recipes
      const existingRecipeIds = new Set<string>();
      const existingRecipes = await this.collection.query().fetch();
      existingRecipes.forEach((recipe) => existingRecipeIds.add(recipe.id));

      // Separate new recipes from existing ones
      const newRecipes: SupabaseRecipeWithDetails[] = [];
      const existingRecipesToUpdate: SupabaseRecipeWithDetails[] = [];

      recipesWithDetails.forEach((supabaseRecipe) => {
        if (existingRecipeIds.has(supabaseRecipe.recipe.id)) {
          existingRecipesToUpdate.push(supabaseRecipe);
        } else {
          newRecipes.push(supabaseRecipe);
        }
      });

      console.log(
        `Found ${newRecipes.length} new recipes and ${existingRecipesToUpdate.length} existing recipes to update`
      );

      // Process all recipes in a single transaction to avoid nested transactions
      await database.write(async () => {
        // Process new recipes
        for (const supabaseRecipe of newRecipes) {
          try {
            await this.syncSingleRecipe(supabaseRecipe);
            // console.log(`Created new recipe: ${supabaseRecipe.recipe.title}`);
          } catch (error) {
            console.error(
              `Failed to create recipe ${supabaseRecipe.recipe.title}:`,
              error
            );
          }
        }

        // Process existing recipes (update them)
        for (const supabaseRecipe of existingRecipesToUpdate) {
          try {
            await this.updateExistingRecipe(supabaseRecipe);
            // console.log(`Updated existing recipe: ${supabaseRecipe.recipe.title}`);
          } catch (error) {
            console.error(
              `Failed to update recipe ${supabaseRecipe.recipe.title}:`,
              error
            );
          }
        }
      });

      // Verify sync worked
      const localCount = await this.count();
      console.log(`Local database now has ${localCount} recipes`);
    } catch (error) {
      console.error("Error syncing from Supabase:", error);
      throw error;
    }
  }

  // Helper method to transform and sync a single recipe (must be called within a database.write transaction)
  private async syncSingleRecipe(
    supabaseRecipe: SupabaseRecipeWithDetails
  ): Promise<Recipe> {
    // Since we've already filtered out existing recipes, just create the new one
    return await this.createRecipeWithDetailsRaw({
      recipe: this.transformSupabaseRecipe(supabaseRecipe.recipe),
      steps: supabaseRecipe.steps.map((step) =>
        this.transformSupabaseStep(step)
      ),
      ingredients: supabaseRecipe.ingredients.map((ingredient) =>
        this.transformSupabaseIngredient(ingredient)
      ),
    });
  }

  // Helper method to update an existing recipe with Supabase data (must be called within a database.write transaction)
  private async updateExistingRecipe(
    supabaseRecipe: SupabaseRecipeWithDetails
  ): Promise<void> {
    const recipeId = supabaseRecipe.recipe.id;

    // Update the main recipe record
    const existingRecipe = await this.collection.find(recipeId);
    await existingRecipe.update((recipe) => {
      const transformedRecipe = this.transformSupabaseRecipe(
        supabaseRecipe.recipe
      );
      recipe.title = transformedRecipe.title;
      recipe.description = transformedRecipe.description;
      if (transformedRecipe.imageUrl)
        recipe.imageUrl = transformedRecipe.imageUrl;
      recipe.prepMinutes = transformedRecipe.prepMinutes;
      recipe.cookMinutes = transformedRecipe.cookMinutes;
      recipe.difficultyStars = transformedRecipe.difficultyStars;
      recipe.servings = transformedRecipe.servings;
      if (transformedRecipe.sourceUrl)
        recipe.sourceUrl = transformedRecipe.sourceUrl;
      if (transformedRecipe.calories)
        recipe.calories = transformedRecipe.calories;
      if (transformedRecipe.tags) recipe.tags = transformedRecipe.tags;
    });

    // Update steps - delete existing and create new ones
    const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
    const existingSteps = await stepsCollection
      .query(Q.where("recipe_id", recipeId))
      .fetch();

    // Delete existing steps
    await Promise.all(existingSteps.map((step) => step.destroyPermanently()));

    // Create new steps
    if (supabaseRecipe.steps && supabaseRecipe.steps.length > 0) {
      await Promise.all(
        supabaseRecipe.steps.map((stepData) =>
          stepsCollection.create((step) => {
            const transformedStep = this.transformSupabaseStep(stepData);
            step.step = transformedStep.step;
            step.title = transformedStep.title;
            step.description = transformedStep.description;
            step.recipeId = recipeId;
          })
        )
      );
    }

    // Update ingredients - delete existing and create new ones
    const ingredientsCollection =
      database.collections.get<RecipeIngredient>("recipe_ingredient");
    const existingIngredients = await ingredientsCollection
      .query(Q.where("recipe_id", recipeId))
      .fetch();

    // Delete existing ingredients
    await Promise.all(
      existingIngredients.map((ingredient) => ingredient.destroyPermanently())
    );

    // Create new ingredients
    if (supabaseRecipe.ingredients && supabaseRecipe.ingredients.length > 0) {
      await Promise.all(
        supabaseRecipe.ingredients.map((ingredientData) =>
          ingredientsCollection.create((ingredient) => {
            const transformedIngredient =
              this.transformSupabaseIngredient(ingredientData);
            ingredient.recipeId = recipeId;
            ingredient.name = transformedIngredient.name;
            ingredient.quantity = transformedIngredient.quantity;
            ingredient.unit = transformedIngredient.unit;
            ingredient.notes = transformedIngredient.notes;
          })
        )
      );
    }
  }

  // Create recipe with steps and ingredients without database.write wrapper (for use within transactions)
  private async createRecipeWithDetailsRaw(
    data: CreateRecipeWithDetailsData & { recipe: RecipeData & { id?: string } }
  ): Promise<Recipe> {
    // Create recipe
    const recipe = await this.collection.create((r) => {
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
      r.syncedAt = Date.now(); // Set sync time
      r.isFavorite = data.recipe.isFavorite ?? false; // Default to false
    });

    // Create steps if provided
    if (data.steps && data.steps.length > 0) {
      const stepsCollection =
        database.collections.get<RecipeStep>("recipe_step");
      await Promise.all(
        data.steps.map((stepData) =>
          stepsCollection.create((step) => {
            step.step = stepData.step;
            step.title = stepData.title;
            step.description = stepData.description;
            step.recipeId = recipe.id; // Use the new recipe's ID
          })
        )
      );
    }

    // Create ingredients if provided
    if (data.ingredients && data.ingredients.length > 0) {
      const ingredientsCollection =
        database.collections.get<RecipeIngredient>("recipe_ingredient");
      await Promise.all(
        data.ingredients.map((ingredientData) =>
          ingredientsCollection.create((ingredient) => {
            ingredient.recipeId = recipe.id; // Use the new recipe's ID
            ingredient.name = ingredientData.name;
            ingredient.quantity = ingredientData.quantity;
            ingredient.unit = ingredientData.unit;
            ingredient.notes = ingredientData.notes;
          })
        )
      );
    }

    return recipe;
  }

  // Transform Supabase recipe to local format
  private transformSupabaseRecipe(
    supabaseRecipe: Tables<"recipe">
  ): RecipeData & { id: string } {
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
  private transformSupabaseStep(
    supabaseStep: Tables<"recipe_step">
  ): RecipeStepData {
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
}
