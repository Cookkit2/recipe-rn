import type { Recipe } from "~/types/Recipe";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { convertDbRecipesToUISearchSummaries } from "./recipe-conversion";
import { getResolvedRecipeShareIds } from "~/lib/recipe-share-cache";

/** Personal recipes only; the synced discovery catalog stays in Let's Cook. */
export async function fetchMyRecipes(): Promise<Recipe[]> {
  const recipes = await databaseFacade.getAllRecipes();
  const receivedIds = new Set(getResolvedRecipeShareIds());
  const personal = recipes
    .filter(
      (recipe) =>
        recipe.type === "converted" ||
        recipe.type === "tailored" ||
        recipe.isFavorite ||
        receivedIds.has(recipe.id)
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
  // No steps/ingredient reads for a list, and no pantry/dietary recommendation filters.
  return convertDbRecipesToUISearchSummaries(personal);
}
