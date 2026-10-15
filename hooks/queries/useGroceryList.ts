import { useMemo } from "react";
import { useCalendarMealPlans, useGroceryItemAttributes } from "./useMealPlanQueries";
import { usePantryItems } from "./usePantryQueries";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { endOfWeek } from "~/utils/meal-plan-calendar";
import {
  aggregateRecipeIngredients,
  calculateNeededQuantities,
  groupGroceryItemsIntoSections,
  computeGroceryStats,
} from "~/utils/grocery-list";
export type { GroceryItem, GroceryCategory, GroceryListSection } from "~/utils/grocery-list";
export {
  aggregateRecipeIngredients,
  calculateNeededQuantities,
  groupGroceryItemsIntoSections,
  computeGroceryStats,
} from "~/utils/grocery-list";

export function useGroceryList(startDate?: Date, endDate?: Date) {
  const { selectedWeek } = useMealPlanCalendar();
  const mealQuery = useCalendarMealPlans(
    startDate ?? selectedWeek,
    endDate ?? endOfWeek(selectedWeek)
  );
  const pantryQuery = usePantryItems();
  const attributesQuery = useGroceryItemAttributes();
  const groceryList = useMemo(
    () =>
      calculateNeededQuantities(
        aggregateRecipeIngredients(mealQuery.data ?? []),
        pantryQuery.data,
        attributesQuery.data
      ),
    [mealQuery.data, pantryQuery.data, attributesQuery.data]
  );
  const sections = useMemo(() => groupGroceryItemsIntoSections(groceryList), [groceryList]);
  const stats = useMemo(() => computeGroceryStats(groceryList), [groceryList]);
  return {
    refetch: () =>
      Promise.all([mealQuery.refetch(), pantryQuery.refetch(), attributesQuery.refetch()]),
    groceryList,
    sections,
    stats,
    isLoading: mealQuery.isLoading || pantryQuery.isLoading || attributesQuery.isLoading,
    error: mealQuery.error ?? pantryQuery.error ?? attributesQuery.error,
    isEmpty: groceryList.length === 0,
    hasNeededItems: stats.neededItems > 0,
  };
}
