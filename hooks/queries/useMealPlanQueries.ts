import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mealPlanQueryKeys } from "./mealPlanQueryKeys";
import { mealPlanApi, type MealPlanItemWithRecipe } from "~/data/api/mealPlanApi";

/**
 * Hook to fetch all meal plan items with their associated recipes
 *
 * @returns React Query result with meal plan items
 *
 * @remarks
 * staleTime: 30 seconds - meal plan may change frequently
 * gcTime: 5 minutes - keeps cached data available for quick navigation back
 */
export function useMealPlanItems() {
  return useQuery({
    queryKey: mealPlanQueryKeys.items(),
    queryFn: mealPlanApi.getAllMealPlanItems,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch meal plans for a specific date range (calendar view)
 */
export function useCalendarMealPlans(startDate: Date, endDate: Date, enabled: boolean = true) {
  return useQuery({
    queryKey: [
      ...mealPlanQueryKeys.all,
      "dateRange",
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: () => mealPlanApi.getMealPlansForDateRange(startDate, endDate),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to check if a specific recipe is in the meal plan
 *
 * @param recipeId - The ID of the recipe to check
 * @returns React Query result with boolean indicating if recipe is in plan
 *
 * @remarks
 * - Query is disabled until a recipeId is provided
 * - staleTime: 30 seconds
 */
export function useIsRecipeInPlan(recipeId: string) {
  return useQuery({
    queryKey: mealPlanQueryKeys.isInPlan(recipeId),
    queryFn: () => mealPlanApi.isRecipeInPlan(recipeId),
    enabled: !!recipeId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to get the total count of planned recipes
 *
 * @returns React Query result with the number of recipes in the meal plan
 *
 * @remarks
 * staleTime: 30 seconds
 */
export function usePlannedRecipeCount() {
  return useQuery({
    queryKey: mealPlanQueryKeys.count(),
    queryFn: mealPlanApi.getPlannedRecipeCount,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to get grocery item attributes (checked state, deleted state)
 *
 * @returns React Query result with a map of normalized ingredient names to their attributes
 *
 * @remarks
 * Returns a record where keys are normalized ingredient names and values contain:
 * - `isChecked`: Whether the item is checked off in the grocery list
 * - `isDeleted`: Whether the item has been hidden from the grocery list
 *
 * staleTime: 30 seconds
 */
export function useGroceryItemAttributes() {
  return useQuery({
    queryKey: ["grocery_attributes"],
    queryFn: async () => {
      const map = await mealPlanApi.getGroceryItemAttributes();
      return Object.fromEntries(map);
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to get grocery item check states
 * @deprecated Use useGroceryItemAttributes instead
 */
export function useGroceryCheckStates() {
  return useQuery({
    queryKey: mealPlanQueryKeys.groceryChecks(),
    queryFn: async () => {
      // Fallback for compatibility
      const map = await mealPlanApi.getGroceryCheckStates();
      return Object.fromEntries(map);
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Mutation hook to add a recipe to the meal plan
 *
 * @returns React Query mutation for adding a recipe with specified servings
 *
 * @remarks
 * Uses optimistic updates to immediately show the recipe as planned.
 *
 * Cache invalidation strategy:
 * - Optimistically updates the specific recipe's isInPlan query
 * - On success, invalidates: items list, count, and the specific recipe's isInPlan query
 * - On error, rolls back the optimistic update
 * - Does NOT invalidate all isInPlan queries to avoid all recipes appearing as planned
 */
export function useAddToMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      servings,
      date,
      mealSlot,
    }: {
      recipeId: string;
      servings: number;
      date?: Date;
      mealSlot?: string;
    }) => mealPlanApi.addToPlan(recipeId, servings, date, mealSlot),
    onMutate: async ({ recipeId }) => {
      // Cancel outgoing queries for this specific recipe
      await queryClient.cancelQueries({
        queryKey: mealPlanQueryKeys.isInPlan(recipeId),
      });

      // Snapshot previous value
      const previousValue = queryClient.getQueryData<boolean>(mealPlanQueryKeys.isInPlan(recipeId));

      // Optimistically update to show as in plan
      queryClient.setQueryData<boolean>(mealPlanQueryKeys.isInPlan(recipeId), true);

      return { previousValue, recipeId };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(
          mealPlanQueryKeys.isInPlan(context.recipeId),
          context.previousValue
        );
      }
    },
    onSettled: (_, __, { recipeId }) => {
      // Only invalidate queries that need to be refreshed:
      // - The meal plan items list (for grocery list)
      // - The count
      // - The specific recipe's isInPlan query
      // - The dateRange queries (for calendar view)
      // DO NOT invalidate all isInPlan queries as that causes all recipes to appear as planned
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.count(),
      });
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.isInPlan(recipeId),
        exact: true,
      });
      // Invalidate all dateRange queries when a recipe is added to a specific date
      queryClient.invalidateQueries({
        queryKey: [...mealPlanQueryKeys.all, "dateRange"],
      });
    },
  });
}

/**
 * Mutation hook to remove a recipe from the meal plan
 *
 * @returns React Query mutation for removing a recipe
 *
 * @remarks
 * Uses optimistic updates to immediately show the recipe as not planned.
 *
 * Cache invalidation strategy:
 * - Optimistically updates the specific recipe's isInPlan query
 * - On success, invalidates: items list, count, and the specific recipe's isInPlan query
 * - On error, rolls back the optimistic update
 */
export function useRemoveFromMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipeId: string) => mealPlanApi.removeFromPlan(recipeId),
    onMutate: async (recipeId) => {
      // Cancel outgoing queries for this specific recipe
      await queryClient.cancelQueries({
        queryKey: mealPlanQueryKeys.isInPlan(recipeId),
      });

      // Snapshot previous value
      const previousValue = queryClient.getQueryData<boolean>(mealPlanQueryKeys.isInPlan(recipeId));

      // Optimistically update to show as not in plan
      queryClient.setQueryData<boolean>(mealPlanQueryKeys.isInPlan(recipeId), false);

      return { previousValue, recipeId };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(
          mealPlanQueryKeys.isInPlan(context.recipeId),
          context.previousValue
        );
      }
    },
    onSettled: (_, __, recipeId) => {
      // Only invalidate queries that need to be refreshed:
      // - The meal plan items list (for grocery list)
      // - The count
      // - The specific recipe's isInPlan query
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.count(),
      });
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.isInPlan(recipeId),
        exact: true,
      });
    },
  });
}

/**
 * Mutation hook to update the servings for a planned recipe
 *
 * @returns React Query mutation for updating recipe servings
 *
 * @remarks
 * Cache invalidation strategy:
 * - Invalidates items list to update the grocery list quantities
 * - Does NOT invalidate isInPlan queries as the recipe is still in the plan
 */
export function useUpdateMealPlanServings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipeId, servings }: { recipeId: string; servings: number }) =>
      mealPlanApi.updateServings(recipeId, servings),
    onSuccess: () => {
      // Only invalidate items list, not isInPlan queries
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.items(),
      });
    },
  });
}

