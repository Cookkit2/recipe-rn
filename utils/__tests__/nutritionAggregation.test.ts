import { describe, it, expect } from "@jest/globals";
import { aggregateNutrition, sumNutrition } from "../nutritionAggregation";
import type { NutritionSummary } from "~/types/Nutrition";

describe("aggregateNutrition", () => {
  it("sums nutrition from multiple recipes", () => {
    const recipes = [
      { calories: 400, protein: 20, carbs: 30, fat: 15, fiber: 5 },
      { calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3 },
    ];
    const result = aggregateNutrition(recipes);
    expect(result).toEqual({
      calories: 700,
      protein: 30,
      carbs: 70,
      fat: 25,
      fiber: 8,
    });
  });

  it("handles undefined nutrition fields as zero", () => {
    const recipes = [{ calories: 400, protein: undefined, carbs: 30, fat: undefined, fiber: 5 }];
    const result = aggregateNutrition(recipes);
    expect(result).toEqual({
      calories: 400,
      protein: 0,
      carbs: 30,
      fat: 0,
      fiber: 5,
    });
  });

  it("returns zeros for empty recipe list", () => {
    const result = aggregateNutrition([]);
    expect(result).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
  });

  it("scales by servings multiplier", () => {
    const recipes = [{ calories: 400, protein: 20, carbs: 30, fat: 15, fiber: 5, servings: 2 }];
    const result = aggregateNutrition(recipes, 2);
    expect(result.calories).toBe(800);
    expect(result.protein).toBe(40);
  });
});

describe("sumNutrition", () => {
  it("sums an array of NutritionSummary objects", () => {
    const summaries: NutritionSummary[] = [
      { calories: 1800, protein: 90, carbs: 200, fat: 60, fiber: 20 },
      { calories: 2000, protein: 100, carbs: 220, fat: 70, fiber: 25 },
    ];
    const result = sumNutrition(summaries);
    expect(result).toEqual({
      calories: 3800,
      protein: 190,
      carbs: 420,
      fat: 130,
      fiber: 45,
    });
  });

  it("returns zeros for empty array", () => {
    const result = sumNutrition([]);
    expect(result).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
  });
});
