import type { RecipeShareSnapshot } from "~/utils/recipe-share-snapshot";
import { isRecipeShareToken } from "~/utils/recipe-share-link";
import type { CreateRecipeData } from "~/data/db/DatabaseFacade";
import { RecipeType } from "~/data/db/models/Recipe";

export interface SharedRecipeResolver {
  getRecipeById: (id: string) => Promise<{ id: string } | null>;
  fetchSnapshot: (token: string) => Promise<RecipeShareSnapshot>;
  createRecipe: (data: CreateRecipeData) => Promise<{ id: string }>;
}

/** A stable token ID deduplicates repeat opens without overwriting local edits. */
export async function resolveSharedRecipe(
  token: string,
  deps: SharedRecipeResolver
): Promise<string> {
  if (!isRecipeShareToken(token)) throw new Error("Invalid recipe link.");
  const local = await deps.getRecipeById(token);
  if (local) return local.id;
  const { version, instructions, ...recipe } = await deps.fetchSnapshot(token);
  try {
    const created = await deps.createRecipe({
      ...recipe,
      id: token,
      steps: instructions,
      type: RecipeType.CONVERTED,
    });
    return created.id;
  } catch (error) {
    // Another receiver may have saved the same token while this fetch was running.
    const saved = await deps.getRecipeById(token);
    if (saved) return saved.id;
    throw error;
  }
}