/**
 * Mutation hook to clear all planned recipes from the meal plan
 *
 * @returns React Query mutation for clearing the meal plan
 *
 * @remarks
 * Cache invalidation strategy:
 * - Invalidates items list and count queries
 * - Resets all isInPlan caches to false since all recipes are removed
 */
export function useClearMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mealPlanApi.clearAllPlannedRecipes(),
    onSuccess: () => {
      // When clearing all, we need to reset all isInPlan queries
      // Use refetchType: 'all' to force refetch even if stale
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.count(),
      });
      // Reset all isInPlan caches to false since all recipes are removed
      queryClient.resetQueries({
        queryKey: [...mealPlanQueryKeys.all, "isInPlan"],
      });
    },
  });
}

/**
 * Mutation hook to toggle the check state of a grocery item
 *
 * @returns React Query mutation for toggling item check state
 *
 * @remarks
 * Uses optimistic updates to immediately show the new check state.
 *
 * Cache invalidation strategy:
 * - Optimistically updates both grocery_checks and grocery_attributes queries
 * - On error, rolls back to previous state
 * - On settled, refetches to ensure consistency
 */
export function useToggleGroceryItemCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredientName: string) => mealPlanApi.toggleGroceryItemCheck(ingredientName),
    onMutate: async (ingredientName) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: mealPlanQueryKeys.groceryChecks(),
      });
      await queryClient.cancelQueries({
        queryKey: ["grocery_attributes"],
      });

      // Snapshot previous value
      const previousChecks = queryClient.getQueryData<Record<string, boolean>>(
        mealPlanQueryKeys.groceryChecks()
      );
      const previousAttributes = queryClient.getQueryData<
        Record<string, { isChecked: boolean; isDeleted: boolean }>
      >(["grocery_attributes"]);

      const normalizedName = ingredientName.toLowerCase().trim();

      // Optimistically update checks (deprecated hook)
      if (previousChecks) {
        queryClient.setQueryData<Record<string, boolean>>(mealPlanQueryKeys.groceryChecks(), {
          ...previousChecks,
          [normalizedName]: !previousChecks[normalizedName],
        });
      }

      // Optimistically update attributes (new hook)
      if (previousAttributes) {
        const prev = previousAttributes[normalizedName] || { isChecked: false, isDeleted: false };
        queryClient.setQueryData<Record<string, { isChecked: boolean; isDeleted: boolean }>>(
          ["grocery_attributes"],
          {
            ...previousAttributes,
            [normalizedName]: { ...prev, isChecked: !prev.isChecked },
          }
        );
      }

      return { previousChecks, previousAttributes };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousChecks) {
        queryClient.setQueryData(mealPlanQueryKeys.groceryChecks(), context.previousChecks);
      }
      if (context?.previousAttributes) {
        queryClient.setQueryData(["grocery_attributes"], context.previousAttributes);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.groceryChecks(),
      });
      queryClient.invalidateQueries({
        queryKey: ["grocery_attributes"],
      });
    },
  });
}

