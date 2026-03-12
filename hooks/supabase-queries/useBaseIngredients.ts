import { useQuery } from "@tanstack/react-query";
import { baseIngredientApi } from "~/data/supabase-api/BaseIngredientApi";

const baseIngredientQueryKeys = {
  // Base key for all pantry queries
  all: ["base_ingredient"] as const,
  // Key for specific pantry item query
  category: ["base_ingredient", "category"] as const,
  synonym: ["base_ingredient", "synonym"] as const,
} as const;

/**
 * Hook to fetch all base ingredients from Supabase.
 *
 * Fetches the complete list of base ingredients including categories and synonyms.
 * Data is cached for 24 hours to reduce network requests since base ingredients
 * change infrequently.
 *
 * @returns React Query result with base ingredients data
 *
 * @example
 * const { data: baseIngredients, isLoading } = useBaseIngredients();
 */
export function useBaseIngredients() {
  return useQuery({
    queryKey: baseIngredientQueryKeys.all,
    queryFn: baseIngredientApi.getAllBaseIngredients,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
  });
}

/**
 * Hook to fetch base ingredients for category-based operations.
 *
 * Provides the same data as useBaseIngredients but with a distinct query key
 * for category-specific invalidation or caching strategies.
 *
 * @returns React Query result with base ingredients data for category operations
 */
export function useIngredientsCategory() {
  return useQuery({
    queryKey: baseIngredientQueryKeys.category,
    queryFn: baseIngredientApi.getAllBaseIngredients,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
  });
}

/**
 * Hook to fetch base ingredients for synonym-based matching operations.
 *
 * Provides the same data as useBaseIngredients but with a distinct query key
 * for synonym-specific invalidation or caching strategies. Used for ingredient
 * name matching and normalization.
 *
 * @returns React Query result with base ingredients data for synonym operations
 */
export function useIngredientsSynonym() {
  return useQuery({
    queryKey: baseIngredientQueryKeys.synonym,
    queryFn: baseIngredientApi.getAllBaseIngredients,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
  });
}
