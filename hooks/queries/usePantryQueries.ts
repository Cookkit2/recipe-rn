import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pantryQueryKeys } from "./pantryQueryKeys";
import type { ItemType, PantryItem } from "~/types/PantryItem";
import { pantryApi } from "~/data/api/pantryApi";

/**
 * Hook to fetch all pantry items
 */
export function usePantryItems() {
  return useQuery({
    queryKey: pantryQueryKeys.items(),
    queryFn: pantryApi.fetchAllPantryItems,
    // staleTime: 2 * 60 * 1000, // 2 minutes - pantry data changes frequently
    staleTime: 1,
  });
}

/**
 * Hook to fetch pantry items by type with client-side filtering
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
 * Hook to search pantry items
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
 * Hook to get expiring items
 */
export function useExpiringItems(days: number = 3) {
  return useQuery({
    queryKey: pantryQueryKeys.expiring(days),
    queryFn: () => pantryApi.getExpiringItems(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation hook to add a pantry item
 */
export function useAddPantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pantryApi.addPantryItem,
    onSuccess: () => {
      // Invalidate all pantry queries to refetch data
      queryClient.invalidateQueries({
        queryKey: pantryQueryKeys.all,
      });
    },
  });
}

/**
 * Mutation hook to add an array of pantry items
 */
export function useAddPantryItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pantryApi.addPantryItems,
    onSuccess: () => {
      // Invalidate all pantry queries to refetch data
      queryClient.invalidateQueries({
        queryKey: pantryQueryKeys.all,
      });
    },
  });
}

/**
 * Mutation hook to update a pantry item
 */
export function useUpdatePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PantryItem>;
    }) => pantryApi.updatePantryItem(id, updates),
    onSuccess: (updatedItem) => {
      // Update the specific item in cache
      queryClient.setQueryData<PantryItem[]>(
        pantryQueryKeys.items(),
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((item) =>
            item.id === updatedItem.id ? updatedItem : item
          );
        }
      );

      // Also invalidate related queries
      queryClient.invalidateQueries({
        queryKey: pantryQueryKeys.expiring(),
      });
    },
  });
}

/**
 * Mutation hook to delete a pantry item
 */
export function useDeletePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pantryApi.deletePantryItem,
    onSuccess: (_, deletedId) => {
      // Remove the item from cache
      queryClient.setQueryData<PantryItem[]>(
        pantryQueryKeys.items(),
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.filter((item) => item.id !== deletedId);
        }
      );

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: pantryQueryKeys.expiring(),
      });
    },
  });
}

/**
 * Hook to manually refresh pantry data
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
