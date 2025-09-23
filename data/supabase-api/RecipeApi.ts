import { supabase } from "~/lib/supabase/supabase-client";
import type { Tables } from "~/lib/supabase/supabase-types";

export interface SupabaseRecipeWithDetails {
  recipe: Tables<"recipe">;
  steps: Tables<"recipe_step">[];
  ingredients: Tables<"pivot_recipe_ingredient">[];
}

export const recipeApi = {
  /**
   * Get all recipes from Supabase
   */
  getAllRecipes: async (): Promise<Tables<"recipe">[]> => {
    const { data, error } = await supabase.from("recipe").select("*");
    if (error) throw error;
    return data;
  },

  /**
   * Get newest recipes from Supabase (ordered by creation/modification date)
   * @param limit - Maximum number of recipes to fetch (default: 50)
   */
  getNewestRecipes: async (limit: number = 50): Promise<Tables<"recipe">[]> => {
    const { data, error } = await supabase
      .from("recipe")
      .select("*")
      .order("id", { ascending: false }) // Assuming newer recipes have higher IDs
      .limit(limit);
    if (error) throw error;
    return data;
  },

  /**
   * Get a single recipe with all its details (steps and ingredients)
   */
  getRecipeWithDetailsSupabase: async (
    recipeId: string
  ): Promise<SupabaseRecipeWithDetails | null> => {
    // Fetch recipe details
    const { data: recipe, error: recipeError } = await supabase
      .from("recipe")
      .select("*")
      .eq("id", recipeId)
      .single();

    if (recipeError) throw recipeError;
    if (!recipe) return null;

    // Fetch recipe steps
    const { data: steps, error: stepsError } = await supabase
      .from("recipe_step")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("step", { ascending: true });

    if (stepsError) throw stepsError;

    // Fetch recipe ingredients
    const { data: ingredients, error: ingredientsError } = await supabase
      .from("pivot_recipe_ingredient")
      .select("*")
      .eq("recipe_id", recipeId);

    if (ingredientsError) throw ingredientsError;

    const currentRecipe = {
      recipe,
      steps: steps || [],
      ingredients: ingredients || [],
    };

    console.log("Fetched recipe with details:", currentRecipe);

    return currentRecipe;
  },

  /**
   * Get multiple recipes with their details
   */
  getRecipesWithDetailsSupabase: async (
    limit: number = 50
  ): Promise<SupabaseRecipeWithDetails[]> => {
    // First get the newest recipes
    const recipes = await recipeApi.getNewestRecipes(limit);

    // Then fetch details for each recipe
    const recipesWithDetails = await Promise.all(
      recipes.map(async (recipe) => {
        const details = await recipeApi.getRecipeWithDetailsSupabase(recipe.id);
        return details; // May be null, will filter below
      })
    );

    const filtered = recipesWithDetails.filter((recipe) => recipe !== null);

    return filtered;
  },

  /**
   * Get recipes by specific IDs
   */
  getRecipesByIds: async (recipeIds: string[]): Promise<Tables<"recipe">[]> => {
    if (recipeIds.length === 0) return [];

    const { data, error } = await supabase
      .from("recipe")
      .select("*")
      .in("id", recipeIds);

    if (error) throw error;
    return data;
  },
};
