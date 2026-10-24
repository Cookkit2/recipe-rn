import type { RecipeImportDraft } from "~/types/RecipeImportDraft";

/** A draft with unspecified amounts must never silently enter grocery calculations. */
export function validateRecipeImportDraft({ recipe }: RecipeImportDraft): string | null {
  if (!recipe.title.trim()) return "Add a recipe name.";
  if (!Number.isInteger(recipe.servings) || recipe.servings < 1)
    return "Add the number of servings.";
  if ([recipe.prepMinutes, recipe.cookMinutes].some((time) => !Number.isFinite(time) || time < 0))
    return "Check the preparation and cooking times.";
  if (!recipe.ingredients.length) return "Add at least one ingredient.";
  if (recipe.ingredients.some((item) => !item.name.trim())) return "Name each ingredient.";
  if (recipe.ingredients.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0))
    return "Add the missing ingredient amounts before saving.";
  if (recipe.ingredients.some((item) => !item.unit.trim()))
    return "Add the missing ingredient units before saving.";
  if (!recipe.steps.length || recipe.steps.some((step) => !step.description.trim()))
    return "Add the missing cooking instructions.";
  return null;
}
