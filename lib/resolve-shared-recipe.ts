import type { RecipeShareSnapshot } from "~/utils/recipe-share-snapshot";
import { isRecipeShareToken } from "~/utils/recipe-share-link";
import type { CreateRecipeData } from "~/data/db/DatabaseFacade";
import { RecipeType } from "~/data/db/models/Recipe";

export interface SharedRecipeResolver {
  getRecipeById: (id: string) => Promise<{ id: string } | null>;
  fetchSnapshot: (token: string) => Promise<RecipeShareSnapshot>;
  createRecipe: (data: CreateRecipeData) => Promise<{ id: string }>;
  findMatchingRecipe: (snapshot: RecipeShareSnapshot) => Promise<string | undefined>;
  getResolvedRecipeId: (token: string) => string | undefined;
  rememberResolvedRecipeId: (token: string, recipeId: string) => void;
}

// Serialize the local match/save step, including different tokens for identical content.
let importQueue: Promise<unknown> = Promise.resolve();

/** Reopen saved content without overwriting edits or creating another copy. */
export async function resolveSharedRecipe(
  token: string,
  deps: SharedRecipeResolver
): Promise<string> {
  if (!isRecipeShareToken(token)) throw new Error("Invalid recipe link.");
  const findSaved = async () => {
    const resolvedId = deps.getResolvedRecipeId(token);
    if (resolvedId && resolvedId !== token) {
      const resolved = await deps.getRecipeById(resolvedId);
      if (resolved) return resolved.id;
    }
    return (await deps.getRecipeById(token))?.id;
  };
  const remember = (id: string) => {
    deps.rememberResolvedRecipeId(token, id);
    return id;
  };
  const local = await findSaved();
  if (local) return remember(local);
  const snapshot = await deps.fetchSnapshot(token);
  const importing = importQueue.then(async () => {
    const saved = await findSaved();
    if (saved) return remember(saved);
    const match = await deps.findMatchingRecipe(snapshot);
    if (match) return remember(match);
    const { version, instructions, ...recipe } = snapshot;
    try {
      const created = await deps.createRecipe({
        ...recipe,
        id: token,
        steps: instructions,
        type: RecipeType.CONVERTED,
      });
      return remember(created.id);
    } catch (error) {
      // Another receiver may have saved this token while the database was writing.
      const saved = await findSaved();
      if (saved) return remember(saved);
      throw error;
    }
  });
  importQueue = importing.catch(() => {});
  return importing;
}
