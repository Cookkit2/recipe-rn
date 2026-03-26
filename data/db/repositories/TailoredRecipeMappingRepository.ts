import { Q } from "@nozbe/watermelondb";
import TailoredRecipeMapping from "../models/TailoredRecipeMapping";
import Recipe, { RecipeType } from "../models/Recipe";
import RecipeStep from "../models/RecipeStep";
import RecipeIngredient from "../models/RecipeIngredient";
import { BaseRepository } from "./BaseRepository";
import { database } from "../database";

export interface CreateTailoredRecipeWithDetailsData {
  recipe: {
    baseRecipeId: string;
    pantryHash: string;
    title: string;
    description: string;
    imageUrl?: string;
    prepMinutes: number;
    cookMinutes: number;
    difficultyStars: number;
    servings: number;
    calories?: number;
    tags?: string[];
  };
  steps?: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  ingredients?: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  expiryDays?: number; // Default 7 days
}

export class TailoredRecipeMappingRepository extends BaseRepository<TailoredRecipeMapping> {
  constructor() {
    super("tailored_recipe_mapping");
  }

  /**
   * Find a cached tailored recipe by base recipe ID and pantry hash
   */
  async findByBaseAndHash(
    baseRecipeId: string,
    pantryHash: string
  ): Promise<{
    mapping: TailoredRecipeMapping;
    recipe: Recipe;
    steps: RecipeStep[];
    ingredients: RecipeIngredient[];
  } | null> {
    try {
      // Find mapping by hash that hasn't expired
      const mappings = await this.collection
        .query(Q.where("hash", pantryHash), Q.where("expiry_datetime", Q.gt(Date.now())))
        .fetch();

      if (!mappings.length) return null;

      // Get the recipes and verify they are linked to the base recipe
      const recipeCollection = database.collections.get<Recipe>("recipe");

      const recipeIds = mappings.map((m) => m.recipeId);
      const recipes = await recipeCollection.query(Q.where("id", Q.oneOf(recipeIds))).fetch();

      for (const mapping of mappings) {
        try {
          const recipe = recipes.find((r) => r.id === mapping.recipeId);

          // Check if this recipe is a tailored version of the base recipe
          // We store baseRecipeId in the recipe's sourceUrl field for tailored recipes
          if (recipe && recipe.type === RecipeType.TAILORED && recipe.sourceUrl === baseRecipeId) {
            const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
            const ingredientsCollection =
              database.collections.get<RecipeIngredient>("recipe_ingredient");

            const [steps, ingredients] = await Promise.all([
              stepsCollection.query(Q.where("recipe_id", recipe.id)).fetch(),
              ingredientsCollection.query(Q.where("recipe_id", recipe.id)).fetch(),
            ]);

            return {
              mapping,
              recipe,
              steps: steps.sort((a, b) => a.step - b.step),
              ingredients,
            };
          }
        } catch {
          // Continue to next mapping
          continue;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Create a tailored recipe with its mapping entry
   */
  async createTailoredRecipeWithDetails(
    data: CreateTailoredRecipeWithDetailsData
  ): Promise<Recipe> {
    const expiryDays = data.expiryDays ?? 7;
    const expiryDatetime = Date.now() + expiryDays * 24 * 60 * 60 * 1000;

    return await database.write(async () => {
      // Create the recipe with type = 'tailored'
      // Store baseRecipeId in sourceUrl field for reference
      const recipeCollection = database.collections.get<Recipe>("recipe");
      const recipe = await recipeCollection.create((record) => {
        record.title = data.recipe.title;
        record.description = data.recipe.description;
        record.imageUrl = data.recipe.imageUrl;
        record.prepMinutes = data.recipe.prepMinutes;
        record.cookMinutes = data.recipe.cookMinutes;
        record.difficultyStars = data.recipe.difficultyStars;
        record.servings = data.recipe.servings;
        record.calories = data.recipe.calories;
        record._tags = data.recipe.tags ? JSON.stringify(data.recipe.tags) : undefined;
        record.type = RecipeType.TAILORED;
        record.sourceUrl = data.recipe.baseRecipeId; // Store base recipe ID reference
        record.syncedAt = Date.now();
        record.isFavorite = false;
      });

      // Create steps
      if (data.steps && data.steps.length > 0) {
        const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
        for (const step of data.steps) {
          await stepsCollection.create((record) => {
            record.step = step.step;
            record.title = step.title;
            record.description = step.description;
            record.recipeId = recipe.id;
          });
        }
      }

      // Create ingredients
      if (data.ingredients && data.ingredients.length > 0) {
        const ingredientsCollection =
          database.collections.get<RecipeIngredient>("recipe_ingredient");
        for (const ingredient of data.ingredients) {
          await ingredientsCollection.create((record) => {
            record.recipeId = recipe.id;
            record.name = ingredient.name;
            record.quantity = ingredient.quantity;
            record.unit = ingredient.unit;
            if (ingredient.notes) {
              record.notes = ingredient.notes;
            }
          });
        }
      }

      // Create the mapping entry
      await this.collection.create((record) => {
        record.hash = data.recipe.pantryHash;
        record.recipeId = recipe.id;
        record.expiryDatetime = expiryDatetime;
      });

      return recipe;
    });
  }

  /**
   * Delete a tailored recipe and its mapping
   */
  async deleteTailoredRecipe(recipeId: string): Promise<void> {
    await database.write(async () => {
      // Find and delete the mapping
      const mappings = await this.collection.query(Q.where("recipe_id", recipeId)).fetch();

      const batchOps: import("@nozbe/watermelondb").Model[] = [
        ...mappings.map((mapping) => mapping.prepareDestroyPermanently()),
      ];

      // Find and delete the recipe with its steps and ingredients
      const recipeCollection = database.collections.get<Recipe>("recipe");
      const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
      const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");

      try {
        const recipe = await recipeCollection.find(recipeId);

        const [steps, ingredients] = await Promise.all([
          stepsCollection.query(Q.where("recipe_id", recipeId)).fetch(),
          ingredientsCollection.query(Q.where("recipe_id", recipeId)).fetch(),
        ]);

        batchOps.push(
          ...steps.map((step) => step.prepareDestroyPermanently()),
          ...ingredients.map((ingredient) => ingredient.prepareDestroyPermanently()),
          recipe.prepareDestroyPermanently()
        );
      } catch {
        // Recipe already deleted or doesn't exist
      }

      if (batchOps.length > 0) {
        await database.batch(...batchOps);
      }
    });
  }

  /**
   * Clean up expired mappings and their associated recipes
   */
  async cleanupExpired(): Promise<number> {
    const expiredMappings = await this.collection
      .query(Q.where("expiry_datetime", Q.lt(Date.now())))
      .fetch();

    if (expiredMappings.length === 0) return 0;

    let deletedCount = 0;

    // Batch all deletions in a single write to avoid nested write deadlocks
    await database.write(async () => {
      const recipeCollection = database.collections.get<Recipe>("recipe");

      // ⚡ Bolt Performance Optimization:
      // Prevent N+1 query bottlenecks during cleanup. Instead of querying and destroying
      // associated recipes, steps, and ingredients sequentially inside a loop, we extract
      // all unique recipe IDs, fetch the models simultaneously via Q.oneOf(), and destroy them
      // in a single large database.batch() operation. This drastically reduces JS thread blocking
      // and SQLite load compared to N sequential fetches and writes.
      const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
      const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");

      const recipeIds = expiredMappings.map((m) => m.recipeId);
      const uniqueRecipeIds = [...new Set(recipeIds)].filter(Boolean);

      const batchOps: import("@nozbe/watermelondb").Model[] = [];

      for (const mapping of expiredMappings) {
        batchOps.push(mapping.prepareDestroyPermanently());
        deletedCount++;
      }

      if (uniqueRecipeIds.length > 0) {
        try {
          const [recipes, steps, ingredients] = await Promise.all([
            recipeCollection.query(Q.where("id", Q.oneOf(uniqueRecipeIds))).fetch(),
            stepsCollection.query(Q.where("recipe_id", Q.oneOf(uniqueRecipeIds))).fetch(),
            ingredientsCollection.query(Q.where("recipe_id", Q.oneOf(uniqueRecipeIds))).fetch(),
          ]);

          for (const recipe of recipes) {
            batchOps.push(recipe.prepareDestroyPermanently());
          }
          for (const step of steps) {
            batchOps.push(step.prepareDestroyPermanently());
          }
          for (const ingredient of ingredients) {
            batchOps.push(ingredient.prepareDestroyPermanently());
          }
        } catch {
          // Continue if there are errors fetching related models
        }
      }

      if (batchOps.length > 0) {
        await database.batch(...batchOps);
      }
    });

    return deletedCount;
  }

  /**
   * Clear all tailored recipes for a base recipe
   */
  async clearForBaseRecipe(baseRecipeId: string): Promise<void> {
    const recipeCollection = database.collections.get<Recipe>("recipe");

    // Find all tailored recipes that reference this base recipe
    const tailoredRecipes = await recipeCollection
      .query(Q.where("type", "tailored"), Q.where("source_url", baseRecipeId))
      .fetch();

    if (tailoredRecipes.length === 0) return;

    // Batch all deletions in a single write to avoid nested write deadlocks
    await database.write(async () => {
      const stepsCollection = database.collections.get<RecipeStep>("recipe_step");

      // ⚡ Bolt Performance Optimization:
      // Prevent N+1 database querying bottlenecks when clearing tailored recipes.
      // Instead of querying and destroying mappings, steps, and ingredients sequentially inside
      // a loop for every tailored recipe, we fetch all relevant associated entities simultaneously
      // via Q.oneOf() and destroy them in a single large database.batch() execution.
      const ingredientsCollection = database.collections.get<RecipeIngredient>("recipe_ingredient");

      const recipeIds = tailoredRecipes.map((r) => r.id);
      const uniqueRecipeIds = [...new Set(recipeIds)].filter(Boolean);

      if (uniqueRecipeIds.length === 0) return;

      try {
        // Fetch related records
        const [mappings, steps, ingredients] = await Promise.all([
          this.collection.query(Q.where("recipe_id", Q.oneOf(uniqueRecipeIds))).fetch(),
          stepsCollection.query(Q.where("recipe_id", Q.oneOf(uniqueRecipeIds))).fetch(),
          ingredientsCollection.query(Q.where("recipe_id", Q.oneOf(uniqueRecipeIds))).fetch(),
        ]);

        const batchOps: import("@nozbe/watermelondb").Model[] = [
          ...mappings.map((m) => m.prepareDestroyPermanently()),
          ...steps.map((step) => step.prepareDestroyPermanently()),
          ...ingredients.map((ingredient) => ingredient.prepareDestroyPermanently()),
          ...tailoredRecipes.map((recipe) => recipe.prepareDestroyPermanently()),
        ];

        if (batchOps.length > 0) {
          await database.batch(...batchOps);
        }
      } catch {
        // Continue if there are errors
      }
    });
  }
}