/**
 * Mutation hook to hide a grocery item from the list
 *
 * @returns React Query mutation for hiding a grocery item
 *
 * @remarks
 * This marks an item as deleted but doesn't remove it from storage.
 * The item can be restored with useRestoreGroceryItem.
 *
 * Cache invalidation strategy:
 * - Optimistically updates the grocery_attributes query
 * - On settled, refetches to ensure consistency
 */
export function useDeleteGroceryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredientName: string) => mealPlanApi.setGroceryItemDeleted(ingredientName, true),
    onMutate: async (ingredientName) => {
      await queryClient.cancelQueries({
        queryKey: ["grocery_attributes"],
      });

      const previousAttributes = queryClient.getQueryData<
        Record<string, { isChecked: boolean; isDeleted: boolean }>
      >(["grocery_attributes"]);

      if (previousAttributes) {
        const normalizedName = ingredientName.toLowerCase().trim();
        const prev = previousAttributes[normalizedName] || { isChecked: false, isDeleted: false };
        queryClient.setQueryData<Record<string, { isChecked: boolean; isDeleted: boolean }>>(
          ["grocery_attributes"],
          {
            ...previousAttributes,
            [normalizedName]: { ...prev, isDeleted: true },
          }
        );
      }

      return { previousAttributes };
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["grocery_attributes"],
      });
    },
  });
}

/**
 * Mutation hook to restore a previously hidden grocery item
 *
 * @returns React Query mutation for unhiding a grocery item
 *
 * @remarks
 * Restores an item that was previously hidden using useDeleteGroceryItem.
 *
 * Cache invalidation strategy:
 * - Optimistically updates the grocery_attributes query
 * - On settled, refetches to ensure consistency
 */
export function useRestoreGroceryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredientName: string) =>
      mealPlanApi.setGroceryItemDeleted(ingredientName, false),
    onMutate: async (ingredientName) => {
      await queryClient.cancelQueries({
        queryKey: ["grocery_attributes"],
      });

      const previousAttributes = queryClient.getQueryData<
        Record<string, { isChecked: boolean; isDeleted: boolean }>
      >(["grocery_attributes"]);

      if (previousAttributes) {
        const normalizedName = ingredientName.toLowerCase().trim();
        const prev = previousAttributes[normalizedName] || { isChecked: false, isDeleted: false };
        queryClient.setQueryData<Record<string, { isChecked: boolean; isDeleted: boolean }>>(
          ["grocery_attributes"],
          {
            ...previousAttributes,
            [normalizedName]: { ...prev, isDeleted: false },
          }
        );
      }

      return { previousAttributes };
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["grocery_attributes"],
      });
    },
  });
}

/**
 * Mutation hook to uncheck all grocery items
 *
 * @returns React Query mutation for clearing all check states
 *
 * @remarks
 * Cache invalidation strategy:
 * - Invalidates the grocery_checks query to refresh the list
 */
export function useClearGroceryChecks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mealPlanApi.uncheckAllGroceryItems(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.groceryChecks(),
      });
    },
  });
}

/**
 * Mutation hook to assign a meal plan to a specific date and meal slot
 */
export function useAssignToDateSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mealPlanId,
      date,
      mealSlot,
    }: {
      mealPlanId: string;
      date: Date;
      mealSlot: string;
    }) => mealPlanApi.assignToDateSlot(mealPlanId, date, mealSlot),
    onSuccess: () => {
      // Invalidate relevant queries after assignment
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.items(),
      });
      // Invalidate all dateRange queries
      queryClient.invalidateQueries({
        queryKey: [...mealPlanQueryKeys.all, "dateRange"],
      });
    },
  });
}

/**
 * Mutation hook to remove a meal plan from a specific date and meal slot
 */
export function useRemoveFromDateSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, mealSlot }: { date: Date; mealSlot: string }) =>
      mealPlanApi.removeFromDateSlot(date, mealSlot),
    onSuccess: () => {
      // Invalidate relevant queries after removal
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.count(),
      });
      // Invalidate all dateRange queries
      queryClient.invalidateQueries({
        queryKey: [...mealPlanQueryKeys.all, "dateRange"],
      });
    },
  });
}

/**
 * Hook to manually refresh meal plan data
 *
 * @returns Object containing a refresh function
 *
 * @remarks
 * Call `refresh()` to invalidate and refetch meal plan queries.
 * Refreshes: items list, count, and grocery-related queries.
 * Avoids refreshing isInPlan queries to prevent UI flicker.
 *
 * Useful after making changes outside of the mutation hooks.
 */
export function useRefreshMealPlan() {
  const queryClient = useQueryClient();

  const refresh = () => {
    // Only refresh items, count, and grocery-related queries
    // Avoid refreshing isInPlan queries which could cause UI flicker
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.items(),
      }),
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.count(),
      }),
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.groceryChecks(),
      }),
    ]);
  };

  return { refresh };
}
