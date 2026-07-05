import { useMemo } from "react";
import type { Recipe, RecipeIngredient, RecipeStep, StepPageData } from "~/types/Recipe";

// Re-export from types
export type { StepPageData } from "~/types/Recipe";

export function useRecipeStepPages(activeRecipe: Recipe | null | undefined): StepPageData[] {
  return useMemo((): StepPageData[] => {
    if (!activeRecipe) return [];

    const pages: StepPageData[] = [
      {
        type: "ingredients",
        step: 0,
        content: activeRecipe.ingredients,
      },
    ];

    activeRecipe.instructions.forEach((step) => {
      pages.push({
        type: "step",
        step: step.step,
        content: step,
      });
    });

    // Lastly push a congratulation page
    pages.push({
      type: "congratulations",
      step: activeRecipe.instructions.length + 1,
      content: null,
    });

    return pages;
  }, [activeRecipe]);
}
