import React, { useMemo } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { H4, P } from "~/components/ui/typography";
import { Card, CardContent } from "~/components/ui/card";
import { NutritionChart } from "~/components/Nutrition/NutritionChart";
import { useWeeklyNutrition } from "~/hooks/queries/useNutritionQueries";
import { FlameIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-uniwind";

/** Get Monday of the current week (start of ISO week). */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function getDayName(dateStr: string): string {
  const d = new Date(dateStr);
  return DAY_NAMES[d.getDay()] ?? "Unknown";
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Math.round(value)}%`;
}

export default function NutritionReportScreen() {
  const currentWeekStart = useMemo(() => getWeekStart(new Date()), []);
  const previousWeekStart = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    return d;
  }, [currentWeekStart]);

  const {
    data: currentWeekData,
    isLoading: isLoadingCurrent,
    error: currentError,
  } = useWeeklyNutrition(currentWeekStart);

  const { data: previousWeekData } = useWeeklyNutrition(previousWeekStart);

  // Compute summary stats from current week data
  const stats = useMemo(() => {
    if (!currentWeekData || currentWeekData.length === 0) {
      return null;
    }

    const daysWithData = currentWeekData.filter((d) => d.calories > 0);
    if (daysWithData.length === 0) return null;

    const totalCalories = daysWithData.reduce((sum, d) => sum + d.calories, 0);
    const totalProtein = daysWithData.reduce((sum, d) => sum + d.protein, 0);
    const totalCarbs = daysWithData.reduce((sum, d) => sum + d.carbs, 0);
    const totalFat = daysWithData.reduce((sum, d) => sum + d.fat, 0);

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
        const prevAvgCalories =
          prevDaysWithData.reduce((sum, d) => sum + d.calories, 0) / prevDaysWithData.length;
        const prevAvgCarbs =
          prevDaysWithData.reduce((sum, d) => sum + d.carbs, 0) / prevDaysWithData.length;

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

  if (isLoadingCurrent) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading nutrition report...</P>
      </View>
    );
  }

  if (currentError) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <P className="text-destructive text-center">{currentError.message}</P>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      showsVerticalScrollIndicator={false}
    >
      {/* Chart */}
      <NutritionChart data={currentWeekData ?? []} />

      {/* Summary Stats */}
      {stats && (
        <View className="mt-6 mx-6 gap-4 mb-12">
          {/* Weekly Averages */}
          <Card className="rounded-2xl border-none shadow-md shadow-foreground/10">
            <CardContent className="p-5">
              <View className="flex-row items-center gap-2 mb-3">
                <FlameIcon size={18} className="text-primary" />
                <H4 className="font-urbanist-bold text-base">Weekly Averages</H4>
              </View>
              <P className="text-muted-foreground">
                {stats.avgCalories} kcal avg | P:{stats.avgProtein}g C:{stats.avgCarbs}g F:
                {stats.avgFat}g
              </P>
            </CardContent>
          </Card>

          {/* Highest & Lowest Days */}
          <Card className="rounded-2xl border-none shadow-md shadow-foreground/10">
            <CardContent className="p-5 gap-3">
              <View className="flex-row items-center gap-2 mb-1">
                <TrendingUpIcon size={18} className="text-primary" />
                <H4 className="font-urbanist-bold text-base">Daily Highlights</H4>
              </View>
              <P className="text-muted-foreground">
                {getDayName(stats.highestDay.date)}: {Math.round(stats.highestDay.calories)} kcal
                (highest)
              </P>
              <P className="text-muted-foreground">
                {getDayName(stats.lowestDay.date)}: {Math.round(stats.lowestDay.calories)} kcal
                (lowest)
              </P>
            </CardContent>
          </Card>

          {/* Week-over-Week Comparison */}
          {(stats.caloriesChange !== null || stats.carbsChange !== null) && (
            <Card className="rounded-2xl border-none shadow-md shadow-foreground/10">
              <CardContent className="p-5 gap-2">
                <View className="flex-row items-center gap-2 mb-1">
                  <TrendingDownIcon size={18} className="text-secondary" />
                  <H4 className="font-urbanist-bold text-base">vs Previous Week</H4>
                </View>
                {stats.caloriesChange !== null && (
                  <P className={stats.caloriesChange > 0 ? "text-orange-500" : "text-emerald-500"}>
                    {formatPercent(stats.caloriesChange)} calories
                  </P>
                )}
                {stats.carbsChange !== null && (
                  <P className={stats.carbsChange > 0 ? "text-orange-500" : "text-emerald-500"}>
                    {formatPercent(stats.carbsChange)} carbs
                  </P>
                )}
              </CardContent>
            </Card>
          )}
        </View>
      )}
    </ScrollView>
  );
}
