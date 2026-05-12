import React from "react";
import { View, ScrollView, Dimensions, ActivityIndicator } from "react-native";
import { H3, P } from "~/components/ui/typography";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { useCalendarMealPlans } from "~/hooks/queries/useCalendarMealPlans";
import type { DayMealPlan, MealSlot } from "~/types/MealPlan";
import { MEAL_SLOTS } from "~/types/MealPlan";
import DayColumn from "./DayColumn";
import { CalendarPlusIcon } from "lucide-uniwind";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const { selectedWeek } = useMealPlanCalendar();

  // Calculate week start and end dates
  const weekStartDate = new Date(selectedWeek);
  const weekEndDate = new Date(selectedWeek);
  weekEndDate.setDate(weekEndDate.getDate() + 6); // Add 6 days to get end of week

  // Fetch meal plans for the current week
  const { data: mealPlans, isLoading, error } = useCalendarMealPlans(weekStartDate, weekEndDate);

  // Group meal plans by day
  const weekDays = React.useMemo(() => {
    const days: DayMealPlan[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);

      // Find meal plans for this day
      const dayMealPlans =
        mealPlans?.filter((plan) => {
          const planDate = new Date(plan.date);
          return (
            planDate.getDate() === date.getDate() &&
            planDate.getMonth() === date.getMonth() &&
            planDate.getFullYear() === date.getFullYear()
          );
        }) || [];

      // Group by meal slot
      const meals: Partial<Record<MealSlot, (typeof dayMealPlans)[0]>> = {};
      MEAL_SLOTS.forEach((slot) => {
        meals[slot] = dayMealPlans.find((plan) => plan.mealSlot === slot);
      });

      days.push({
        date,
        meals: meals as DayMealPlan["meals"],
      });
    }

    return days;
  }, [weekStartDate, mealPlans]);

  const renderDayColumn = (dayMealPlan: DayMealPlan, index: number) => {
    const isFirstDay = index === 0;

    return (
      <DayColumn
        key={index}
        dayMealPlan={dayMealPlan}
        isFirstDay={isFirstDay}
        minWidth={SCREEN_WIDTH / 3}
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

  // Empty state - no meal plans for this week
  const hasMealPlans = mealPlans && mealPlans.length > 0;
  if (!hasMealPlans) {
    return (
      <View className="flex-1 bg-background justify-center items-center px-6">
        <View className="items-center">
          <View className="w-24 h-24 rounded-full bg-primary/20 items-center justify-center mb-6">
            <CalendarPlusIcon className="text-primary" size={48} strokeWidth={1.5} />
          </View>

          <H3 className="font-bowlby-one text-center mb-2">No meals planned</H3>
          <P className="text-muted-foreground text-center max-w-xs mb-6">
            Start planning your week by adding recipes to your meal calendar.
          </P>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        contentContainerStyle={{
          flexDirection: "row",
          minHeight: "100%",
        }}
      >
        {weekDays.map((day, index) => renderDayColumn(day, index))}
      </ScrollView>
    </View>
  );
}
