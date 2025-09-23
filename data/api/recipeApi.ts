import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { Recipe as DbRecipe } from "~/data/db/models";
import type { Recipe } from "~/types/Recipe";
import { storage } from "~/data";
import {
  PREF_DIET_KEY,
  PREF_ALLERGENS_KEY,
  PREF_OTHER_ALLERGENS_KEY,
} from "~/constants/storage-keys";
import { isIngredientMatch } from "~/utils/ingredient-matching";
import type { Diet } from "~/components/Preferences/DietarySection";
import type { Allergen } from "~/components/Preferences/AllergySection";

/**
 * Check if a recipe is suitable based on user's dietary preferences and allergens
 */
const isRecipeSuitableForUser = async (recipe: Recipe): Promise<boolean> => {
  // Get user preferences from storage
  const userDiet = storage.get(PREF_DIET_KEY) as Diet | undefined;
  const userAllergens = (() => {
    const stored = storage.get(PREF_ALLERGENS_KEY);
    if (typeof stored !== "string" || !stored) return [];
    return stored.split(",") as Allergen[];
  })();
  const otherAllergens = (() => {
    const stored = storage.get(PREF_OTHER_ALLERGENS_KEY) as string | undefined;
    if (!stored) return [];
    return stored
      .split(",")
      .map((a: string) => a.trim())
      .filter((a: string) => a.length > 0);
  })();

  // Check dietary preferences (must match)
  if (userDiet && userDiet !== "none") {
    const recipeTags = recipe.tags?.map((tag) => tag.toLowerCase()) || [];

    // If user has a dietary preference, recipe must have matching tag
    if (!recipeTags.includes(userDiet.toLowerCase())) {
      return false;
    }
  }

  // Check allergens (must NOT contain any allergens user is allergic to)
  const allUserAllergens = [...userAllergens, ...otherAllergens];

  if (allUserAllergens.length > 0) {
    // Check recipe ingredients for allergens
    for (const ingredient of recipe.ingredients) {
      const ingredientName = ingredient.name.toLowerCase();

      // Check against main allergens
      for (const allergen of userAllergens) {
        if (containsAllergen(ingredientName, allergen)) {
          return false;
        }
      }

      // Check against other allergens using ingredient matching
      for (const allergen of otherAllergens) {
        if (isIngredientMatch(ingredientName, allergen.toLowerCase())) {
          return false;
        }
      }
    }

    // Also check recipe tags for allergen mentions
    const recipeTags = recipe.tags?.map((tag) => tag.toLowerCase()) || [];
    for (const allergen of allUserAllergens) {
      if (recipeTags.some((tag) => tag.includes(allergen.toLowerCase()))) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Check if an ingredient contains a specific allergen
 */
const containsAllergen = (
  ingredientName: string,
  allergen: Allergen
): boolean => {
  const ingredient = ingredientName.toLowerCase();

  switch (allergen) {
    case "milk":
      return (
        ingredient.includes("milk") ||
        ingredient.includes("dairy") ||
        ingredient.includes("cheese") ||
        ingredient.includes("butter") ||
        ingredient.includes("cream") ||
        ingredient.includes("yogurt") ||
        ingredient.includes("lactose")
      );

    case "eggs":
      return (
        ingredient.includes("egg") ||
        ingredient.includes("mayonnaise") ||
        ingredient.includes("mayo")
      );

    case "nuts":
      return (
        ingredient.includes("nut") ||
        ingredient.includes("almond") ||
        ingredient.includes("walnut") ||
        ingredient.includes("pecan") ||
        ingredient.includes("cashew") ||
        ingredient.includes("pistachio") ||
        ingredient.includes("hazelnut") ||
        ingredient.includes("macadamia")
      );

    case "fish":
      return (
        ingredient.includes("fish") ||
        ingredient.includes("salmon") ||
        ingredient.includes("tuna") ||
        ingredient.includes("cod") ||
        ingredient.includes("anchovy") ||
        ingredient.includes("sardine")
      );

    case "shellfish":
      return (
        ingredient.includes("shellfish") ||
        ingredient.includes("shrimp") ||
        ingredient.includes("crab") ||
        ingredient.includes("lobster") ||
        ingredient.includes("prawn") ||
        ingredient.includes("scallop") ||
        ingredient.includes("oyster") ||
        ingredient.includes("mussel")
      );

    case "wheat":
      return (
        ingredient.includes("wheat") ||
        ingredient.includes("flour") ||
        ingredient.includes("gluten") ||
        ingredient.includes("bread") ||
        ingredient.includes("pasta") ||
        ingredient.includes("noodle") ||
        ingredient.includes("soy sauce")
      ); // often contains wheat

    default:
      return false;
  }
};

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

      const recipe = await convertDbRecipeToUIRecipe(dbRecipe);

      console.log("Found recipe in DB:", recipe.ingredients);

      return recipe;
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
    } catch {
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
      quantity: number;
      unit: string;
      notes?: string;
      baseIngredientId: string;
    }>;
    availableIngredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      stockQuantity: number;
      stockUnit: string;
    }>;
  }> {
    try {
      return await databaseFacade.getShoppingListForRecipe(recipeId);
    } catch {
      return { missingIngredients: [], availableIngredients: [] };
    }
  },

  /**
   * Get smart recipe recommendations based on pantry availability and user dietary preferences
   */
  async getRecipeRecommendations(options?: {
    maxRecommendations?: number;
    preferCompleteable?: boolean;
    categories?: string[];
    respectDietaryPreferences?: boolean;
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
        respectDietaryPreferences = true,
      } = options || {};
      const availability = await databaseFacade.getAvailableRecipes();

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

      // Convert to UI format first so we can apply dietary filtering
      const canMakeUI = await Promise.all(
        canMake.map(convertDbRecipeToUIRecipe)
      );
      const partiallyCanMakeUI = await Promise.all(
        partiallyCanMake.map(async (item) => ({
          recipe: await convertDbRecipeToUIRecipe(item.recipe),
          completionPercentage: item.completionPercentage,
        }))
      );

      // Apply dietary filtering if enabled
      let filteredCanMake = canMakeUI;
      let filteredPartiallyCanMake = partiallyCanMakeUI;

      if (respectDietaryPreferences) {
        filteredCanMake = [];
        filteredPartiallyCanMake = [];

        // Filter canMake recipes
        for (const recipe of canMakeUI) {
          if (await isRecipeSuitableForUser(recipe)) {
            filteredCanMake.push(recipe);
          }
        }

        // Filter partiallyCanMake recipes
        for (const item of partiallyCanMakeUI) {
          if (await isRecipeSuitableForUser(item.recipe)) {
            filteredPartiallyCanMake.push(item);
          }
        }
      }

      // Smart recommendation algorithm - works with UI Recipe models
      const scoreUIRecipe = (recipe: Recipe) => {
        let score = 0;

        // Prefer easier recipes (lower difficulty = higher score)
        score += (6 - (recipe.difficultyStars || 3)) * 10;

        // Prefer shorter prep/cook time
        const totalTime = (recipe.prepMinutes || 0) + (recipe.cookMinutes || 0);
        score += Math.max(0, 120 - totalTime) / 10; // Max bonus for recipes under 2 hours

        // Boost score for recipes that match dietary preferences
        if (respectDietaryPreferences) {
          const userDiet = storage.get(PREF_DIET_KEY) as string | undefined;
          if (
            userDiet &&
            userDiet !== "none" &&
            recipe.tags?.some(
              (tag) => tag.toLowerCase() === userDiet.toLowerCase()
            )
          ) {
            score += 50; // Significant boost for dietary preference match
          }
        }

        // Random factor for variety
        score += Math.random() * 20;

        return score;
      };

      // Sort and limit recommendations
      const sortedCanMake = filteredCanMake
        .sort((a, b) => scoreUIRecipe(b) - scoreUIRecipe(a))
        .slice(
          0,
          preferCompleteable
            ? maxRecommendations
            : Math.ceil(maxRecommendations * 0.6)
        );

      const sortedPartial = filteredPartiallyCanMake
        .sort((a, b) => {
          // Sort by completion percentage first, then by recipe score
          const completionDiff =
            b.completionPercentage - a.completionPercentage;
          if (completionDiff !== 0) return completionDiff;
          return scoreUIRecipe(b.recipe) - scoreUIRecipe(a.recipe);
        })
        .slice(0, maxRecommendations - sortedCanMake.length);

      return {
        canMakeRecommendations: sortedCanMake,
        partialRecommendations: sortedPartial,
      };
    } catch {
      return { canMakeRecommendations: [], partialRecommendations: [] };
    }
  },

  /**
   * Get user dietary preferences and allergens
   */
  getUserDietaryInfo(): {
    diet?: Diet;
    allergens: Allergen[];
    otherAllergens: string[];
  } {
    const diet = storage.get(PREF_DIET_KEY) as Diet | undefined;
    const allergens = (() => {
      const stored = storage.get(PREF_ALLERGENS_KEY);
      if (typeof stored !== "string" || !stored) return [];
      return stored.split(",") as Allergen[];
    })();
    const otherAllergens = (() => {
      const stored = storage.get(PREF_OTHER_ALLERGENS_KEY) as
        | string
        | undefined;
      if (!stored) return [];
      return stored
        .split(",")
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0);
    })();

    return { diet, allergens, otherAllergens };
  },

  /**
   * Check if a recipe is suitable for current user's dietary preferences
   */
  async isRecipeSuitableForUser(recipe: Recipe): Promise<boolean> {
    return await isRecipeSuitableForUser(recipe);
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
      unit: ing.unit,
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
