/**
 * Pure deep-link ingestion logic for recipe sharing (issue #737 MVP).
 *
 * Split out of hooks/useDeepLinkShare.ts so the routing/navigation logic is
 * unit-testable in isolation: this module has zero React / expo-router
 * imports, so the Jest suite can exercise it without booting the expo module
 * graph (which requires a `window`). The React hook in
 * hooks/useDeepLinkShare.ts wires this handler to `Linking` + the router.
 *
 * MVP scope: resolves LOCAL recipes only. The server-snapshot fetch for
 * UNOWNED recipes is DEFERRED (see PR body) — when the recipe is not in the
 * local library the handler delegates to `alertNotInLibrary`, which surfaces
 * a clear "recipe not in your library" state.
 */

import { parseRecipeDeepLink } from "~/utils/recipe-share";

/**
 * Dependencies injected so the handler is pure: the caller supplies the
 * recipe lookup, the navigation call, the not-in-library alert, and the
 * analytics emitter. This lets the test mock each side effect.
 */
export interface HandleShareDeepLinkDeps {
  /** Look up a recipe by id; returns null when not in the local library. */
  getRecipeById: (id: string) => Promise<{ id: string } | null>;
  /** Navigate to the given router path (e.g. /recipes/<id>). */
  navigate: (path: string) => void;
  /** Surface the "recipe not in your library" state for an unowned token. */
  alertNotInLibrary: (recipeId: string) => void;
  /** Emit the share_link_opened funnel event. */
  emitOpened: (recipeId: string, resolvedLocally: boolean) => void;
}

/**
 * Handle a single incoming deep-link URL.
 *
 * 1. Parse the URL (no-op for non-recipe links / null cold-start input).
 * 2. Look up the recipe locally; treat a thrown lookup as not-in-library.
 * 3. Emit `share_link_opened` with whether the recipe resolved locally.
 * 4. Navigate to the recipe detail route if local, else alert.
 *
 * Never throws — a DB failure degrades to the not-in-library branch.
 */
export async function handleShareDeepLink(
  url: string | null | undefined,
  deps: HandleShareDeepLinkDeps
): Promise<void> {
  const parsed = parseRecipeDeepLink(url);
  if (parsed.kind !== "recipe") return;

  const { recipeId } = parsed;
  let local: { id: string } | null = null;
  try {
    local = await deps.getRecipeById(recipeId);
  } catch {
    // DB unavailable (cold start race, corrupted store). Treat as not-in-
    // library so the user gets a clear state rather than a silent no-op.
    local = null;
  }

  deps.emitOpened(recipeId, !!local);

  if (local) {
    deps.navigate(`/recipes/${encodeURIComponent(recipeId)}`);
  } else {
    deps.alertNotInLibrary(recipeId);
  }
}
