import { useMemo } from "react";
import type { NutritionSummary } from "~/types/Nutrition";

export type DailyNutrition = NutritionSummary & { date: string };

export interface NutritionStats {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  highestDay: DailyNutrition;
  lowestDay: DailyNutrition;
  caloriesChange: number | null;
  carbsChange: number | null;
}

export function useNutritionStats(
  currentWeekData: DailyNutrition[] | undefined,
  previousWeekData: DailyNutrition[] | undefined
): NutritionStats | null {
  return useMemo(() => {
    if (!currentWeekData || currentWeekData.length === 0) {
      return null;
    }

    const daysWithData = currentWeekData.filter((d) => d.calories > 0);
    if (daysWithData.length === 0) return null;

    // ⚡ Bolt Performance Optimization: Replace multiple O(N) array.reduce calls with a single O(N) loop
    let totalCalories = 0,
      totalProtein = 0,
      totalCarbs = 0,
      totalFat = 0;

    for (let i = 0; i < daysWithData.length; i++) {
      const d = daysWithData[i];
      if (d) {
        totalCalories += d.calories;
        totalProtein += d.protein;
        totalCarbs += d.carbs;
        totalFat += d.fat;
      }
    }

    const avgCalories = Math.round(totalCalories / daysWithData.length);
    const avgProtein = Math.round(totalProtein / daysWithData.length);
    const avgCarbs = Math.round(totalCarbs / daysWithData.length);
    const avgFat = Math.round(totalFat / daysWithData.length);

    // Highest and lowest calorie days
    const sortedByCalories = [...daysWithData].sort((a, b) => b.calories - a.calories);
    const highestDay = sortedByCalories[0]!;
    const lowestDay = sortedByCalories[sortedByCalories.length - 1]!;

    // Week-over-week comparison
    let caloriesChange: number | null = null;
    let carbsChange: number | null = null;
    if (previousWeekData && previousWeekData.length > 0) {
      const prevDaysWithData = previousWeekData.filter((d) => d.calories > 0);
      if (prevDaysWithData.length > 0) {
        // ⚡ Bolt Performance Optimization: Replace multiple O(N) array.reduce calls with a single O(N) loop
        let prevTotalCalories = 0;
        let prevTotalCarbs = 0;
        for (let i = 0; i < prevDaysWithData.length; i++) {
          const d = prevDaysWithData[i];
          if (d) {
            prevTotalCalories += d.calories;
            prevTotalCarbs += d.carbs;
          }
        }
        const prevAvgCalories = prevTotalCalories / prevDaysWithData.length;
        const prevAvgCarbs = prevTotalCarbs / prevDaysWithData.length;

        if (prevAvgCalories > 0) {
          caloriesChange = ((avgCalories - prevAvgCalories) / prevAvgCalories) * 100;
        }
        if (prevAvgCarbs > 0) {
          const currentAvgCarbs = totalCarbs / daysWithData.length;
          carbsChange = ((currentAvgCarbs - prevAvgCarbs) / prevAvgCarbs) * 100;
        }
      }
    }

    return {
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      highestDay,
      lowestDay,
      caloriesChange,
      carbsChange,
    };
  }, [currentWeekData, previousWeekData]);
}
