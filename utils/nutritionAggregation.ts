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

  // ⚡ Bolt Performance Optimization: Replace multiple O(N) array.reduce calls with a single O(N) loop
  let calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0,
    fiber = 0;

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    if (r) {
      calories += (r.calories ?? 0) * servingsMultiplier;
      protein += (r.protein ?? 0) * servingsMultiplier;
      carbs += (r.carbs ?? 0) * servingsMultiplier;
      fat += (r.fat ?? 0) * servingsMultiplier;
      fiber += (r.fiber ?? 0) * servingsMultiplier;
    }
  }

  return { calories, protein, carbs, fat, fiber };
}

export function sumNutrition(summaries: NutritionSummary[]): NutritionSummary {
  if (summaries.length === 0) return { ...EMPTY_SUMMARY };

  // ⚡ Bolt Performance Optimization: Replace multiple O(N) array.reduce calls with a single O(N) loop
  let calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0,
    fiber = 0;

  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    if (s) {
      calories += s.calories;
      protein += s.protein;
      carbs += s.carbs;
      fat += s.fat;
      fiber += s.fiber;
    }
  }

  return { calories, protein, carbs, fat, fiber };
}
