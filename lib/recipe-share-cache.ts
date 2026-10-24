import { storageFacade as storage } from "~/data/storage";
import { buildRecipeShareLink, isRecipeShareToken } from "~/utils/recipe-share-link";

const PREFIX = "recipe_share_link_v1:";
const INDEX_KEY = "recipe_share_link_index_v1";
const MAX_ENTRIES = 50;

/** Compare the public snapshot, so private state never invalidates a reusable link. */
export function getCachedRecipeShareLink(recipeId: string, snapshot: string): string | undefined {
  try {
    const entry = storage.get<unknown>(PREFIX + recipeId);
    if (
      !entry ||
      typeof entry !== "object" ||
      !("snapshot" in entry) ||
      entry.snapshot !== snapshot ||
      !("token" in entry) ||
      typeof entry.token !== "string" ||
      !isRecipeShareToken(entry.token)
    ) {
      return undefined;
    }
    return buildRecipeShareLink(entry.token);
  } catch {
    // An unavailable or corrupt cache must not prevent publishing a fresh link.
    return undefined;
  }
}

/** Keep only the latest snapshot for each of the 50 most recently published recipes. */
export function cacheRecipeShareLink(recipeId: string, snapshot: string, token: string): void {
  if (!isRecipeShareToken(token)) return;
  try {
    const storedIndex = storage.get<unknown>(INDEX_KEY);
    const previous: string[] = Array.isArray(storedIndex)
      ? storedIndex.filter((id): id is string => typeof id === "string" && id !== recipeId)
      : [];
    const next = [recipeId, ...new Set(previous)];
    storage.set(INDEX_KEY, next.slice(0, MAX_ENTRIES));
    for (const id of next.slice(MAX_ENTRIES)) storage.delete(PREFIX + id);
    storage.set(PREFIX + recipeId, { snapshot, token });
  } catch {
    // Sharing still succeeds if local persistence is unavailable.
  }
}
