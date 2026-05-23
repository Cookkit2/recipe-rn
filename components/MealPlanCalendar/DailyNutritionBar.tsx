import React from "react";
import { View } from "react-native";
import { P } from "~/components/ui/typography";
import { Progress } from "~/components/ui/progress";
import { aggregateNutrition } from "~/utils/nutritionAggregation";
import { cn } from "~/lib/utils";

const CALORIE_TARGET = 2000;

interface NutritionRecipe {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

interface DailyNutritionBarProps {
  recipes: NutritionRecipe[];
}

function getProgressColorClass(percentage: number): {
  indicator: string;
  text: string;
} {
  if (percentage > 100) {
    return { indicator: "bg-red-500", text: "text-red-500" };
  }
  if (percentage >= 80) {
    return { indicator: "bg-amber-500", text: "text-amber-500" };
  }
  return { indicator: "bg-green-500", text: "text-green-600" };
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/**
 * DailyNutritionBar Component
 *
 * Displays a compact nutrition summary for all recipes in a day.
 * Shows aggregated macros as text and a calorie progress bar
 * color-coded against a 2000 kcal daily target.
 *
 * Returns null when recipes is empty or all calories are undefined.
 */
export default function DailyNutritionBar({ recipes }: DailyNutritionBarProps) {
  const hasAnyCalories = recipes.some((r) => r.calories !== undefined && r.calories > 0);

  if (recipes.length === 0 || !hasAnyCalories) {
    return null;
  }

  const totals = aggregateNutrition(recipes);
  const caloriePercentage = Math.round((totals.calories / CALORIE_TARGET) * 100);
  const clampedProgress = Math.min(caloriePercentage, 100);
  const colors = getProgressColorClass(caloriePercentage);

  return (
    <View className="px-2 py-2 border-t border-border/40">
      {/* Compact macro text */}
      <P className={cn("text-[10px] font-urbanist-medium leading-tight", colors.text)}>
        {formatNumber(totals.calories)} kcal | P:{formatNumber(totals.protein)}g C:
        {formatNumber(totals.carbs)}g F:{formatNumber(totals.fat)}g
      </P>

      {/* Calorie progress bar */}
      <View className="mt-1">
        <Progress
          value={clampedProgress}
          className="h-1.5 bg-muted"
          indicatorClassName={colors.indicator}
        />
      </View>
    </View>
  );
}
