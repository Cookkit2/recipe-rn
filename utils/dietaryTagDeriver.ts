import type { NutritionSummary, DietaryTag } from "~/types/Nutrition";
import type { Allergen } from "~/types/Allergen";

export function deriveDietaryTags(
  nutrition: NutritionSummary,
  allergens: Allergen[]
): DietaryTag[] {
  const tags: DietaryTag[] = [];

  // Keto: carbs < 10g AND fat > 70% of calories
  const fatCalories = nutrition.fat * 9;
  const totalCalories = nutrition.calories || 1;
  if (nutrition.carbs < 10 && fatCalories / totalCalories > 0.7) {
    tags.push("keto");
  }

  // Low-carb: carbs < 20g per serving
  if (nutrition.carbs < 20) {
    tags.push("low-carb");
  }

  // High-protein: protein > 25g per serving
  if (nutrition.protein > 25) {
    tags.push("high-protein");
  }

  // Gluten-free: no wheat allergen
  if (!allergens.includes("wheat")) {
    tags.push("gluten-free");
  }

  // Dairy-free: no milk allergen
  if (!allergens.includes("milk")) {
    tags.push("dairy-free");
  }

  return tags;
}
