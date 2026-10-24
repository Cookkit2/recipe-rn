import type { Recipe } from "~/types/Recipe";
import type { Json } from "~/lib/supabase/supabase-types";
import {
  buildRecipeShareLink,
  isRecipeShareToken,
  RECIPE_SHARE_ORIGIN,
  RECIPE_SHARE_HEALTH_PATH,
} from "~/utils/recipe-share-link";
import { buildRecipeShareSnapshot, parseRecipeShareSnapshot } from "~/utils/recipe-share-snapshot";

/** A persisted guest session is sufficient; sharing doesn't require account registration. */
export async function publishRecipeShare(recipe: Recipe): Promise<string> {
  const snapshot = buildRecipeShareSnapshot(recipe);
  // Don't hand out broken links while the website/domain is being activated.
  const available = await fetch(`${RECIPE_SHARE_ORIGIN}${RECIPE_SHARE_HEALTH_PATH}`, {
    signal: AbortSignal.timeout(5000),
  });
  const health: unknown = available.ok ? await available.json() : null;
  if (
    !health ||
    typeof health !== "object" ||
    !("service" in health) ||
    health.service !== "cookkit-recipe-links" ||
    !("ready" in health) ||
    health.ready !== true
  ) {
    throw new Error("Recipe links aren't available right now.");
  }
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
      p_snapshot: JSON.parse(JSON.stringify(snapshot)) as Json,
    })
    .abortSignal(AbortSignal.timeout(12000));
  if (error || !data) throw new Error("Couldn't create a recipe link.");
  return buildRecipeShareLink(data);
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
