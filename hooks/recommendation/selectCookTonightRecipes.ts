/**
 * First-session "cook tonight from what you have" selector (issue #720).
 *
 * Pure selection used by the dark-launched aha surface: given the same
 * completion map the recommendation engine already builds (recipeId ->
 * 0..100), return ONLY recipes the user can cook right now (100% complete),
 * ranked so the top one is the best "tonight" pick — and tagged with the
 * existing matchCategory union so the UI badge stays consistent with the home
 * screen (`components/Pantry/RecipeItemCard.tsx`).
 *
 * This is a thin, side-effect-free orchestration of the existing primitives:
 *   - `AvailabilityFilter({ minAvailability: 100 })` keeps only 100%-complete
 *     recipes (matches `matchCategory === "can_make_now"`).
 *   - `ReadinessStrategy` ranks them, hoisting the most-ready first (they are
 *     all 100% here, but the multiplier keeps the ordering stable and matches
 *     what the issue spec names as the ranking strategy).
 *
 * Pure by design so the Jest suite can assert the selection + ranking against a
 * fixture pantry WITHOUT touching WatermelonDB, Supabase, or TanStack Query —
 * mirroring the testable-core pattern in `lib/analytics/funnel-events.ts`.
 */

import type { Recipe } from "~/types/Recipe";
import type { RecipeMatchCategory } from "~/types/RecipeMatching";
import { AvailabilityFilter } from "./filters/AvailabilityFilter";
import { ReadinessStrategy } from "./ranking/strategies/ReadinessStrategy";
import type { FilterContext } from "./filters/RecipeFilterStrategy";
import type { RankingContext } from "./ranking/RecipeRankingStrategy";

/** A recipe paired with its pantry-completion data + derived match category. */
export interface CookTonightRecipe {
  recipe: Recipe;
  /** 0..100 — percentage of this recipe's ingredients the pantry satisfies. */
  completionPercentage: number;
  /** Always `can_make_now` for results of this selector (kept for UI parity). */
  matchCategory: RecipeMatchCategory;
}

export interface SelectCookTonightOptions {
  /**
   * Map of recipeId -> completion percentage (0..100). This is the exact shape
   * `recipeApi.getRecipeRecommendations` builds from
   * `databaseFacade.getAvailableRecipes()` (canMake = 100, partiallyCanMake =
   * its completionPercentage), so callers can reuse cached availability.
   */
  completionPercentages: Map<string, number>;
  /**
   * Readiness multiplier forwarded to ReadinessStrategy. Default 1 (matches the
   * strategy default). Exposed so A/B variants can tweak weighting.
   */
  readinessMultiplier?: number;
  /** Cap on the number of results (the aha surface only needs a handful). */
  maxResults?: number;
}

/**
 * Derive the existing matchCategory union from a completion percentage, so the
 * aha surface badge matches the home-screen badge exactly.
 *
 * Exported separately so the test suite can assert the boundaries without
 * going through the full selector.
 */
export function matchCategoryForCompletion(completionPercentage: number): RecipeMatchCategory {
  // Mirrors the home screen's categorization: 100% = can make now, otherwise
  // bucket by how much is missing. (The cook-tonight selector only ever returns
  // can_make_now, but this helper keeps the boundary logic in one tested place.)
  if (completionPercentage >= 100) return "can_make_now";
  if (completionPercentage >= 60) return "missing_1_2"; // ~1-2 ingredients short
  return "missing_3_plus";
}

/**
 * Select the recipes the user can cook TONIGHT from what is in their pantry.
 *
 * Filters to 100%-complete recipes via `AvailabilityFilter` and ranks them via
 * `ReadinessStrategy`, then tags each with its matchCategory. Returns an empty
 * array (NOT null) when nothing is cookable — callers render the graceful
 * fallback state. Stable ordering: ties keep input order (Array.prototype.sort
 * is stable in the engines this app targets).
 *
 * @example
 * const cookTonight = selectCookTonightRecipes(allRecipes, {
 *   completionPercentages: new Map([["r1", 100], ["r2", 50]]),
 * });
 * // => [{ recipe: r1, completionPercentage: 100, matchCategory: "can_make_now" }]
 */
export function selectCookTonightRecipes(
  recipes: Recipe[],
  options: SelectCookTonightOptions
): CookTonightRecipe[] {
  const { completionPercentages, readinessMultiplier, maxResults } = options;

  const filter = new AvailabilityFilter({ minAvailability: 100 });
  const ranker = new ReadinessStrategy(
    readinessMultiplier !== undefined ? { multiplier: readinessMultiplier } : undefined
  );

  const filterCtx: FilterContext = { completionPercentages };
  const rankingCtx: RankingContext = { completionPercentages };

  // 1) Keep only 100%-complete recipes (what AvailabilityFilter({min:100})
  //    resolves to given the completion map).
  const cookable = recipes.filter((recipe) => filter.filter(recipe, filterCtx));

  // 2) Tag with completion + matchCategory, then rank via ReadinessStrategy
  //    (higher score first).
  const tagged: CookTonightRecipe[] = cookable.map((recipe) => {
    const completionPercentage = completionPercentages.get(recipe.id) ?? 0;
    return {
      recipe,
      completionPercentage,
      matchCategory: matchCategoryForCompletion(completionPercentage),
    };
  });

  tagged.sort((a, b) => ranker.score(b.recipe, rankingCtx) - ranker.score(a.recipe, rankingCtx));

  if (maxResults !== undefined && maxResults >= 0) {
    return tagged.slice(0, maxResults);
  }
  return tagged;
}
