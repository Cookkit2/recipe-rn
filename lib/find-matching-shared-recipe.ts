import type { databaseFacade } from "~/data/db/DatabaseFacade";
import { convertDbRecipesToUIRecipesBatch } from "~/data/api/recipe-conversion";
import {
  buildRecipeShareSnapshot,
  parseRecipeShareSnapshot,
  type RecipeShareSnapshot,
} from "~/utils/recipe-share-snapshot";

function contentKey(snapshot: RecipeShareSnapshot): string {
  const normalized = parseRecipeShareSnapshot(snapshot);
  return JSON.stringify({
    ...normalized,
    tags: [...normalized.tags].sort(),
    // Database row order may differ after sync; instruction order still matters.
    ingredients: normalized.ingredients.map((row) => JSON.stringify(row)).sort(),
  });
}

/** Reuse identical public content, never recipes that merely have the same title. */
export async function findMatchingSharedRecipe(
  snapshot: RecipeShareSnapshot,
  database: Pick<typeof databaseFacade, "searchRecipes" | "getRecipesWithDetails">
): Promise<string | undefined> {
  const candidates = (await database.searchRecipes(snapshot.title)).filter(
    (recipe) => recipe.title.trim() === snapshot.title
  );
  if (!candidates.length) return undefined;
  const details = await database.getRecipesWithDetails(candidates.map((recipe) => recipe.id));
  const expected = contentKey(snapshot);
  for (const recipe of convertDbRecipesToUIRecipesBatch(candidates, details)) {
    try {
      if (contentKey(buildRecipeShareSnapshot(recipe)) === expected) return recipe.id;
    } catch {
      // An incomplete local recipe must not block opening a valid shared recipe.
    }
  }
  return undefined;
}
