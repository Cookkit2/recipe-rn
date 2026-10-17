import React from "react";
import { View, ScrollView, useWindowDimensions, ActivityIndicator } from "react-native";
import { P } from "~/components/ui/typography";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { useCalendarMealPlans } from "~/hooks/queries/useCalendarMealPlans";
import type { DayMealPlan, MealSlot } from "~/types/MealPlan";
import { groupMealsByDay } from "~/utils/meal-plan-calendar";
import DayColumn from "./DayColumn";

interface WeeklyCalendarProps {
  /**
   * Optional callback when a meal slot is pressed
   */
  onMealSlotPress?: (date: Date, mealSlot: MealSlot) => void;
  /**
   * Optional callback when a recipe is dropped on a meal slot
   */
  onMealSlotDrop?: (date: Date, mealSlot: MealSlot) => void;
}

/**
 * WeeklyCalendar Component
 *
 * Displays a 7-day weekly calendar with horizontal scroll.
 * Each day column shows meal slots (breakfast, lunch, dinner, snack).
 */
export default function WeeklyCalendar({ onMealSlotPress, onMealSlotDrop }: WeeklyCalendarProps) {
  const { width } = useWindowDimensions();
  const { selectedWeek } = useMealPlanCalendar();

  // Calculate week start and end dates
  const weekStartDate = new Date(selectedWeek);
  const weekEndDate = new Date(selectedWeek);
  weekEndDate.setDate(weekEndDate.getDate() + 6); // Add 6 days to get end of week

  // Fetch meal plans for the current week
  const { data: mealPlans, isLoading, error } = useCalendarMealPlans(weekStartDate, weekEndDate);

  const weekDays = groupMealsByDay(
    Array.from(
      { length: 7 },
      (_, i) =>
        new Date(selectedWeek.getFullYear(), selectedWeek.getMonth(), selectedWeek.getDate() + i)
    ),
    mealPlans ?? []
  );

  const renderDayColumn = (dayMealPlan: DayMealPlan, index: number) => {
    const isFirstDay = index === 0;

    return (
      <DayColumn
        key={index}
        dayMealPlan={dayMealPlan}
        isFirstDay={isFirstDay}
        width={width / 3}
        onMealSlotPress={onMealSlotPress}
        onMealSlotDrop={onMealSlotDrop}
      />
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading meal plans...</P>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <P className="text-muted-foreground text-center">
          Failed to load meal plans. Please check your connection and try again.
        </P>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1 }}
      nestedScrollEnabled
    >
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        contentContainerStyle={{ flexDirection: "row" }}
      >
        {weekDays.map((day, index) => renderDayColumn(day, index))}
      </ScrollView>
    </ScrollView>
  );
}
