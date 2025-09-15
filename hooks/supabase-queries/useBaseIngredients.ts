import { useQuery } from "@tanstack/react-query";
import { baseIngredientApi } from "~/data/supabase-api/BaseIngredientApi";

const baseIngredientQueryKeys = {
  // Base key for all pantry queries
  all: ["base_ingredient"] as const,
} as const;

/**
 * Hook to fetch pantry items by type with client-side filtering
 */
export function useBaseIngredients() {
  return useQuery({
    queryKey: baseIngredientQueryKeys.all,
    queryFn: baseIngredientApi.getAllBaseIngredients,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
  });
}
