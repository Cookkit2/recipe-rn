import type { PantryItem } from "~/types/PantryItem";
import type { RecipeIngredient } from "~/types/Recipe";

export interface IngredientPreviewData {
  matched: {
    name: string;
    imageUrl: NonNullable<PantryItem["image_url"]>;
    quantity: number;
    unit: string;
  }[];
  missing: { name: string; index: number; quantity: number; unit: string }[];
}

export const buildIngredientPreviewData = (
  ingredients: RecipeIngredient[],
  findMatch: (ingredient: RecipeIngredient) => PantryItem | null,
  limit = 6
): IngredientPreviewData => {
  const matched: IngredientPreviewData["matched"] = [];
  const missing: IngredientPreviewData["missing"] = [];

  ingredients.forEach((ingredient, idx) => {
    const matchingPantryItem = findMatch(ingredient);

    if (matchingPantryItem?.image_url) {
      matched.push({
        name: ingredient.name,
        imageUrl: matchingPantryItem.image_url,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      });
      return;
    }

    missing.push({
      name: ingredient.name,
      index: idx,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    });
  });

  return {
    matched: matched.slice(0, limit),
    missing: missing.slice(0, limit),
  };
};
