import { useCallback, useRef } from "react";
import { toast } from "sonner-native";
import { publishRecipeShare } from "~/data/api/recipeShareApi";
import { shareRecipe } from "~/utils/recipe-share";
import type { Recipe } from "~/types/Recipe";

/** Keep networking outside the export helper, and suppress repeated share taps. */
export function useShareRecipe(recipe: Recipe) {
  const pending = useRef(false);
  return useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const toastId = "publish-recipe-share";
    try {
      let link: string | undefined;
      try {
        link = await publishRecipeShare(recipe);
      } catch {
        toast("Couldn't create a link. Sharing the recipe text instead.", { id: toastId });
      }
      await shareRecipe(recipe, link);
    } finally {
      pending.current = false;
    }
  }, [recipe]);
}
