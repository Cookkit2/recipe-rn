/**
 * Meal Plan Calendar - Type Definitions
 * Types for meal planning calendar operations including slots, templates, and calendar views
 */

import type { Recipe } from "./Recipe";

/**
 * Available meal slots for daily meal planning
 */
export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

/**
 * Meal plan entry for a specific date and slot
 */
export interface CalendarMealPlan {
  id: string;
  recipeId: string;
  recipe?: Recipe; // Populated when joined with recipe data
  date: Date; // The date this meal is planned for
  mealSlot: MealSlot; // Which meal slot (breakfast, lunch, dinner, snack)
  servings: number;
  templateId?: string; // If created from a template
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Meal plan grouped by day for calendar view
 */
export interface DayMealPlan {
  date: Date;
  meals: {
    breakfast?: CalendarMealPlan;
    lunch?: CalendarMealPlan;
    dinner?: CalendarMealPlan;
    snack?: CalendarMealPlan;
  };
}

/**
 * Date range for calendar queries
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Meal plan template for reusable meal plans
 */
export interface MealPlanTemplate {
  id: string;
  name: string;
  description?: string;
  mealSlots: TemplateMealSlot[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Single meal slot definition within a template
 */
export interface TemplateMealSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  mealSlot: MealSlot;
  recipeId: string;
  servings: number;
}

/**
 * Weekly meal plan data structure
 */
export interface WeeklyMealPlan {
  weekStart: Date;
  weekEnd: Date;
  days: DayMealPlan[];
}

/**
 * Drag-and-drop data for moving recipes to calendar
 */
export interface RecipeDragData {
  recipeId: string;
  recipe?: Recipe;
  servings: number;
}

/**
 * Drag-and-drop data for moving meal plans between slots
 */
export interface MealPlanDragData {
  mealPlanId: string;
  currentDate: Date;
  currentMealSlot: MealSlot;
}

/**
 * Drop target information for calendar
 */
export interface CalendarDropTarget {
  date: Date;
  mealSlot: MealSlot;
}

/**
 * Meal plan calendar view state
 */
export interface CalendarViewState {
  selectedWeekStart: Date;
  selectedDate?: Date;
  selectedMealSlot?: MealSlot;
}

/**
 * Grocery list item generated from meal plan
 */
export interface MealPlanGroceryItem {
  name: string;
  quantity: number;
  unit: string;
  recipeIds: string[]; // Which recipes use this ingredient
  checked: boolean;
}

/**
 * Meal plan share data for export/import
 */
export interface SharedMealPlan {
  version: 1;
  name: string;
  description?: string;
  createdAt: string;
  meals: Array<{
    dayOfWeek: number;
    mealSlot: MealSlot;
    recipeId: string;
    servings: number;
  }>;
}
