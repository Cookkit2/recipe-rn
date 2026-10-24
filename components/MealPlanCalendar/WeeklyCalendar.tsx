import React, { useMemo } from "react";
import { View, ScrollView, useWindowDimensions, ActivityIndicator } from "react-native";
import { P } from "~/components/ui/typography";
import { useMealPlanCalendar, type MealDropHandler } from "~/store/MealPlanCalendarContext";
import { useCalendarMealPlans } from "~/hooks/queries/useCalendarMealPlans";
import type { DayMealPlan, MealSlot } from "~/types/MealPlan";
import { groupMealsByDay } from "~/utils/meal-plan-calendar";
import DayColumn from "./DayColumn";
import { useMealDragAutoScroll } from "./useMealDragAutoScroll";

interface WeeklyCalendarProps {
  /**
   * Optional callback when a meal slot is pressed
   */
  onMealSlotPress?: (date: Date, mealSlot: MealSlot) => void;
  /**
   * Optional callback when a recipe is dropped on a meal slot
   */
  onMealSlotDrop?: MealDropHandler;
}

/**
 * WeeklyCalendar Component
 *
 * Displays a 7-day weekly calendar with horizontal scroll.
 * Each day column shows meal slots (breakfast, lunch, dinner, snack).
 */
export default function WeeklyCalendar({ onMealSlotPress, onMealSlotDrop }: WeeklyCalendarProps) {
  const { width } = useWindowDimensions();
  const { selectedWeek, dragState } = useMealPlanCalendar();
  const verticalScroll = useMealDragAutoScroll();
  const horizontalScroll = useMealDragAutoScroll(true);

  // Calculate week start and end dates
  const weekStartDate = new Date(selectedWeek);
  const weekEndDate = new Date(selectedWeek);
  weekEndDate.setDate(weekEndDate.getDate() + 6); // Add 6 days to get end of week

  // Fetch meal plans for the current week
  const { data: mealPlans, isLoading, error } = useCalendarMealPlans(weekStartDate, weekEndDate);

  const weekDays = useMemo(
    () =>
      groupMealsByDay(
        Array.from(
          { length: 7 },
          (_, i) =>
            new Date(
              selectedWeek.getFullYear(),
              selectedWeek.getMonth(),
              selectedWeek.getDate() + i
            )
        ),
        mealPlans ?? []
      ),
    [selectedWeek, mealPlans]
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
      {...verticalScroll}
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1 }}
      nestedScrollEnabled
      scrollEnabled={!dragState.isDragging}
    >
      <ScrollView
        {...horizontalScroll}
        horizontal
        nestedScrollEnabled
        scrollEnabled={!dragState.isDragging}
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        contentContainerStyle={{ flexDirection: "row" }}
      >
        {weekDays.map((day, index) => renderDayColumn(day, index))}
      </ScrollView>
    </ScrollView>
  );
}
