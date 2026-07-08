/**
 * Ingredient tick-off helpers for the hands-free cooking screen.
 *
 * Pure functions backing the per-cook-session "used ingredient" state in
 * RecipeStepsContext. Kept side-effect-free (no React, no storage reads) so
 * the toggle + completion logic is unit-testable in isolation; the provider
 * owns MMKV persistence and state, delegating the set math here.
 *
 * Contract
 * - Input: the current used set, the ingredient id, and the full ordered list
 *   of ingredient ids for the active recipe.
 * - Output: a NEW Set (immutability preserved — callers must not mutate the
 *   input set) and a derived allUsed boolean.
 *
 * @remarks See [[RecipeStepsContext]] for the persistence layer and
 * [[IngredientContent]] for the render surface. Local/MMKV-only by design per
 * the issue scope (no multi-device CRDT sync).
 */

/** Returns a new Set with the given id toggled in/out of `used`. */
export function toggleIngredientUsed(used: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(used);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}
