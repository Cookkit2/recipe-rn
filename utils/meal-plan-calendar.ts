import type { CalendarMealPlan, DayMealPlan, MealSlot } from "~/types/MealPlan";
import { MEAL_SLOTS } from "~/types/MealPlan";

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function startOfWeek(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
}

export function monthGridDates(date: Date): Date[] {
  const first = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
  const last = endOfWeek(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  const days: Date[] = [];
  for (let day = new Date(first); day <= last; day.setDate(day.getDate() + 1)) {
    days.push(new Date(day));
  }
  return days;
}

type CalendarMealInput = Omit<CalendarMealPlan, "updatedAt" | "recipe" | "mealSlot"> & {
  updatedAt?: Date;
  recipe?: CalendarMealPlan["recipe"] | null;
  mealSlot: string;
};

export function groupMealsByDay(dates: Date[], plans: CalendarMealInput[]): DayMealPlan[] {
  const byDate = new Map<string, CalendarMealPlan[]>();
  for (const plan of plans) {
    if (!MEAL_SLOTS.some((slot) => slot === plan.mealSlot)) continue;
    const key = localDateKey(new Date(plan.date));
    const items = byDate.get(key) ?? [];
    items.push({
      ...plan,
      recipe: plan.recipe ?? undefined,
      mealSlot: plan.mealSlot as MealSlot,
      updatedAt: plan.updatedAt ?? plan.createdAt,
    });
    byDate.set(key, items);
  }
  return dates.map((date) => {
    const meals: Partial<Record<MealSlot, CalendarMealPlan[]>> = {};
    for (const plan of byDate.get(localDateKey(date)) ?? []) {
      if (!MEAL_SLOTS.includes(plan.mealSlot)) continue;
      (meals[plan.mealSlot] ??= []).push(plan);
    }
    return { date, meals };
  });
}
