import type { Recipe } from "~/types/Recipe";
import type { Json } from "~/lib/supabase/supabase-types";
import { cacheRecipeShareLink, getCachedRecipeShareLink } from "~/lib/recipe-share-cache";
import { buildRecipeShareLink, isRecipeShareToken } from "~/utils/recipe-share-link";
import { buildRecipeShareSnapshot, parseRecipeShareSnapshot } from "~/utils/recipe-share-snapshot";

const pendingShares = new Map<string, Promise<string>>();

/** Reuse unchanged public snapshots before doing any authentication or networking. */
export async function publishRecipeShare(recipe: Recipe): Promise<string> {
  const snapshot = JSON.stringify(buildRecipeShareSnapshot(recipe));
  const cachedLink = getCachedRecipeShareLink(recipe.id, snapshot);
  if (cachedLink) return cachedLink;

  const key = JSON.stringify([recipe.id, snapshot]);
  const pending = pendingShares.get(key);
  if (pending) return pending;
  const publishing = createRecipeShare(recipe.id, snapshot);
  pendingShares.set(key, publishing);
  try {
    return await publishing;
  } finally {
    pendingShares.delete(key);
  }
}

/** A persisted guest session is sufficient; sharing doesn't require account registration. */
async function createRecipeShare(recipeId: string, snapshot: string): Promise<string> {
  const { supabase } = await import("~/lib/supabase/supabase-client");
  if (!supabase) throw new Error("Recipe links aren't configured yet.");
  const session = await supabase.auth.getSession();
  if (session.error) throw new Error("Couldn't connect to recipe sharing.");
  if (!session.data.session) {
    const guest = await supabase.auth.signInAnonymously();
    if (guest.error || !guest.data.session) throw new Error("Couldn't connect to recipe sharing.");
  }
  const { data, error } = await supabase
    .rpc("create_recipe_share", {
      p_snapshot: JSON.parse(snapshot) as Json,
    })
    .abortSignal(AbortSignal.timeout(12000));
  if (error || !data) throw new Error("Couldn't create a recipe link.");
  const link = buildRecipeShareLink(data);
  cacheRecipeShareLink(recipeId, snapshot, data);
  return link;
}

export async function fetchRecipeShare(token: string) {
  if (!isRecipeShareToken(token)) throw new Error("Invalid recipe link.");
  const { supabase } = await import("~/lib/supabase/supabase-client");
  if (!supabase) throw new Error("Couldn't connect to recipe sharing.");
  const { data, error } = await supabase
    .rpc("get_recipe_share", { p_token: token })
    .abortSignal(AbortSignal.timeout(12000));
  if (error) throw new Error("Couldn't load this recipe. Check your connection and try again.");
  if (!data) throw new Error("This recipe link is no longer available.");
  return parseRecipeShareSnapshot(data);
}
