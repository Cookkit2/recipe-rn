/**
 * Recipe sharing MVP (issue #737, P4-2 / tracer-bullet).
 *
 * This is the CLIENT-SIDE slice of the sharing surface: it builds a deep link
 * to a recipe the user already owns, produces a deterministic plain-text
 * export for the native share sheet, and wraps React Native `Share.share` with
 * funnel instrumentation (#718 pattern). Everything here works offline with no
 * account and no network beyond link generation.
 *
 * The SERVER-SIDE story (Supabase `recipe_share` snapshot table + RLS, so that
 * a recipient who does NOT own the recipe can resolve the token to a server
 * snapshot and import it) is DEFERRED — see the PR body / deferredFollowups.
 * The MVP deep link resolves LOCAL recipes only; an unowned token surfaces a
 * "recipe not in your library" state in the ingestion hook.
 *
 * Pure helpers (`buildRecipeDeepLink`, `buildRecipeTextExport`, the
 * `cookkit://recipe/<id>` URL parser) are exported separately so the Jest suite
 * can assert determinism without touching `Share` / Sentry.
 */

import { Share } from "react-native";
import type { Recipe } from "~/types/Recipe";
import { emitFunnelEvent } from "~/lib/analytics/funnel-events";

/**
 * The custom URL scheme used for recipe deep links. Must match the `scheme`
 * configured in app.json / app.config.js so iOS/Android route the link to the
 * installed app.
 */
export const RECIPE_DEEP_LINK_SCHEME = "cookkit";

/** Route path segment for a recipe deep link: `cookkit://recipe/<id>`. */
export const RECIPE_DEEP_LINK_HOST = "recipe";

/**
 * Build a `cookkit://recipe/<recipeId>` deep link.
 *
 * Pure + deterministic. The id is URL-encoded so an id that happens to contain
 * reserved characters still round-trips through the parser below. A non-empty
 * id is required — an empty id throws (defensive; a caller passing `""` is a
 * bug, not a graceful-degradation case).
 */
export function buildRecipeDeepLink(recipeId: string): string {
  if (!recipeId) {
    throw new Error("buildRecipeDeepLink: recipeId must be a non-empty string");
  }
  return `${RECIPE_DEEP_LINK_SCHEME}://${RECIPE_DEEP_LINK_HOST}/${encodeURIComponent(recipeId)}`;
}

/**
 * Parsed deep-link route. `kind: "recipe"` carries the recipe id; any other
 * URL (different scheme/host, no id) is `kind: "unknown"` so the ingestion
 * hook can no-op cleanly.
 */
export type ParsedDeepLink = { kind: "recipe"; recipeId: string } | { kind: "unknown" };

/**
 * Parse a `cookkit://recipe/<id>` (or equivalent) URL into a typed route.
 *
 * Pure + tolerant: accepts either `cookkit://recipe/<id>` (custom scheme) or
 * `cookkit://recipe/<id>` with extra path/query noise, decodes the id, and
 * returns `kind: "unknown"` for anything that is not a recipe route (including
 * null/empty input — the cold-start `Linking.getInitialURL()` path returns
 * null when the app was not launched from a link).
 */
export function parseRecipeDeepLink(url: string | null | undefined): ParsedDeepLink {
  if (!url) return { kind: "unknown" };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "unknown" };
  }

  // Custom schemes (cookkit://) surface as scheme "cookkit" + host "recipe";
  // the id is the first pathname segment. Tolerate a trailing slash or query.
  if (parsed.protocol !== `${RECIPE_DEEP_LINK_SCHEME}:`) {
    return { kind: "unknown" };
  }
  if (parsed.hostname !== RECIPE_DEEP_LINK_HOST) {
    return { kind: "unknown" };
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const rawId = segments[0];
  if (!rawId) return { kind: "unknown" };

  let recipeId: string;
  try {
    recipeId = decodeURIComponent(rawId);
  } catch {
    recipeId = rawId;
  }
  if (!recipeId) return { kind: "unknown" };

  return { kind: "recipe", recipeId };
}

/**
 * Build a deterministic plain-text export of a recipe for the native share
 * sheet: title, servings, a bulleted ingredient list, numbered steps, and a
 * source-attribution footer.
 *
 * Determinism contract (unit-tested): for a given `Recipe` input this always
 * returns the exact same string — no timestamps, no locale-dependent number
 * formatting, no `Date` calls. Optional fields are omitted cleanly rather
 * than emitting placeholder lines, so two recipes differing only in an absent
 * optional field produce sibling-shaped output.
 *
 * Source attribution: when `sourceUrl` is present the footer reads
 * "Recipe from <url>". When the recipe was imported from a web source but has
 * no `sourceUrl` recorded, the footer still credits Cookkit ("Shared from
 * Cookkit") so recipients can attribute the chain. This is the [F11]
 * attribution hygiene noted in the issue risks.
 */
