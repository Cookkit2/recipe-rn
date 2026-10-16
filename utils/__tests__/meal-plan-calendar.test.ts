import {
  endOfWeek,
  groupMealsByDay,
  localDateKey,
  monthGridDates,
  startOfWeek,
} from "../meal-plan-calendar";
import type { CalendarMealPlan } from "~/types/MealPlan";

describe("meal calendar", () => {
  it("normalizes Sunday weeks across month and year boundaries", () => {
    const day = new Date(2027, 0, 1, 18);
    expect(localDateKey(startOfWeek(day))).toBe("2026-12-27");
    expect(localDateKey(endOfWeek(day))).toBe("2027-01-02");
    expect(startOfWeek(day).getHours()).toBe(0);
    expect(endOfWeek(day).getHours()).toBe(23);
  });

  it("includes empty days and complete weeks in a leap-year month", () => {
    const days = monthGridDates(new Date(2028, 1, 12));
    expect(days.length % 7).toBe(0);
    expect(days[0]!.getDay()).toBe(0);
    expect(days.at(-1)!.getDay()).toBe(6);
    expect(days.some((day) => localDateKey(day) === "2028-02-29")).toBe(true);
    expect(new Set(days.map(localDateKey)).size).toBe(days.length);
  });

  it("keeps every dish in the same slot and repeated recipes on other days", () => {
    const date = new Date(2026, 9, 12);
    const next = new Date(2026, 9, 13);
    const plan = {
      id: "one",
      recipeId: "chicken",
      date,
      mealSlot: "dinner",
      servings: 2,
    } as CalendarMealPlan;
    const result = groupMealsByDay(
      [date, next, new Date(2026, 9, 14)],
      [plan, { ...plan, id: "two", recipeId: "salad" }, { ...plan, id: "three", date: next }]
    );
    expect(result[0]!.meals.dinner?.map((meal) => meal.id)).toEqual(["one", "two"]);
    expect(result[1]!.meals.dinner?.[0]?.recipeId).toBe("chicken");
    expect(result[2]!.meals).toEqual({});
  });
});
