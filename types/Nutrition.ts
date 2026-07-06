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

/**
 * A daily macro/calorie target the meal-plan generator can optimize toward
 * (Eat This Much-style target-driven planning, issue #746). All fields are
 * optional — callers set only the constraints they care about; the planner
 * scores candidate recipes against whichever targets are present.
 *
 * Units: calories in kcal; macros in grams.
 */
export interface MacroTarget {
  /** Daily calorie goal (kcal). */
  calories?: number;
  /** Daily protein goal (grams). */
  proteinG?: number;
  /** Daily carbohydrate goal (grams). */
  carbsG?: number;
  /** Daily fat goal (grams). */
  fatG?: number;
}
