import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { Recipe as DbRecipe } from "~/data/db/models";
import type { Recipe } from "~/types/Recipe";

/**
 * Pure API functions for recipe operations
 * These functions only handle database interactions and data transformation
 */
export const recipeApi = {
  /**
   * Fetch all recipes from database
   */
  async fetchAllRecipes(): Promise<Recipe[]> {
    if (!databaseFacade) {
      throw new Error("DatabaseFacade is undefined - import failed");
    }

    if (!databaseFacade.recipes) {
      throw new Error("databaseFacade.recipes is undefined");
    }

    // Run health check
    const isHealthy = await databaseFacade.isHealthy();
    if (!isHealthy) {
      throw new Error("Database health check failed");
    }

    const dbRecipes = await databaseFacade.recipes.findAll();
    const uiRecipes = await Promise.all(
      dbRecipes.map(convertDbRecipeToUIRecipe)
    );

    return uiRecipes;
  },

  /**
   * Get a single recipe by ID
   */
  async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      const dbRecipe = await databaseFacade.recipes.findById(id);
      if (!dbRecipe) return null;

      return await convertDbRecipeToUIRecipe(dbRecipe);
    } catch (error) {
      console.error("Error getting recipe by id:", error);
      // Error getting recipe by id
      return null;
    }
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
      maxDifficulty?: number;
    }
  ): Promise<Recipe[]> {
    try {
      const dbRecipes = await databaseFacade.recipes.searchRecipes({
        searchTerm,
        tags: filters?.tags,
        maxPrepTime: filters?.maxPrepTime,
        maxCookTime: filters?.maxCookTime,
        maxDifficulty: filters?.maxDifficulty,
      });

      return await Promise.all(dbRecipes.map(convertDbRecipeToUIRecipe));
    } catch (error) {
      console.error("Error searching recipes:", error);
      // Error searching recipes
      return [];
    }
  },

  /**
   * Add a new recipe
   */
  async addRecipe(recipe: Omit<Recipe, "id">): Promise<Recipe> {
    await databaseFacade.recipes.createRecipeWithDetails({
      recipe: {
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
      },
      steps: recipe.instructions.map((step) => ({
        step: step.step,
        title: step.title,
        description: step.description,
        recipeId: "", // Will be set automatically
      })),
      ingredients: recipe.ingredients.map((ing) => ({
        recipeId: "", // Will be set automatically
        baseIngredientId: ing.relatedIngredientId,
        name: ing.name,
        quantity: ing.quantity,
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
  },

  /**
   * Update an existing recipe
   */
  async updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    const dbRecipe = await databaseFacade.recipes.findById(id);
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
  },

  /**
   * Delete a recipe
   */
  async deleteRecipe(id: string): Promise<void> {
    await databaseFacade.recipes.delete(id);
  },

  /**
   * Get recipes that can be made with current pantry items
   */
  async getAvailableRecipes(): Promise<{
    canMake: Recipe[];
    partiallyCanMake: Array<{ recipe: Recipe; completionPercentage: number }>;
  }> {
    try {
      const availability = await databaseFacade.getAvailableRecipes();

      const canMake = await Promise.all(
        availability.canMake.map(convertDbRecipeToUIRecipe)
      );

      const partiallyCanMake = await Promise.all(
        availability.partiallyCanMake.map(async (item) => {
          return {
            recipe: await convertDbRecipeToUIRecipe(item.recipe),
            completionPercentage: item.completionPercentage,
          };
        })
      );

      return { canMake, partiallyCanMake };
    } catch (error) {
      console.error("Error getting available recipes:", error);
      // Error getting available recipes
      return { canMake: [], partiallyCanMake: [] };
    }
  },

  /**
   * Get shopping list for a recipe
   */
  async getShoppingListForRecipe(recipeId: string): Promise<{
    missingIngredients: Array<{
      name: string;
      quantity: string;
      notes?: string;
    }>;
    availableIngredients: Array<{ name: string; quantity: string }>;
  }> {
    try {
      return await databaseFacade.getShoppingListForRecipe(recipeId);
    } catch (error) {
      console.error("Error getting shopping list:", error);
      return { missingIngredients: [], availableIngredients: [] };
    }
  },

  /**
   * Get smart recipe recommendations based on pantry availability
   */
  async getRecipeRecommendations(options?: {
    maxRecommendations?: number;
    preferCompleteable?: boolean;
    categories?: string[];
  }): Promise<{
    canMakeRecommendations: Recipe[];
    partialRecommendations: Array<{
      recipe: Recipe;
      completionPercentage: number;
    }>;
  }> {
    try {
      const {
        maxRecommendations = 5,
        preferCompleteable = true,
        categories,
      } = options || {};
      const availability = await databaseFacade.getAvailableRecipes();

      console.log("Availability:", availability);

      // Filter by categories if specified
      let canMake = availability.canMake;
      let partiallyCanMake = availability.partiallyCanMake;

      if (categories && categories.length > 0) {
        canMake = canMake.filter((recipe) =>
          recipe.tags?.some((tag) => categories.includes(tag))
        );
        partiallyCanMake = partiallyCanMake.filter((item) =>
          item.recipe.tags?.some((tag) => categories.includes(tag))
        );
      }

      // Smart recommendation algorithm - works with database Recipe models
      const scoreDbRecipe = (recipe: DbRecipe) => {
        let score = 0;

        // Prefer easier recipes (lower difficulty = higher score)
        score += (6 - (recipe.difficultyStars || 3)) * 10;

        // Prefer shorter prep/cook time
        const totalTime = (recipe.prepMinutes || 0) + (recipe.cookMinutes || 0);
        score += Math.max(0, 120 - totalTime) / 10; // Max bonus for recipes under 2 hours

        // Random factor for variety
        score += Math.random() * 20;

        return score;
      };

      // Sort and limit recommendations
      const sortedCanMake = canMake
        .sort((a, b) => scoreDbRecipe(b) - scoreDbRecipe(a))
        .slice(
          0,
          preferCompleteable
            ? maxRecommendations
            : Math.ceil(maxRecommendations * 0.6)
        );

      const sortedPartial = partiallyCanMake
        .sort((a, b) => {
          // Sort by completion percentage first, then by recipe score
          const completionDiff =
            b.completionPercentage - a.completionPercentage;
          if (completionDiff !== 0) return completionDiff;
          return scoreDbRecipe(b.recipe) - scoreDbRecipe(a.recipe);
        })
        .slice(0, maxRecommendations - sortedCanMake.length);

      // Convert to UI format
      const canMakeRecommendations = await Promise.all(
        sortedCanMake.map(convertDbRecipeToUIRecipe)
      );

      const partialRecommendations = await Promise.all(
        sortedPartial.map(async (item) => ({
          recipe: await convertDbRecipeToUIRecipe(item.recipe),
          completionPercentage: item.completionPercentage,
        }))
      );

      return { canMakeRecommendations, partialRecommendations };
    } catch (error) {
      console.error("Error getting recipe recommendations:", error);
      return { canMakeRecommendations: [], partialRecommendations: [] };
    }
  },
};

// Helper function to convert database recipe to UI Recipe format
const convertDbRecipeToUIRecipe = async (
  dbRecipe: DbRecipe
): Promise<Recipe> => {
  const recipeDetails = await databaseFacade.recipes.getRecipeWithDetails(
    dbRecipe.id
  );

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
      relatedIngredientId: ing.baseIngredientId,
      quantity: ing.quantity,
      notes: ing.notes,
    })),
    instructions: steps.map((step) => ({
      step: step.step,
      title: step.title,
      description: step.description,
      relatedIngredientIds: [], // TODO: Map from database if needed
    })),
  };
};
