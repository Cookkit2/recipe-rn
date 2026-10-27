import type { RecipeAnalysisResult } from "~/types/ScrappedRecipe";
import { validateRecipeImportDraft } from "./import-review";

/** Model confidence supplements structural and source-evidence checks; it never replaces them. */
export function isAcceptedVideoRecipe(analysis: RecipeAnalysisResult): boolean {
  return (
    analysis.isCookingVideo === true &&
    Number.isFinite(analysis.confidence) &&
    analysis.confidence >= 0.8 &&
    analysis.confidence <= 1 &&
    !!analysis.recipe &&
    !analysis.recipe.ingredients.some((item) => item.name.toLowerCase() === "unknown ingredient") &&
    validateRecipeImportDraft({ recipe: analysis.recipe, warnings: [] }) === null
  );
}
