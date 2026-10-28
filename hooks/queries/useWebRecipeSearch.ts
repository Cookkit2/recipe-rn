import { useQuery } from "@tanstack/react-query";
import { searchWebRecipes } from "~/data/api/webRecipeSearchApi";
import { normalizeWebRecipeQuery } from "~/utils/web-recipe-search";

export const webRecipeSearchKeys = {
  results: (query: string) => ["web-recipe-search", normalizeWebRecipeQuery(query)] as const,
};

/** Only called with a submitted query; typing continues to use local search. */
export function useWebRecipeSearch(query: string, enabled: boolean) {
  const normalized = normalizeWebRecipeQuery(query);
  return useQuery({
    queryKey: webRecipeSearchKeys.results(normalized),
    queryFn: ({ signal }) => searchWebRecipes(normalized, signal),
    enabled: enabled && normalized.length >= 2 && normalized.length <= 200,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
