import type { GeneratedRecipe } from "~/types/ScrappedRecipe";
import { log } from "~/utils/logger";

/**
 * Validates a generated recipe to ensure it has the minimum required content.
 * Returns true if the recipe is considered valid, false otherwise.
 */
export function isValidRecipe(recipe: Partial<GeneratedRecipe> | undefined): boolean {
  if (!recipe) return false;

  // 1. Check title
  if (!recipe.title || recipe.title.trim().length === 0) {
    log.warn("Recipe validation failed: Missing title");
    return false;
  }

  // 2. Check ingredients
  const validIngredients =
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.filter(
      (i) => i.name && i.name.trim().length > 0 && i.name.toLowerCase() !== "unknown ingredient"
    );
  const hasValidIngredients = validIngredients && validIngredients.length > 0;

  if (!hasValidIngredients) {
    log.warn(
      `Recipe validation failed: valid_ingredients=${validIngredients ? validIngredients.length : 0}`
    );
    return false;
  }

  // 3. Check steps
  const validSteps =
    Array.isArray(recipe.steps) &&
    recipe.steps.filter((s) => s.description && s.description.trim().length > 0);
  const hasValidSteps = validSteps && validSteps.length > 0;

  if (!hasValidSteps) {
    log.warn(`Recipe validation failed: valid_steps=${validSteps ? validSteps.length : 0}`);
    return false;
  }

  // 4. Check servings (optional but recommended for strictness)
  if (recipe.servings !== undefined && recipe.servings <= 0) {
    log.warn(`Recipe validation failed: Invalid servings ${recipe.servings}`);
    return false;
  }

  return true;
}