export function buildRecipeTextExport(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(recipe.title);
  lines.push("");

  if (recipe.servings && recipe.servings > 0) {
    lines.push(`Servings: ${recipe.servings}`);
  }

  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  if (totalMinutes > 0) {
    lines.push(`Total time: ${totalMinutes} minutes`);
  }

  if (recipe.description && recipe.description.trim()) {
    lines.push("");
    lines.push(recipe.description.trim());
  }

  // Ingredients — bullet list, quantity + unit + name + optional notes.
  if (recipe.ingredients.length > 0) {
    lines.push("");
    lines.push("Ingredients:");
    for (const ingredient of recipe.ingredients) {
      const quantityPart =
        ingredient.quantity && ingredient.unit
          ? `${formatQuantity(ingredient.quantity)} ${ingredient.unit}`
          : ingredient.quantity
            ? formatQuantity(ingredient.quantity)
            : "";
      const namePart = ingredient.name;
      const notePart = ingredient.notes ? ` (${ingredient.notes})` : "";
      const composed = [quantityPart, namePart].filter(Boolean).join(" ");
      lines.push(`- ${composed}${notePart}`);
    }
  }

  // Steps — numbered list, preserving the recipe's step order.
  if (recipe.instructions.length > 0) {
    lines.push("");
    lines.push("Instructions:");
    const sortedSteps = [...recipe.instructions].sort((a, b) => a.step - b.step);
    sortedSteps.forEach((instruction, index) => {
      const num = index + 1;
      const heading = instruction.title ? `${instruction.title}: ` : "";
      lines.push(`${num}. ${heading}${instruction.description}`);
    });
  }

  // Source attribution footer.
  lines.push("");
  if (recipe.sourceUrl) {
    lines.push(`Recipe from ${recipe.sourceUrl}`);
  } else {
    lines.push("Shared from Cookkit");
  }

  return lines.join("\n");
}

/**
 * Format a numeric quantity deterministically: integers render without a
 * decimal point; non-integers render with up to 2 decimals, trailing zeros
 * stripped. Avoids locale-dependent `Number` formatting so the export is
 * byte-identical across devices (determinism contract).
 */
function formatQuantity(quantity: number): string {
  if (Number.isInteger(quantity)) {
    return String(quantity);
  }
  const rounded = Math.round(quantity * 100) / 100;
  return String(rounded);
}

/**
 * Result of `shareRecipe`. Mirrors React Native `Share.share`'s `action` field
 * but normalizes the "dismissed without an action" case to a stable enum so
 * callers can branch without sniffing the platform.
 */
export type ShareRecipeResult = {
  /** Which share surface the user actually engaged with, or "dismissed". */
  action: "shared" | "dismissed";
};

/**
 * Open the native share sheet for a recipe, sharing both the plain-text export
 * and the deep link so the recipient can either read inline or open in Cookkit.
 *
 * Emits two funnel events (#718 pattern):
 *  - `share_link_created` — the deep link was generated and attached (always,
 *    even if the user dismisses the sheet, because the link materialized).
 *  - `share_exported` — the user completed a share action (not a dismissal).
 *
 * Both emits are fire-and-forget: `shareRecipe` never throws on an analytics
 * failure (the funnel layer swallows internally), and a `Share.share` rejection
 * (e.g. share sheet unavailable) resolves to `{ action: "dismissed" }` rather
 * than throwing, so the recipe detail screen's tap handler stays simple.
 */
export async function shareRecipe(recipe: Recipe): Promise<ShareRecipeResult> {
  // Build the link up front so it can be attached to the message even if we
  // later choose a different share surface, and so share_link_created fires
  // before any await that could reject.
  const link = buildRecipeDeepLink(recipe.id);
  emitFunnelEvent("share_link_created", {
    detail: { recipeId: recipe.id },
  });

  const text = `${buildRecipeTextExport(recipe)}\n\nOpen in Cookkit: ${link}`;

  try {
    const result = await Share.share({
      message: text,
      // `title` is iOS-only; both are best-effort and ignored on the other
      // platform. (ShareContent has no dialogTitle field — Android uses the
      // activity's title instead.)
      title: recipe.title,
    });

    // On iOS `result.action` is "shared" | "dismissedAction"; on Android the
    // promise rejects on dismissal, so reaching here with `action ===
    // "shared"` (or an undefined action on older Android) means shared.
    if (result && result.action === Share.dismissedAction) {
      return { action: "dismissed" };
    }

    emitFunnelEvent("share_exported", {
      detail: { recipeId: recipe.id },
    });
    return { action: "shared" };
  } catch {
    // Rejection === dismissal on Android, or share sheet unavailable. Either
    // way the user did not complete a share; do not emit share_exported.
    return { action: "dismissed" };
  }
}
