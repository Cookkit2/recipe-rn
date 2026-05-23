import type { NutritionSummary } from "~/types/Nutrition";

interface NutritionInput {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  servings?: number;
}

const EMPTY_SUMMARY: NutritionSummary = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

export function aggregateNutrition(
  recipes: NutritionInput[],
  servingsMultiplier: number = 1
): NutritionSummary {
  if (recipes.length === 0) return { ...EMPTY_SUMMARY };

  return {
    calories: recipes.reduce((sum, r) => sum + (r.calories ?? 0) * servingsMultiplier, 0),
    protein: recipes.reduce((sum, r) => sum + (r.protein ?? 0) * servingsMultiplier, 0),
    carbs: recipes.reduce((sum, r) => sum + (r.carbs ?? 0) * servingsMultiplier, 0),
    fat: recipes.reduce((sum, r) => sum + (r.fat ?? 0) * servingsMultiplier, 0),
    fiber: recipes.reduce((sum, r) => sum + (r.fiber ?? 0) * servingsMultiplier, 0),
  };
}

export function sumNutrition(summaries: NutritionSummary[]): NutritionSummary {
  if (summaries.length === 0) return { ...EMPTY_SUMMARY };

  return {
    calories: summaries.reduce((sum, s) => sum + s.calories, 0),
    protein: summaries.reduce((sum, s) => sum + s.protein, 0),
    carbs: summaries.reduce((sum, s) => sum + s.carbs, 0),
    fat: summaries.reduce((sum, s) => sum + s.fat, 0),
    fiber: summaries.reduce((sum, s) => sum + s.fiber, 0),
  };
}
