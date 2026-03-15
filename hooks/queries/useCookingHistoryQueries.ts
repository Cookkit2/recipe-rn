import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databaseFacade } from "~/data/db";
import type { RecordCookingData } from "~/data/db/DatabaseFacade";
import { recipeQueryKeys } from "./recipeQueryKeys";

/**
 * Query keys for cooking history-related queries
 */
export const cookingHistoryQueryKeys = {
  all: ["cookingHistory"] as const,
  history: (limit?: number) => [...cookingHistoryQueryKeys.all, "list", limit] as const,
  recentRecipes: (limit?: number) => [...cookingHistoryQueryKeys.all, "recent", limit] as const,
  mostCooked: (limit?: number) => [...cookingHistoryQueryKeys.all, "mostCooked", limit] as const,
  recipeCookCount: (recipeId: string) =>
    [...cookingHistoryQueryKeys.all, "cookCount", recipeId] as const,
};

/**
 * Hook to fetch cooking history
 *
 * @param limit - Optional maximum number of records to return
 * @returns React Query result with cooking history array
 *
 * @example
 * ```tsx
 * const { data: history, isLoading } = useCookingHistory(20);
 * ```
 */
export function useCookingHistory(limit?: number) {
  return useQuery({
    queryKey: cookingHistoryQueryKeys.history(limit),
    queryFn: () => databaseFacade.getCookingHistory(limit),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch recently cooked recipes (unique recipes)
 *
 * Returns a list of unique recipes that have been cooked recently,
 * ordered by most recent cooking session.
 *
 * @param limit - Maximum number of recipes to return (default: 10)
 * @returns React Query result with unique recipe array
 *
 * @example
 * ```tsx
 * const { data: recipes, isLoading } = useRecentlyCookedRecipes(5);
 * ```
 */
export function useRecentlyCookedRecipes(limit: number = 10) {
  return useQuery({
    queryKey: cookingHistoryQueryKeys.recentRecipes(limit),
    queryFn: () => databaseFacade.getRecentlyCookedRecipes(limit),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch most frequently cooked recipes
 *
 * Returns recipes ordered by cooking frequency (most cooked first).
 * Useful for "cooked again" features or favorite recipes.
 *
 * @param limit - Maximum number of recipes to return (default: 10)
 * @returns React Query result with most cooked recipe array
 *
 * @example
 * ```tsx
 * const { data: favorites, isLoading } = useMostCookedRecipes(10);
 * ```
 */
export function useMostCookedRecipes(limit: number = 10) {
  return useQuery({
    queryKey: cookingHistoryQueryKeys.mostCooked(limit),
    queryFn: () => databaseFacade.getMostCookedRecipes(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get cook count for a specific recipe
 *
 * Returns the number of times a recipe has been cooked.
 * Query is only enabled when a valid recipeId is provided.
 *
 * @param recipeId - ID of the recipe to get cook count for
 * @returns React Query result with cook count number
 *
 * @example
 * ```tsx
 * const { data: count } = useRecipeCookCount("recipe-123");
 * // count: 5 (cooked 5 times)
 * ```
 */
export function useRecipeCookCount(recipeId: string) {
  return useQuery({
    queryKey: cookingHistoryQueryKeys.recipeCookCount(recipeId),
    queryFn: () => databaseFacade.getRecipeCookCount(recipeId),
    enabled: !!recipeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Mutation hook to record a new cooking session
 *
 * Records when a user cooks a recipe, optionally with additional data
 * like rating or notes. Invalidates all cooking history queries and
 * recipe recommendations (which use history for ranking).
 *
 * @returns React Query mutation with mutate, mutateAsync, and other methods
 *
 * @example
 * ```tsx
 * const { mutate: recordCooking, isPending } = useRecordCooking();
 *
 * recordCooking({
 *   recipeId: "recipe-123",
 *   data: { rating: 5, notes: "Delicious!" }
 * });
 * ```
 */
export function useRecordCooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipeId, data }: { recipeId: string; data?: RecordCookingData }) =>
      databaseFacade.recordCooking(recipeId, data),
    onSuccess: (_, { recipeId }) => {
      // Invalidate all cooking history queries
      queryClient.invalidateQueries({
        queryKey: cookingHistoryQueryKeys.all,
      });
      // Invalidate recipe recommendations (they might be affected by cooking history)
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      // Invalidate specific recipe cook count
      queryClient.invalidateQueries({
        queryKey: cookingHistoryQueryKeys.recipeCookCount(recipeId),
      });
    },
  });
}

/**
 * Mutation hook to update a cooking record
 *
 * Updates an existing cooking record with new data (e.g., changing rating
 * or adding notes after cooking). Invalidates all cooking history queries.
 *
 * @returns React Query mutation with mutate, mutateAsync, and other methods
 *
 * @example
 * ```tsx
 * const { mutate: updateRecord } = useUpdateCookingRecord();
 *
 * updateRecord({
 *   id: "cooking-record-123",
 *   data: { rating: 4, notes: "Pretty good!" }
 * });
 * ```
 */
export function useUpdateCookingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecordCookingData }) =>
      databaseFacade.updateCookingRecord(id, data),
    onSuccess: () => {
      // Invalidate all cooking history queries
      queryClient.invalidateQueries({
        queryKey: cookingHistoryQueryKeys.all,
      });
      // Invalidate recipe recommendations (they might be affected by cooking history)
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
    },
  });
}

/**
 * Mutation hook to delete a cooking record
 *
 * Removes a cooking record from history. Invalidates all cooking history
 * queries to reflect the deletion.
 *
 * @returns React Query mutation with mutate, mutateAsync, and other methods
 *
 * @example
 * ```tsx
 * const { mutate: deleteRecord } = useDeleteCookingRecord();
 *
 * deleteRecord("cooking-record-123");
 * ```
 */
export function useDeleteCookingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => databaseFacade.deleteCookingRecord(id),
    onSuccess: () => {
      // Invalidate all cooking history queries
      queryClient.invalidateQueries({
        queryKey: cookingHistoryQueryKeys.all,
      });
      // Invalidate recipe recommendations (they might be affected by cooking history)
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
    },
  });
}

/**
 * Hook to manually refresh cooking history data
 *
 * Provides a manual refresh function to invalidate and refetch all
 * cooking history queries. Useful after external data changes.
 *
 * @returns Object containing refresh function
 *
 * @example
 * ```tsx
 * const { refresh } = useRefreshCookingHistory();
 *
 * <Button onPress={refresh}>Refresh History</Button>
 * ```
 */
export function useRefreshCookingHistory() {
  const queryClient = useQueryClient();

  const refresh = () => {
    return queryClient.invalidateQueries({
      queryKey: cookingHistoryQueryKeys.all,
    });
  };

  return { refresh };
}
