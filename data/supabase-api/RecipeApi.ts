import { supabase } from "~/lib/supabase/supabase-client";
import type { Tables } from "~/lib/supabase/supabase-types";

function guardSupabase() {
  if (!supabase) return false;
  return true;
}

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
    if (!guardSupabase()) return [];
    const { data, error } = await supabase!.from("recipe").select("*");
    if (error) throw error;
    return data;
  },

  /**
   * Get newest recipes from Supabase (ordered by creation/modification date)
   * @param limit - Maximum number of recipes to fetch (default: 1000)
   */
  getNewestRecipes: async (limit: number = 1000): Promise<Tables<"recipe">[]> => {
    if (!guardSupabase()) return [];
    const { data, error } = await supabase!
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
    if (!guardSupabase()) return null;
    const { data, error } = await supabase!
      .from("recipe")
      .select(
        `
        *,
        recipe_step!recipe_step_recipe_id_fkey(*),
        pivot_recipe_ingredient!pivot_recipe_ingredient_recipe_id_fkey(*)
      `
      )
      .eq("id", recipeId)
      .order("step", { referencedTable: "recipe_step", ascending: true })
      .single();

    if (error) throw error;
    if (!data) return null;

    // Transform the nested structure to match our interface
    const currentRecipe: SupabaseRecipeWithDetails = {
      recipe: data,
      steps: (data.recipe_step || []) as Tables<"recipe_step">[],
      ingredients: (data.pivot_recipe_ingredient || []) as Tables<"pivot_recipe_ingredient">[],
    };

    return currentRecipe;
  },

  /**
   * Get multiple recipes with their details
   */
  getRecipesWithDetailsSupabase: async (
    limit: number = 1000
  ): Promise<SupabaseRecipeWithDetails[]> => {
    if (!guardSupabase()) return [];

    // Fetch all recipes first (without joins) to get the complete list
    const { data: allRecipes, error: recipesError } = await supabase!
      .from("recipe")
      .select("*")
      .order("id", { ascending: false })
      .limit(limit);

    if (recipesError) {
      console.error("[RecipeApi] Error fetching recipes:", recipesError);
      throw recipesError;
    }

    if (!allRecipes || allRecipes.length === 0) {
      return [];
    }

    // Fetch steps and ingredients separately for better performance
    const recipeIds = allRecipes.map((r) => r.id);

    const { data: steps } = await supabase!
      .from("recipe_step")
      .select("*")
      .in("recipe_id", recipeIds);

    const { data: ingredients } = await supabase!
      .from("pivot_recipe_ingredient")
      .select("*")
      .in("recipe_id", recipeIds);

    // Group by recipe ID
    const stepsByRecipe = new Map<string, Tables<"recipe_step">[]>();
    steps?.forEach((step) => {
      const recipeId = step.recipe_id;
      if (!stepsByRecipe.has(recipeId)) {
        stepsByRecipe.set(recipeId, []);
      }
      stepsByRecipe.get(recipeId)!.push(step);
    });

    const ingredientsByRecipe = new Map<string, Tables<"pivot_recipe_ingredient">[]>();
    ingredients?.forEach((ingredient) => {
      const recipeId = ingredient.recipe_id;
      if (!ingredientsByRecipe.has(recipeId)) {
        ingredientsByRecipe.set(recipeId, []);
      }
      ingredientsByRecipe.get(recipeId)!.push(ingredient);
    });

    // Transform to our format
    return allRecipes.map((recipe) => ({
      recipe,
      steps: stepsByRecipe.get(recipe.id) || [],
      ingredients: ingredientsByRecipe.get(recipe.id) || [],
    }));
  },

  /**
   * Get recipes by specific IDs
   */
  getRecipesByIds: async (recipeIds: string[]): Promise<Tables<"recipe">[]> => {
    if (recipeIds.length === 0 || !guardSupabase()) return [];

    const { data, error } = await supabase!.from("recipe").select("*").in("id", recipeIds);

    if (error) throw error;
    return data;
  },
};
