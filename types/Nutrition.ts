export type NutritionSource = "estimated" | "manual" | "external_api";

export interface NutritionData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  allergens?: string[];
  nutritionSource?: NutritionSource;
}

export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export type DietaryTag = "keto" | "low-carb" | "high-protein" | "gluten-free" | "dairy-free";
