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

/**
 * True when every ingredient id for the recipe is present in `used`.
 * Returns false when there are no ingredients (nothing to complete).
 */
export function areAllIngredientsUsed(
  used: ReadonlySet<string>,
  ingredientIds: readonly string[]
): boolean {
  if (ingredientIds.length === 0) return false;
  return ingredientIds.every((id) => used.has(id));
}
