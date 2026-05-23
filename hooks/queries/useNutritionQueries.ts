import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { nutritionQueryKeys } from "./nutritionQueryKeys";
import { useCalendarMealPlans } from "./useCalendarMealPlans";
import { aggregateNutrition } from "~/utils/nutritionAggregation";
import type { NutritionSummary } from "~/types/Nutrition";
import type { MealPlanItemWithRecipe } from "~/data/api/mealPlanApi";

const EMPTY_SUMMARY: NutritionSummary = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

/**
 * Extract nutrition-relevant data from a meal plan item's recipe.
 * The recipe on MealPlanItemWithRecipe may or may not include nutrition fields
 * depending on how it was fetched. We treat it as NutritionInput-compatible.
 */
function toNutritionInput(
  recipe: NonNullable<MealPlanItemWithRecipe["recipe"]>
): Record<string, unknown> {
  return {
    calories: (recipe as Record<string, unknown>).calories ?? undefined,
    protein: (recipe as Record<string, unknown>).protein ?? undefined,
    carbs: (recipe as Record<string, unknown>).carbs ?? undefined,
    fat: (recipe as Record<string, unknown>).fat ?? undefined,
    fiber: (recipe as Record<string, unknown>).fiber ?? undefined,
    servings: recipe.servings,
  };
}

/**
 * Hook to compute aggregated nutrition for all meals on a given day.
 *
 * @param date - The date to compute nutrition for
 * @returns React Query result with a NutritionSummary
 */
export function useDayNutrition(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: mealPlans } = useCalendarMealPlans(startOfDay, endOfDay);

  return useQuery({
    queryKey: nutritionQueryKeys.day(startOfDay.toISOString()),
    queryFn: () => {
      if (!mealPlans || mealPlans.length === 0) {
        return { ...EMPTY_SUMMARY };
      }

      const recipes = mealPlans
        .map((mp) => mp.recipe)
        .filter((r): r is NonNullable<typeof r> => r != null)
        .map(toNutritionInput);

      return aggregateNutrition(recipes);
    },
    enabled: !!mealPlans,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to compute per-day nutrition summaries for a 7-day week.
 *
 * @param weekStart - The start of the week (day 1 of 7)
 * @returns React Query result with an array of { date, ...NutritionSummary }
 */
export function useWeeklyNutrition(weekStart: Date) {
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, [weekStart.getTime()]);

  const weekEnd = new Date(days[6]!);
  weekEnd.setHours(23, 59, 59, 999);

  const { data: mealPlans } = useCalendarMealPlans(weekStart, weekEnd);

  return useQuery({
    queryKey: nutritionQueryKeys.week(weekStart.toISOString()),
    queryFn: () => {
      if (!mealPlans || mealPlans.length === 0) {
        return [];
      }

      // Initialize map with empty summaries for each day of the week
      const dayMap = new Map<string, NutritionSummary>();

      for (let i = 0; i < 7; i++) {
        const dateStr = days[i]!.toISOString().split("T")[0]!;
        dayMap.set(dateStr, { ...EMPTY_SUMMARY });
      }

      // Accumulate nutrition per day from meal plans
      for (const mp of mealPlans) {
        if (!mp.recipe) continue;

        const dateStr = new Date(mp.date).toISOString().split("T")[0]!;
        const existing = dayMap.get(dateStr);
        if (!existing) continue;

        const nutrition = aggregateNutrition([toNutritionInput(mp.recipe)]);
        existing.calories += nutrition.calories;
        existing.protein += nutrition.protein;
        existing.carbs += nutrition.carbs;
        existing.fat += nutrition.fat;
        existing.fiber += nutrition.fiber;
      }

      return Array.from(dayMap.entries()).map(([date, summary]) => ({
        date,
        ...summary,
      }));
    },
    enabled: !!mealPlans,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
