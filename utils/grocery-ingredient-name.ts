import { normalizeRecipeIngredient } from "./recipe-ingredient-match";

/** Full ingredient names and preparation words, using shared food noun normalization. */
export function normalizeGroceryIngredientName(name: string): string {
  return normalizeRecipeIngredient(name);
}
