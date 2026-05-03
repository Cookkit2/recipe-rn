import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pantryQueryKeys } from "./pantryQueryKeys";
import { recipeQueryKeys } from "./recipeQueryKeys";
import type { ItemType, PantryItem } from "~/types/PantryItem";
import { pantryApi } from "~/data/api/pantryApi";
import { cancelExpiryNotification, rescheduleExpiryNotification } from "~/lib/notifications";
import { achievementService } from "~/data/services/AchievementService";
import { log } from "~/utils/logger";

/**
 * Hook to fetch all pantry items
 *
 * @returns React Query result with pantry items data
 *
 * @remarks
 * staleTime: 30 seconds - balances between freshness and performance
 * gcTime: 5 minutes - keeps cached data available for quick navigation back
 */
export function usePantryItems() {
  return useQuery({
    queryKey: pantryQueryKeys.items(),
    queryFn: pantryApi.fetchAllPantryItems,
    staleTime: 30 * 1000, // 30 seconds - balance between freshness and performance
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  });
}

/**
 * Hook to fetch pantry items filtered by type
 *
 * @param type - The item type to filter by (e.g., "produce", "dairy", "meat", "pantry", or "all")
 * @returns Filtered pantry items of the specified type
 *
 * @remarks
 * This hook uses client-side filtering on the cached pantry items data.
 * When type is "all", returns all items without filtering.
 */
export function usePantryItemsByType(type: ItemType) {
  const { data: allItems, ...rest } = usePantryItems();

  if (type === "all")
    return {
      ...rest,
      data: allItems ?? [],
    };

  return {
    ...rest,
    data: allItems?.filter((item) => item.type === type) ?? [],
  };
}

/**
 * Hook to search pantry items by name
 *
 * @param query - The search term to filter pantry items
 * @returns React Query result with filtered pantry items matching the search term
 *
 * @remarks
 * - Query is disabled until a search term is provided (query.length > 0)
 * - staleTime: 30 seconds for search results
 * - **Performance:** each run calls `fetchAllPantryItems` (full hydration). For typeahead UIs,
 *   prefer `usePantryItems()` plus client-side `filterPantryItemsByName` from `~/utils/filterPantryItemsByName`.
 */
export function useSearchPantryItems(query: string) {
  return useQuery({
    queryKey: pantryQueryKeys.search(query),
    queryFn: () => pantryApi.searchPantryItems(query),
    enabled: query.length > 0, // Only run query if there's a search term
    staleTime: 30 * 1000, // 30 seconds for search results
  });
}

/**
 * Hook to get items expiring within a specified number of days
 *
 * @param days - Number of days to look ahead for expiring items (default: 3)
 * @returns React Query result with pantry items expiring soon
 *
 * @remarks
 * staleTime: 5 minutes - expiry status changes infrequently
 */
export function useExpiringItems(days: number = 3) {
  return useQuery({
    queryKey: pantryQueryKeys.expiring(days),
    queryFn: () => pantryApi.getExpiringItems(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation hook to add a single pantry item
 *
 * @returns React Query mutation for adding a pantry item
 *
 * @remarks
 * Cache invalidation strategy:
 * - Invalidates all pantry queries to refresh the pantry list
 * - Invalidates recipe recommendations since available ingredients changed
 * - Invalidates available recipes as ingredient availability affects what can be cooked
 */
export function useAddPantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pantryApi.addPantryItem,
    onSuccess: async () => {
      // Check for achievements after adding new pantry item
      // This triggers achievement checks for ingredient tracking milestones
      try {
        await achievementService.checkAchievements();
      } catch (error) {
        // Non-critical - don't fail the add if achievement checking fails
        log.warn("Failed to check achievements after pantry item add:", error);
      }

      // Invalidate all pantry queries to refetch data
      queryClient.invalidateQueries({
        queryKey: pantryQueryKeys.all,
      });
      // Invalidate recipe recommendations since available ingredients changed
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.available(),
      });
    },
  });
}

/**
 * Mutation hook to add multiple pantry items at once
 *
 * @returns React Query mutation for adding an array of pantry items
 *
 * @remarks
 * Cache invalidation strategy:
 * - Invalidates all pantry queries to refresh the pantry list
 * - Invalidates recipe recommendations since available ingredients changed
 * - Invalidates available recipes as ingredient availability affects what can be cooked
 */
