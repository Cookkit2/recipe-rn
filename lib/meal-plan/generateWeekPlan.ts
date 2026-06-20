// =============================================================================
// Auto Meal-Plan Generation — pure planner (tracer-bullet MVP, issue #727)
// =============================================================================
// This module is the PURE, side-effect-free core of the "Plan my week" flow.
// It does NOT touch the database or the network — it takes an already-ranked
// list of candidate recipes and assigns them to (day, mealSlot) cells over a
// week, applying a simple no-repeat-in-week variety constraint and scaling
// servings to the household size.
//
// Composition (NOT new logic) of existing primitives happens one layer up, in
// recommendCandidates() below, which wires the existing AvailabilityFilter +
// DietaryFilter + createHistoryAwareRankingStrategy together. The ranking and
// filtering algorithms themselves are reused verbatim — this file only adds:
//   1. greedy slot assignment (spike Unknown C), and
//   2. household-serving scaling (spike Unknown B, via utils/recipe-scaling).
//
// The Gemini tailored-recipe layer (spike Unknown D) is intentionally NOT
// invoked here — the MVP plans base recipes only. See PR description /
// deferredFollowups.
// =============================================================================

import type { Recipe } from "~/types/Recipe";
import type { MealSlot, MEAL_SLOTS } from "~/types/MealPlan";
import { calculateScalingFactor } from "~/utils/recipe-scaling";
import {
  AvailabilityFilter,
  CompositeFilterStrategy,
  DietaryFilter,
  createHistoryAwareRankingStrategy,
} from "~/hooks/recommendation";
import type {
  CookingHistoryData,
  FilterContext,
  RankingContext,
  RecipeFilterStrategy,
  RecipeRankingStrategy,
} from "~/hooks/recommendation";

/**
 * UI-recipe-shaped availability input for the planner. Structurally identical
 * to DatabaseFacade.AvailableRecipesResult but typed against the UI `Recipe`
 * (~/types/Recipe), not the WatermelonDB model — the planner and the
 * recommendation pipeline operate on converted UI recipes, so we avoid pulling
 * the DB model's ~50 fields into this module's type surface.
 */
export interface PlannerAvailability {
  /** Recipes that can be made fully from pantry stock (100% completion). */
  canMake: Recipe[];
  /** Recipes partially makeable, each with a 0-100 completion percentage. */
  partiallyCanMake: Array<{ recipe: Recipe; completionPercentage: number }>;
}

/** A single planned cell produced by the planner (NOT yet a DB row). */
export interface PlannedMeal {
  recipeId: string;
  /** Day offset from `weekStart` (0 = weekStart's day). */
  dayOffset: number;
  /** Absolute date for the slot (start-of-day). */
  date: Date;
  mealSlot: MealSlot;
  /** Servings scaled to the household size. */
  servings: number;
  /** The original recipe's base servings (for grocery-list scaling). */
  recipeServings: number;
  /** Completion % of pantry coverage (0-100), passed through from ranking. */
  completionPercentage: number;
}

/** Result of a full generation pass. */
export interface WeekPlanResult {
  meals: PlannedMeal[];
  /** Recipes that were ranked but could not be placed (fewer slots than recipes). */
  unusedRecipes: Recipe[];
}

export interface GenerateWeekPlanOptions {
  /** Sorted (best-first) candidate recipes to draw from. */
  candidates: Recipe[];
  /** Start of the week to plan (day-0 of the plan). */
  weekStart: Date;
  /** Number of days to plan (default 7). */
  days?: number;
  /** Which meal slots to fill each day (default lunch + dinner). */
  mealSlots?: MealSlot[];
  /** Target servings per slot. When omitted, uses each recipe's base servings. */
  targetServings?: number;
}

/** Normalize a date to its start-of-day in the local timezone (no mutation). */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Compute the servings to assign to a slot, given a target household size and
 * the recipe's own base servings. The grocery list aggregates ingredients by
 * multiplying each by `mealPlanItem.servings / recipe.servings`, so storing
 * the household target as the slot's servings yields a multiplier of
 * `target / base`. We reuse the tested `calculateScalingFactor` primitive to
 * derive that multiplier here so the arithmetic lives in exactly one place.
 *
 * - If no target is given, keep the recipe's own servings (multiplier 1).
 * - If the recipe has no servings, fall back to the target unchanged.
 */
export function computeSlotServings(
  recipe: Pick<Recipe, "servings">,
  targetServings?: number
): number {
  if (targetServings === undefined) {
    return recipe.servings ?? 0;
  }
  if (!recipe.servings || recipe.servings <= 0) {
    return targetServings;
  }
  // Sanity guard: an invalid (non-finite / non-positive) target would corrupt
  // grocery math downstream — validate via the shared helper and fall back.
  if (!Number.isFinite(targetServings) || targetServings <= 0) {
    return recipe.servings;
  }
  const factor = calculateScalingFactor(recipe.servings, targetServings);
  // Storing the target keeps the grocery multiplier == factor. We round the
  // result to whole servings (people are counted in whole numbers).
  return Math.max(1, Math.round(recipe.servings * factor));
}

/**
 * Assign recipes to (day, mealSlot) cells with a no-repeat-in-week constraint.
 *
 * Greedy walk: for each cell, pick the highest-ranked candidate not yet used
 * this week. If the candidate pool is exhausted before filling all cells, the
 * remaining cells are left empty (returned as-is) — callers decide whether
 * that is acceptable. This is the spike's Unknown C: ~30-60 lines of greedy
 * assignment, not new ranking logic.
 *
 * Pure: deterministic given the candidate order and a fixed `weekStart`.
 */
