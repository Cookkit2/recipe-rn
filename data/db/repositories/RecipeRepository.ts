import { Q } from "@nozbe/watermelondb";
import Recipe, { type RecipeData } from "../models/Recipe";
import RecipeStep, { type RecipeStepData } from "../models/RecipeStep";
import RecipeIngredient, {
  type RecipeIngredientData,
} from "../models/RecipeIngredient";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

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
  constructor() {
    super("recipes");
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
        database.collections.get<RecipeStep>("recipe_steps");
      const ingredientsCollection =
        database.collections.get<RecipeIngredient>("recipe_ingredients");

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
      // Create recipe
      const recipe = await this.collection.create((r) => {
        (Object.keys(data.recipe) as Array<keyof RecipeData>).forEach((key) => {
          const value = data.recipe[key];
          if (value !== undefined) {
            (r as any)[key] = value;
          }
        });
      });

      // Create steps if provided
      if (data.steps && data.steps.length > 0) {
        const stepsCollection =
          database.collections.get<RecipeStep>("recipe_steps");
        await Promise.all(
          data.steps.map((stepData) =>
            stepsCollection.create((step: any) => {
              step.step = stepData.step;
              step.title = stepData.title;
              step.description = stepData.description;
              step.recipeId = recipe.id;
            })
          )
        );
      }

      // Create ingredients if provided
      if (data.ingredients && data.ingredients.length > 0) {
        const ingredientsCollection =
          database.collections.get<RecipeIngredient>("recipe_ingredients");
        await Promise.all(
          data.ingredients.map((ingredientData) =>
            ingredientsCollection.create((ingredient: any) => {
              ingredient.recipeId = recipe.id;
              ingredient.baseIngredientId = ingredientData.baseIngredientId;
              ingredient.name = ingredientData.name;
              ingredient.quantity = ingredientData.quantity;
              ingredient.notes = ingredientData.notes;
            })
          )
        );
      }

      return recipe;
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
}
