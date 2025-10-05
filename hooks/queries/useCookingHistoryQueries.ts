import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databaseFacade } from "~/data/db";
import type { RecordCookingData } from "~/data/db/DatabaseFacade";
import { recipeQueryKeys } from "./recipeQueryKeys";

/**
 * Query keys for cooking history-related queries
 */
export const cookingHistoryQueryKeys = {
  all: ["cookingHistory"] as const,
  history: (limit?: number) =>
    [...cookingHistoryQueryKeys.all, "list", limit] as const,
  recentRecipes: (limit?: number) =>
    [...cookingHistoryQueryKeys.all, "recent", limit] as const,
  mostCooked: (limit?: number) =>
    [...cookingHistoryQueryKeys.all, "mostCooked", limit] as const,
  recipeCookCount: (recipeId: string) =>
    [...cookingHistoryQueryKeys.all, "cookCount", recipeId] as const,
};

/**
 * Hook to fetch cooking history
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
 */
export function useRecordCooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      data,
    }: {
      recipeId: string;
      data?: RecordCookingData;
    }) => databaseFacade.recordCooking(recipeId, data),
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
    },
  });
}

/**
 * Mutation hook to delete a cooking record
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
    },
  });
}

/**
 * Hook to manually refresh cooking history data
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
