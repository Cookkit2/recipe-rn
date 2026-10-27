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
    rememberResolvedRecipeShareId(token, recipeId);
  } catch {
    // Sharing still succeeds if local persistence is unavailable.
  }
}

const RESOLVED_PREFIX = "recipe_share_resolved_v1:";
const RESOLVED_INDEX_KEY = "recipe_share_resolved_index_v1";
const MAX_RESOLVED_ENTRIES = 100;

/** Resolve a received link offline, including links published by this installation. */
export function getResolvedRecipeShareId(token: string): string | undefined {
  if (!isRecipeShareToken(token)) return undefined;
  try {
    const resolved = storage.get<unknown>(RESOLVED_PREFIX + token);
    if (typeof resolved === "string" && resolved) return resolved;
    // Recover links published before incoming-link identity was persisted.
    const index = storage.get<unknown>(INDEX_KEY);
    if (Array.isArray(index)) {
      for (const id of index.slice(0, MAX_ENTRIES)) {
        if (typeof id !== "string") continue;
        const entry = storage.get<{ token?: unknown }>(PREFIX + id);
        if (entry?.token === token) return id;
      }
    }
  } catch {
    // A corrupt cache must not prevent the ordinary import path.
  }
  return undefined;
}

/** Keep link identity separate from mutable recipe content and private state. */
export function rememberResolvedRecipeShareId(token: string, recipeId: string): void {
  if (!isRecipeShareToken(token) || !recipeId) return;
  try {
    const index = storage.get<unknown>(RESOLVED_INDEX_KEY);
    const previous = Array.isArray(index)
      ? index.filter((id): id is string => typeof id === "string" && id !== token)
      : [];
    const next = [token, ...new Set(previous)];
    storage.set(RESOLVED_INDEX_KEY, next.slice(0, MAX_RESOLVED_ENTRIES));
    for (const id of next.slice(MAX_RESOLVED_ENTRIES)) storage.delete(RESOLVED_PREFIX + id);
    storage.set(RESOLVED_PREFIX + token, recipeId);
  } catch {
    // Saving/opening a recipe still succeeds when optional persistence is unavailable.
  }
}

/** Include reused and legacy received recipes in My Recipes without changing their content. */
export function getResolvedRecipeShareIds(): string[] {
  try {
    const index = storage.get<unknown>(RESOLVED_INDEX_KEY);
    if (!Array.isArray(index)) return [];
    const ids = new Set<string>();
    for (const token of index.slice(0, MAX_RESOLVED_ENTRIES)) {
      if (typeof token !== "string" || !isRecipeShareToken(token)) continue;
      const id = storage.get<unknown>(RESOLVED_PREFIX + token);
      if (typeof id === "string" && id) ids.add(id);
    }
    return [...ids];
  } catch {
    return [];
  }
}
