import { supabase } from "~/lib/supabase/supabase-client";

function guardSupabase() {
  return supabase != null;
}

export interface BaseIngredientWithRelations {
  id: string;
  name: string;
  storage_type: string;
  days_to_expire: number;
  steps_to_store_id: string | null;
  synonyms: Array<{ id: string; synonym: string }>;
  categories: Array<{ id: string; name: string }>;
}

export const baseIngredientApi = {
  /**
   * Fetch a base ingredient by name with its synonyms and categories
   */
  getBaseIngredientByName: async (
    name: string
  ): Promise<BaseIngredientWithRelations | null> => {
    if (!guardSupabase()) return null;
    const { data: baseIngredient, error: baseError } = await supabase!
      .from("base_ingredient")
      .select("*")
      .ilike("name", name)
      .single();

    if (baseError && baseError.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      throw baseError;
    }

    if (!baseIngredient) {
      // Try to find by synonym
      const { data: synonymData, error: synonymError } = await supabase!
        .from("ingredient_synonym")
        .select("base_ingredient_id")
        .ilike("synonym", name)
        .single();

      if (synonymError && synonymError.code !== "PGRST116") {
        throw synonymError;
      }

      if (!synonymData || !synonymData.base_ingredient_id) {
        return null; // No match found
      }

      // Fetch the base ingredient by ID from synonym match
      const { data: ingredientFromSynonym, error: ingredientError } =
        await supabase!
          .from("base_ingredient")
          .select("*")
          .eq("id", synonymData.base_ingredient_id)
          .single();

      if (ingredientError) throw ingredientError;

      if (!ingredientFromSynonym) return null;

      // Fetch synonyms and categories for this ingredient
      return await fetchRelatedData(ingredientFromSynonym.id);
    }

    // Fetch synonyms and categories
    return await fetchRelatedData(baseIngredient.id);
  },

  getAllBaseIngredients: async () => {
    if (!guardSupabase()) return [];
    const { data, error } = await supabase!.from("base_ingredient").select("*");
    if (error) throw error;
    return data;
  },

  getAllSynonyms: async () => {
    if (!guardSupabase()) return [];
    const { data, error } = await supabase!
      .from("ingredient_synonym")
      .select("*");
    if (error) throw error;
    return data;
  },

  getAllCategories: async () => {
    if (!guardSupabase()) return [];
    const { data, error } = await supabase!
      .from("ingredient_category")
      .select("*");
    if (error) throw error;
    return data;
  },
};

/**
 * Helper to fetch synonyms and categories for a base ingredient
 */
async function fetchRelatedData(
  baseIngredientId: string
): Promise<BaseIngredientWithRelations> {
  const [
    { data: baseIngredient, error: baseError },
    { data: synonyms, error: synonymError },
    { data: categoryLinks, error: categoryError },
  ] = await Promise.all([
    supabase!
      .from("base_ingredient")
      .select("*")
      .eq("id", baseIngredientId)
      .single(),
    supabase!
      .from("ingredient_synonym")
      .select("id, synonym")
      .eq("base_ingredient_id", baseIngredientId),
    supabase!
      .from("pivot_ingredient_category")
      .select("ingredient_category(id, name)")
      .eq("ingredient_id", baseIngredientId),
  ]);

  if (baseError) throw baseError;
  if (synonymError) throw synonymError;
  // Don't throw on category error - ingredient might not have categories
  if (categoryError && categoryError.code !== "PGRST116") {
    throw categoryError;
  }

  // Extract categories from the nested structure
  const categories =
    categoryLinks?.map(
      (link: { ingredient_category: { id: string; name: string } | null }) =>
        link.ingredient_category
    ) || [];

  return {
    ...baseIngredient,
    synonyms: synonyms || [],
    categories: categories.filter(
      (
        c: { id: string; name: string } | null
      ): c is { id: string; name: string } => c !== null
    ),
  };
}
