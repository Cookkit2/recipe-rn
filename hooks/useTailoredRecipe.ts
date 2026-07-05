import { useState, useEffect } from "react";
import type { Recipe } from "~/types/Recipe";
import { databaseFacade } from "~/data/db/DatabaseFacade";

export function useTailoredRecipe(
  isTailored: boolean,
  tailoredId: string | undefined,
  recipeId: string | undefined,
  baseRecipe: Recipe | null | undefined
) {
  const [tailoredRecipe, setTailoredRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTailoredRecipe = async () => {
      if (!isTailored || !recipeId) {
        if (isMounted) setTailoredRecipe(null);
        return;
      }
      if (!tailoredId) {
        if (isMounted) setTailoredRecipe(null);
        return;
      }

      const tailoredDetails = await databaseFacade.getTailoredRecipeWithDetails(tailoredId);

      if (!isMounted) return;
      if (!tailoredDetails) {
        setTailoredRecipe(null);
        return;
      }

      const mapped: Recipe = {
        id: tailoredDetails.recipe.id,
        title: tailoredDetails.recipe.title,
        description: tailoredDetails.recipe.description,
        imageUrl: tailoredDetails.recipe.imageUrl || baseRecipe?.imageUrl || "",
        prepMinutes: tailoredDetails.recipe.prepMinutes,
        cookMinutes: tailoredDetails.recipe.cookMinutes,
        difficultyStars: tailoredDetails.recipe.difficultyStars,
        servings: tailoredDetails.recipe.servings,
        calories: tailoredDetails.recipe.calories ?? baseRecipe?.calories,
        tags: tailoredDetails.recipe.tags || baseRecipe?.tags,
        ingredients: tailoredDetails.ingredients.map((ing, index) => ({
          name: ing.name,
          relatedIngredientId: `tailored-${tailoredDetails.recipe.id}-${index + 1}`,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        })),
        instructions: tailoredDetails.steps.map((step) => ({
          step: step.step,
          title: step.title,
          description: step.description,
          relatedIngredientIds: [],
        })),
        sourceUrl: baseRecipe?.sourceUrl,
      };

      setTailoredRecipe(mapped);
    };

    loadTailoredRecipe();

    return () => {
      isMounted = false;
    };
  }, [isTailored, tailoredId, recipeId, baseRecipe]);

  return { tailoredRecipe, setTailoredRecipe };
}
