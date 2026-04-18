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
  getBaseIngredientByName: async (name: string): Promise<BaseIngredientWithRelations | null> => {
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
      const { data: ingredientFromSynonym, error: ingredientError } = await supabase!
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

  /**
   * Fetch multiple base ingredients by name in a single batch
   */
  getBaseIngredientsByNames: async (
    names: string[]
  ): Promise<Map<string, BaseIngredientWithRelations>> => {
    const resultMap = new Map<string, BaseIngredientWithRelations>();
    if (!guardSupabase() || names.length === 0) return resultMap;

    // Supabase string search with "ilike". We construct an "or" query.
    // e.g. "name.ilike.Apple,name.ilike.Banana"
    // Properly quote and escape the search strings for Supabase PostgREST parser
    // PostgREST expects string values containing commas or reserved chars to be double-quoted inside the OR string
    const orQueryNames = names.map((n) => `name.ilike."${n.replace(/"/g, '""')}"`).join(",");

    // Fetch direct matches using OR condition for ilike
    const { data: directMatches, error: directError } = await supabase!
      .from("base_ingredient")
      .select("*")
      .or(orQueryNames);

    if (directError) {
      throw directError;
    }

    const lowerNames = names.map((n) => n.toLowerCase());
    const foundNames = new Set((directMatches || []).map((row) => (row.name || "").toLowerCase()));
    const missingNames = lowerNames.filter((n) => !foundNames.has(n));

    let allMatchedIngredients = [...(directMatches || [])];

    // For any missing names, try finding by synonyms
    if (missingNames.length > 0) {
      const orQuerySynonyms = missingNames
        .map((n) => `synonym.ilike."${n.replace(/"/g, '""')}"`)
        .join(",");
      const { data: synonymMatches, error: synonymError } = await supabase!
        .from("ingredient_synonym")
        .select("base_ingredient_id, synonym")
        .or(orQuerySynonyms);

      if (!synonymError && synonymMatches) {
        const synonymIngredientIds = [
          ...new Set(
            synonymMatches
              .map((s) => s.base_ingredient_id)
              .filter((id): id is string => id !== null)
          ),
        ];

        if (synonymIngredientIds.length > 0) {
          const { data: ingredientsFromSynonyms, error: ingredientsError } = await supabase!
            .from("base_ingredient")
            .select("*")
            .in("id", synonymIngredientIds);

          if (!ingredientsError && ingredientsFromSynonyms) {
            allMatchedIngredients = [...allMatchedIngredients, ...ingredientsFromSynonyms];
          }
        }
      }
    }

    if (allMatchedIngredients.length === 0) return resultMap;

    // Deduplicate matched ingredients
    const uniqueIngredientsMap = new Map();
    allMatchedIngredients.forEach((ing) => {
      if (!uniqueIngredientsMap.has(ing.id)) {
        uniqueIngredientsMap.set(ing.id, ing);
      }
    });

    const uniqueIngredients = Array.from(uniqueIngredientsMap.values());
    const ingredientIds = uniqueIngredients.map((ing) => ing.id);

    // Fetch relations for all matched ingredients
    const [
      { data: allSynonyms, error: synonymError },
      { data: allCategoryLinks, error: categoryError },
    ] = await Promise.all([
      supabase!
        .from("ingredient_synonym")
        .select("id, synonym, base_ingredient_id")
        .in("base_ingredient_id", ingredientIds),
      supabase!
        .from("pivot_ingredient_category")
        .select("ingredient_category(id, name), ingredient_id")
        .in("ingredient_id", ingredientIds),
    ]);

    if (synonymError) throw synonymError;
    if (categoryError) throw categoryError;

    // Build the result
    for (const ingredient of uniqueIngredients) {
      const ingredientSynonyms = (allSynonyms || [])
        .filter((s) => s.base_ingredient_id === ingredient.id)
        .map((s) => ({ id: s.id, synonym: s.synonym }));

      const ingredientCategoryLinks = (allCategoryLinks || []).filter(
        (c) => c.ingredient_id === ingredient.id
      );

      const categories = ingredientCategoryLinks
        .map((link) => link.ingredient_category)
        .filter((c: any): c is { id: string; name: string } => c !== null);

      const fullIngredient: BaseIngredientWithRelations = {
        ...ingredient,
        synonyms: ingredientSynonyms,
        categories: categories,
      };

      // Map it back to the requested names it could match
      // It matches its own name
      resultMap.set((ingredient.name || "").toLowerCase(), fullIngredient);

      // And it matches any of its synonyms
      for (const syn of ingredientSynonyms) {
        resultMap.set((syn.synonym || "").toLowerCase(), fullIngredient);
      }
    }

    return resultMap;
  },

  getAllBaseIngredients: async () => {
    if (!guardSupabase()) return [];
    const { data, error } = await supabase!.from("base_ingredient").select("*");
    if (error) throw error;
    return data;
  },

  getAllSynonyms: async () => {
    if (!guardSupabase()) return [];
    const { data, error } = await supabase!.from("ingredient_synonym").select("*");
    if (error) throw error;
    return data;
  },

  getAllCategories: async () => {
    if (!guardSupabase()) return [];
    const { data, error } = await supabase!.from("ingredient_category").select("*");
    if (error) throw error;
    return data;
  },
};

/**
 * Helper to fetch synonyms and categories for a base ingredient
 */
async function fetchRelatedData(baseIngredientId: string): Promise<BaseIngredientWithRelations> {
  const [
    { data: baseIngredient, error: baseError },
    { data: synonyms, error: synonymError },
    { data: categoryLinks, error: categoryError },
  ] = await Promise.all([
    supabase!.from("base_ingredient").select("*").eq("id", baseIngredientId).single(),
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
      (c: { id: string; name: string } | null): c is { id: string; name: string } => c !== null
    ),
  };
}
