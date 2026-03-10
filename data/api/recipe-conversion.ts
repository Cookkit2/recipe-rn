import { log } from "~/utils/logger";
import type { Recipe } from "~/types/Recipe";

type RecipeWithDetails = {
  recipe: {
    id: string;
    title: string;
    description: string;
    imageUrl?: string | null;
    prepMinutes?: number | null;
    cookMinutes?: number | null;
    difficultyStars?: number | null;
    servings?: number | null;
    sourceUrl?: string | null;
    calories?: number | null;
    tags?: string[] | null;
  };
  steps: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit?: string | null;
    notes?: string | null;
  }>;
};

export type DbRecipeForConversion = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  difficultyStars?: number | null;
  servings?: number | null;
  sourceUrl?: string | null;
  calories?: number | null;
  tags?: string[] | null;
};

/**
 * Batch version of convertDbRecipeToUIRecipe that uses pre-fetched recipe details.
 *
 * This function performs NO database calls itself. It converts database recipe models
 * into UI-ready Recipe objects using a pre-fetched details map.
 */
export const convertDbRecipesToUIRecipesBatch = (
  dbRecipes: DbRecipeForConversion[],
  recipeDetailsMap: Map<string, RecipeWithDetails>
): Recipe[] => {
  const result: Recipe[] = [];

  for (const dbRecipe of dbRecipes) {
    const recipeDetails = recipeDetailsMap.get(dbRecipe.id);

    if (!recipeDetails) {
      log.warn(`Missing recipe details for recipe ${dbRecipe.id}, skipping`);
      continue;
    }

    const { recipe, steps, ingredients } = recipeDetails;

    result.push({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl || "",
      prepMinutes: recipe.prepMinutes ?? undefined,
      cookMinutes: recipe.cookMinutes ?? undefined,
      difficultyStars: recipe.difficultyStars ?? undefined,
      servings: recipe.servings ?? undefined,
      sourceUrl: recipe.sourceUrl ?? undefined,
      calories: recipe.calories ?? undefined,
      tags: recipe.tags ?? undefined,
      ingredients: ingredients.map((ing) => ({
        name: ing.name,
        relatedIngredientId: ing.id,
        quantity: ing.quantity,
        unit: ing.unit ?? "",
        notes: ing.notes ?? undefined,
      })),
      instructions: steps.map((step) => ({
        step: step.step,
        title: step.title,
        description: step.description,
        relatedIngredientIds: [],
      })),
    });
  }

  return result;
};