export function assignMealsToSlots(options: GenerateWeekPlanOptions): WeekPlanResult {
  const {
    candidates,
    weekStart,
    days = 7,
    mealSlots = ["lunch", "dinner"] as MealSlot[],
    targetServings,
  } = options;

  const baseDay = startOfDay(weekStart);
  const usedRecipeIds = new Set<string>();
  const meals: PlannedMeal[] = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    for (const mealSlot of mealSlots) {
      // Find the next best candidate not yet used this week.
      const pick = candidates.find((c) => !usedRecipeIds.has(c.id));
      if (!pick) {
        // No-repeat pool exhausted — stop assigning. Unused recipes are empty
        // by definition at this point.
        return finalize(meals, candidates, usedRecipeIds);
      }

      usedRecipeIds.add(pick.id);
      const date = new Date(baseDay);
      date.setDate(date.getDate() + dayOffset);

      meals.push({
        recipeId: pick.id,
        dayOffset,
        date,
        mealSlot,
        servings: computeSlotServings(pick, targetServings),
        recipeServings: pick.servings ?? 0,
        completionPercentage: 0,
      });
    }
  }

  return finalize(meals, candidates, usedRecipeIds);
}

function finalize(
  meals: PlannedMeal[],
  candidates: Recipe[],
  usedRecipeIds: Set<string>
): WeekPlanResult {
  const unusedRecipes = candidates.filter((c) => !usedRecipeIds.has(c.id));
  return { meals, unusedRecipes };
}

// =============================================================================
// Candidate recommendation (thin composition over existing primitives)
// =============================================================================
// recommendCandidates() wires the existing AvailabilityFilter + DietaryFilter
// + createHistoryAwareRankingStrategy together. It reuses recipeApi's
// getRecipeRecommendations under the hood (which builds completion maps,
// applies the filter, ranks, and returns {recipe, completionPercentage}[]).
// The result is then mapped into RankedCandidate for the planner + UI.
// =============================================================================

/** A candidate recipe plus its pantry completion percentage and rank score. */
export interface RankedCandidate {
  recipe: Recipe;
  completionPercentage: number;
}

export interface RecommendCandidatesOptions {
  /** Pre-fetched availability data (avoids re-querying inside the API call). */
  availability?: PlannerAvailability;
  /** Pre-fetched cooking-history data for history-aware ranking. */
  cookingHistory?: CookingHistoryData;
  /** Override the filter strategy (default: AvailabilityFilter + DietaryFilter). */
  filterStrategy?: RecipeFilterStrategy;
  /** Override the ranking strategy (default: createHistoryAwareRankingStrategy). */
  rankingStrategy?: RecipeRankingStrategy;
  /** Max candidates to return. */
  maxCandidates?: number;
  /** Minimum pantry completion % required to schedule a recipe (default 0). */
  minAvailability?: number;
}

/**
 * Build the default pantry+dietary filter composition used by the planner.
 * Exposed so tests can assert exactly which filters are composed.
 */
export function createPlannerFilter(minAvailability: number = 0): CompositeFilterStrategy {
  return new CompositeFilterStrategy()
    .addFilter(new AvailabilityFilter({ minAvailability }))
    .addFilter(new DietaryFilter());
}

/**
 * Rank candidate recipes for the planner using the existing recommendation
 * primitives. This is composition, not new logic: it builds the same
 * FilterContext / RankingContext that recipeApi.getRecipeRecommendations
 * builds internally and runs the same filter + rank pipeline.
 *
 * Returns candidates best-first, each tagged with its completion %.
 */
export function rankCandidates(
  allRecipes: Recipe[],
  options: RecommendCandidatesOptions = {}
): RankedCandidate[] {
  const {
    availability,
    cookingHistory,
    filterStrategy = createPlannerFilter(options.minAvailability ?? 0),
    rankingStrategy = createHistoryAwareRankingStrategy(),
    maxCandidates,
  } = options;

  // Build completion map exactly as recipeApi.getRecipeRecommendations does.
  const completionMap = new Map<string, number>();
  if (availability) {
    for (const recipe of availability.canMake) {
      completionMap.set(recipe.id, 100);
    }
    for (const item of availability.partiallyCanMake) {
      completionMap.set(item.recipe.id, item.completionPercentage);
    }
  }

  const filterCtx: FilterContext = { completionPercentages: completionMap };
  const rankingCtx: RankingContext = {
    completionPercentages: completionMap,
    cookingHistory,
  };

  // Filter (DietaryFilter reads diet/allergen prefs from storage itself).
  const filtered = allRecipes.filter((recipe) => filterStrategy.filter(recipe, filterCtx));

  // Rank.
  const scored = filtered
    .map((recipe) => ({
      recipe,
      completionPercentage: completionMap.get(recipe.id) ?? 0,
      score: rankingStrategy.score(recipe, rankingCtx),
    }))
    .sort((a, b) => b.score - a.score);

  const ranked: RankedCandidate[] = scored.map(({ recipe, completionPercentage }) => ({
    recipe,
    completionPercentage,
  }));

  return maxCandidates !== undefined ? ranked.slice(0, maxCandidates) : ranked;
}

// Re-export the slot type so callers can import the full constant if needed.
export type { MEAL_SLOTS };
