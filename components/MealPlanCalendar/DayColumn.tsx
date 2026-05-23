import React from "react";
import { View, Text } from "react-native";
import { P } from "~/components/ui/typography";
import type { DayMealPlan, MealSlot } from "~/types/MealPlan";
import { MEAL_SLOTS } from "~/types/MealPlan";
import MealSlotComponent from "./MealSlot";
import DailyNutritionBar from "./DailyNutritionBar";

interface DayColumnProps {
  /**
   * Day meal plan data including date and meals
   */
  dayMealPlan: DayMealPlan;
  /**
   * Whether this is the first day (for left border)
   */
  isFirstDay?: boolean;
  /**
   * Minimum width for the column
   */
  minWidth?: number;
  /**
   * Optional callback when a meal slot is pressed
   */
  onMealSlotPress?: (date: Date, mealSlot: MealSlot) => void;
  /**
   * Optional callback when a recipe is dropped on a slot
   */
  onMealSlotDrop?: (date: Date, mealSlot: MealSlot) => void;
}

/**
 * DayColumn Component
 *
 * Displays a single day column in the meal planning calendar.
 * Shows the date header and meal slots (breakfast, lunch, dinner, snack).
 * Empty slots show the meal type label, filled slots show recipe info.
 */
export default function DayColumn({
  dayMealPlan,
  isFirstDay = false,
  minWidth,
  onMealSlotPress,
  onMealSlotDrop,
}: DayColumnProps) {
  const isToday = new Date().toDateString() === dayMealPlan.date.toDateString();

  return (
    <View
      className={`flex-1 border-r border-border ${isFirstDay ? "border-l" : ""}`}
      style={{ minWidth }}
    >
      {/* Day Header */}
      <View className={`px-3 py-2 ${isToday ? "bg-primary/10" : "bg-muted/30"}`}>
        <View className="items-center">
          <P className="text-xs font-urbanist-medium text-muted-foreground">
            {dayMealPlan.date.toLocaleDateString("en-US", { weekday: "short" })}
          </P>
          <Text
            className={`text-2xl font-urbanist-semibold ${
              isToday ? "text-primary" : "text-foreground"
            }`}
          >
            {dayMealPlan.date.getDate()}
          </Text>
        </View>
      </View>

      {/* Meal Slots */}
      <View className="flex-1">
        {MEAL_SLOTS.map((slot) => (
          <MealSlotComponent
            key={slot}
            date={dayMealPlan.date}
            mealSlot={slot}
            mealPlan={dayMealPlan.meals[slot]}
            onPress={onMealSlotPress}
            onDrop={onMealSlotDrop}
          />
        ))}
      </View>

      {/* Daily Nutrition Summary */}
      <DailyNutritionBar
        recipes={Object.values(dayMealPlan.meals)
          .filter((m): m is NonNullable<typeof m> => m != null && m.recipe != null)
          .map((m) => ({
            calories: m.recipe!.calories,
            protein: m.recipe!.protein,
            carbs: m.recipe!.carbs,
            fat: m.recipe!.fat,
            fiber: m.recipe!.fiber,
          }))}
      />
    </View>
  );
}