export function useAddPantryItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pantryApi.addPantryItems,
    onSuccess: async () => {
      // Check for achievements after adding new pantry items
      // This triggers achievement checks for ingredient tracking milestones
      try {
        await achievementService.checkAchievements();
      } catch (error) {
        // Non-critical - don't fail the add if achievement checking fails
        log.warn("Failed to check achievements after pantry items add:", error);
      }

      // Invalidate all pantry queries to refetch data
      queryClient.invalidateQueries({
        queryKey: pantryQueryKeys.all,
      });
      // Invalidate recipe recommendations since available ingredients changed
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.available(),
      });
    },
  });
}

/**
 * Mutation hook to add multiple pantry items with metadata (categories, synonyms)
 *
 * @returns React Query mutation for adding pantry items with additional metadata
 *
 * @remarks
 * Use this when adding pantry items that have category tags and synonyms for better ingredient matching.
 *
 * Cache invalidation strategy:
 * - Invalidates all pantry queries to refresh the pantry list
 * - Invalidates recipe recommendations since available ingredients changed
 * - Invalidates available recipes as ingredient availability affects what can be cooked
 */
export function useAddPantryItemsWithMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pantryApi.addPantryItemsWithMetadata,
    onSuccess: async () => {
      // Check for achievements after adding new pantry items with metadata
      // This triggers achievement checks for ingredient tracking milestones
      try {
        await achievementService.checkAchievements();
      } catch (error) {
        // Non-critical - don't fail the add if achievement checking fails
        log.warn("Failed to check achievements after pantry items with metadata add:", error);
      }

      // Invalidate all pantry queries to refetch data
      queryClient.invalidateQueries({
        queryKey: pantryQueryKeys.all,
      });
      // Invalidate recipe recommendations since available ingredients changed
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.available(),
      });
    },
  });
}

/**
 * Mutation hook to update an existing pantry item
 *
 * @returns React Query mutation for updating a pantry item
 *
 * @remarks
 * Updates the item in cache optimistically and reschedules expiry notifications if the item has an expiry date.
 *
 * Cache invalidation strategy:
 * - Updates the specific item in the pantry items cache
 * - Invalidates expiring items queries as expiry date may have changed
 * - Invalidates recipe recommendations since ingredient quantities may have changed
 * - Invalidates available recipes as ingredient availability affects what can be cooked
 */
export function useUpdatePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PantryItem> }) =>
      pantryApi.updatePantryItem(id, updates),
    onSuccess: async (updatedItem) => {
      // Reschedule expiry notification if item has an expiry date
      try {
        await rescheduleExpiryNotification(updatedItem);
      } catch {
        // Non-critical
      }

      // Check for achievements after updating pantry item
      // This triggers achievement checks for ingredient tracking milestones
      try {
        await achievementService.checkAchievements();
      } catch (error) {
        // Non-critical - don't fail the update if achievement checking fails
        log.warn("Failed to check achievements after pantry item update:", error);
      }

      // Update the specific item in cache
      queryClient.setQueryData<PantryItem[]>(pantryQueryKeys.items(), (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      });

      // Also invalidate related queries
      queryClient.invalidateQueries({
        queryKey: pantryQueryKeys.expiring(),
      });
      // Invalidate recipe recommendations since ingredient quantities may have changed
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.available(),
      });
    },
  });
}

/**
 * Mutation hook to delete a pantry item
 *
 * @returns React Query mutation for deleting a pantry item
 *
 * @remarks
 * Removes the item from cache and cancels any scheduled expiry notifications.
 *
 * Cache invalidation strategy:
 * - Removes the item from the pantry items cache
 * - Invalidates expiring items queries
 * - Invalidates recipe recommendations since available ingredients changed
 * - Invalidates available recipes as ingredient availability affects what can be cooked
 */
export function useDeletePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pantryApi.deletePantryItem,
    onSuccess: async (_, deletedId) => {
      // Cancel any scheduled expiry notification for this item
      try {
        await cancelExpiryNotification(deletedId);
      } catch {
        // Non-critical
      }

      // Remove the item from cache
      queryClient.setQueryData<PantryItem[]>(pantryQueryKeys.items(), (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((item) => item.id !== deletedId);
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: pantryQueryKeys.expiring(),
      });
      // Invalidate recipe recommendations since available ingredients changed
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.available(),
      });
    },
  });
}

/**
 * Hook to manually refresh pantry data
 *
 * @returns Object containing a refresh function
 *
 * @remarks
 * Call `refresh()` to invalidate and refetch all pantry queries.
 * Useful after making changes outside of the mutation hooks.
 */
export function useRefreshPantryItems() {
  const queryClient = useQueryClient();

  const refresh = () => {
    return queryClient.invalidateQueries({
      queryKey: pantryQueryKeys.all,
    });
  };

  return { refresh };
}
