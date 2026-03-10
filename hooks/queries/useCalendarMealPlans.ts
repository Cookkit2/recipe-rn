import { useQuery } from "@tanstack/react-query";
import { mealPlanQueryKeys } from "./mealPlanQueryKeys";
import { mealPlanApi, type MealPlanItemWithRecipe } from "~/data/api/mealPlanApi";

/**
 * Hook to fetch meal plans for a specific date range
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @param enabled - Whether the query should be enabled (defaults to true if dates are provided)
 */
export function useCalendarMealPlans(startDate: Date, endDate: Date, enabled?: boolean) {
  // Convert dates to ISO strings for query key serialization
  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();

  return useQuery({
    queryKey: mealPlanQueryKeys.dateRange(startDateStr, endDateStr),
    queryFn: () => mealPlanApi.getMealPlansForDateRange(startDate, endDate),
    enabled: enabled !== undefined ? enabled : !!startDate && !!endDate,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
