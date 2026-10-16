import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { normalizeGroceryIngredientName } from "~/utils/grocery-ingredient-name";
import { localDateKey } from "~/utils/meal-plan-calendar";
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
function usePlannedRecipeCount() {
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
  const { selectedWeek } = useMealPlanCalendar();
  return useQuery({
    queryKey: ["grocery_attributes", localDateKey(selectedWeek)],
    queryFn: async () => {
      const map = await mealPlanApi.groceryForWeek(selectedWeek).getGroceryItemAttributes();
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
  const { selectedDate } = useMealPlanCalendar();

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
    }) => mealPlanApi.addToPlan(recipeId, servings, date ?? selectedDate, mealSlot),
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
        queryKey: ["grocery_attributes"],
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
function useUpdateMealPlanServings() {
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
  const { selectedWeek } = useMealPlanCalendar();

  return useMutation({
    mutationFn: () => mealPlanApi.clearWeek(selectedWeek),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...mealPlanQueryKeys.all, "dateRange"] });
      queryClient.invalidateQueries({ queryKey: ["grocery_attributes"] });
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
type GroceryAction = "toggle" | "delete" | "restore";
function useGroceryItemMutation(action: GroceryAction) {
  const client = useQueryClient();
  const { selectedWeek } = useMealPlanCalendar();
  const mutation = useMutation({
    mutationFn: async ({ name, week }: { name: string; week: Date }) => {
      const api = mealPlanApi.groceryForWeek(week);
      if (action === "toggle") return api.toggleGroceryItemCheck(name);
      return api.setGroceryItemDeleted(name, action === "delete");
    },
    onMutate: async ({ name, week }) => {
      const key = ["grocery_attributes", localDateKey(week)];
      await client.cancelQueries({ queryKey: key });
      const previous =
        client.getQueryData<Record<string, { isChecked: boolean; isDeleted: boolean }>>(key);
      const normalized = normalizeGroceryIngredientName(name);
      if (previous) {
        const item = previous[normalized] ?? { isChecked: false, isDeleted: false };
        client.setQueryData(key, {
          ...previous,
          [normalized]:
            action === "toggle"
              ? { ...item, isChecked: !item.isChecked }
              : { ...item, isDeleted: action === "delete" },
        });
      }
      return { key, previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) client.setQueryData(context.key, context.previous);
    },
    onSettled: (_, __, { week }) =>
      client.invalidateQueries({ queryKey: ["grocery_attributes", localDateKey(week)] }),
  });
  return {
    ...mutation,
    mutate: (name: string, options?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate({ name, week: selectedWeek }, options),
    mutateAsync: (name: string) => mutation.mutateAsync({ name, week: selectedWeek }),
  };
}
export function useToggleGroceryItemCheck() {
  return useGroceryItemMutation("toggle");
}
export function useDeleteGroceryItem() {
  return useGroceryItemMutation("delete");
}
export function useRestoreGroceryItem() {
  return useGroceryItemMutation("restore");
}

/** Uncheck items in the currently selected week. */
export function useClearGroceryChecks() {
  const queryClient = useQueryClient();
  const { selectedWeek } = useMealPlanCalendar();
  const attributesKey = ["grocery_attributes", localDateKey(selectedWeek)];
  const groceryApi = mealPlanApi.groceryForWeek(selectedWeek);

  return useMutation({
    mutationFn: () => groceryApi.uncheckAllGroceryItems(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attributesKey,
      });
    },
  });
}

/**
 * Mutation hook to assign a meal plan to a specific date and meal slot
 */
function useAssignToDateSlot() {
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
function useRemoveFromDateSlot() {
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
function useRefreshMealPlan() {
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
        queryKey: ["grocery_attributes"],
      }),
    ]);
  };

  return { refresh };
}
