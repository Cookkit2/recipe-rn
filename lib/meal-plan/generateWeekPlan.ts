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
import type { MacroTarget, NutritionSummary } from "~/types/Nutrition";
import type { MealSlot, MEAL_SLOTS } from "~/types/MealPlan";
import { calculateScalingFactor } from "~/utils/recipe-scaling";
import { aggregateNutrition } from "~/utils/nutritionAggregation";
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
  /**
   * Projected (summed) macros across the WHOLE plan, in NutritionSummary form.
   * Computed by reusing utils/nutritionAggregation.aggregateNutrition over the
   * placed meals (per-serving values scaled to the slot's servings). Present
   * whenever the plan is generated; the UI compares this against the per-day
   * MacroTarget * days to show projected-vs-target. (#746)
   */
  projectedMacros: NutritionSummary;
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
  /**
   * Daily macro/calorie target to optimize toward (#746). When provided, the
   * planner greedily picks recipes per day whose per-serving macros move the
   * day's running total toward the target (spike scope: greedy, not a full
   * optimization solver). Omitted fields are not scored.
   */
  macroTarget?: MacroTarget;
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
 * When a `macroTarget` is supplied (#746), the per-cell pick is biased toward
 * the candidate whose per-serving macros best move the CURRENT day's running
 * total toward the daily target fraction (1/days of the weekly target each day
 * is responsible for — but we score against the per-day target directly).
 * Ties (or absent target) fall back to the input candidate order so the
 * default MVP behavior is preserved exactly.
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
    macroTarget,
  } = options;

  const baseDay = startOfDay(weekStart);
  const usedRecipeIds = new Set<string>();
  const meals: PlannedMeal[] = [];
  // Running macro totals for the CURRENT day, used to greedily steer picks.
  const dayTotals: NutritionSummary = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    // Reset the day's running total at the start of each day so the greedy
    // score is always relative to that day's target.
    dayTotals.calories = 0;
    dayTotals.protein = 0;
    dayTotals.carbs = 0;
    dayTotals.fat = 0;
    dayTotals.fiber = 0;

    // remainingSlotsThisDay tracks how many slots still need filling on the
    // current day; the scorer divides the remaining headroom by this so each
    // slot is responsible for an equal share of what's left.
    let remainingSlotsThisDay = mealSlots.length;

    for (const mealSlot of mealSlots) {
      const pick = pickForSlot(
        candidates,
        usedRecipeIds,
        dayTotals,
        macroTarget,
        remainingSlotsThisDay
      );
      if (!pick) {
        // No-repeat pool exhausted — stop assigning.
        return finalize(meals, candidates, usedRecipeIds);
      }

      usedRecipeIds.add(pick.id);
      const date = new Date(baseDay);
      date.setDate(date.getDate() + dayOffset);

      const servings = computeSlotServings(pick, targetServings);
      meals.push({
        recipeId: pick.id,
        dayOffset,
        date,
        mealSlot,
        servings,
        recipeServings: pick.servings ?? 0,
        completionPercentage: 0,
      });

      // Roll this meal into the day's running total (per-serving scaled), then
      // one fewer slot remains to fill the day's headroom.
      addToDayTotal(dayTotals, pick, servings);
      remainingSlotsThisDay -= 1;
    }
  }

  return finalize(meals, candidates, usedRecipeIds);
}

/**
 * Choose the next recipe for a slot. When no macro target is set (or none of
 * its fields are present), this reduces to `candidates.find(unused)` — i.e.
 * the original best-first walk, preserving MVP behavior exactly. When a target
 * IS set, it picks the unused candidate with the highest macro-fit score
 * against the day's remaining headroom (see scoreRecipeMacroFit).
 *
 * `remainingSlotsThisDay` is how many slots (including this one) still need
 * filling on the current day; the scorer divides the day's remaining headroom
 * by it so each slot takes an equal share.
 */
function pickForSlot(
  candidates: Recipe[],
  usedRecipeIds: Set<string>,
  dayTotals: NutritionSummary,
  macroTarget: MacroTarget | undefined,
  remainingSlotsThisDay: number
): Recipe | undefined {
  if (!macroTarget || !hasAnyTarget(macroTarget)) {
    return candidates.find((c) => !usedRecipeIds.has(c.id));
  }

  let best: Recipe | undefined;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    if (usedRecipeIds.has(candidate.id)) continue;
    const score = scoreRecipeMacroFit(candidate, macroTarget, dayTotals, remainingSlotsThisDay);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function addToDayTotal(total: NutritionSummary, recipe: Recipe, servings: number): void {
  const perServing = servingsPerRecipe(recipe);
  const scale = perServing > 0 ? servings / perServing : 1;
  total.calories += (recipe.calories ?? 0) * scale;
  total.protein += (recipe.protein ?? 0) * scale;
  total.carbs += (recipe.carbs ?? 0) * scale;
  total.fat += (recipe.fat ?? 0) * scale;
  total.fiber += (recipe.fiber ?? 0) * scale;
}

function finalize(
  meals: PlannedMeal[],
  candidates: Recipe[],
  usedRecipeIds: Set<string>
): WeekPlanResult {
  const unusedRecipes = candidates.filter((c) => !usedRecipeIds.has(c.id));
  return { meals, unusedRecipes, projectedMacros: projectPlannedMacros(meals, candidates) };
}

// =============================================================================
// Macro-fit scoring + projected-macro aggregation (#746)
// =============================================================================
// These are pure helpers layered on the existing nutrition primitives. The
// scoring is a GREEDY heuristic, not a constrained optimization solver — per
// the issue's "tractable extension, NOT a full optimization solver" scope.
// =============================================================================

/** A recipe's servings, guarded against zero/invalid (avoids divide-by-zero). */
function servingsPerRecipe(recipe: Pick<Recipe, "servings">): number {
  const s = recipe.servings;
  return s && s > 0 ? s : 0;
}

/** True iff the target pins at least one macro/calorie field. */
export function hasAnyTarget(target: MacroTarget): boolean {
  return (
    isFinitePositive(target.calories) ||
    isFinitePositive(target.proteinG) ||
    isFinitePositive(target.carbsG) ||
    isFinitePositive(target.fatG)
  );
}

function isFinitePositive(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Score how well adding `recipe` (one serving's worth) moves the day toward the
 * daily `target`, given what's already planned for the day (`dayTotals`) and
 * how many slots remain to be filled (`slotsPerDay`).
 *
 * Approach (greedy "Eat This Much"-style): the day starts at `dayTotals` and
 * has `slotsPerDay` slots left to fill. Each remaining slot is conceptually
 * responsible for an EQUAL share of the remaining headroom
 * (`target - dayTotals`) / slotsPerDay. We score the recipe by the mean
 * absolute-percentage error between its per-serving macros and that per-slot
 * headroom share, across whichever fields the target pins. The score is
 * `100 - MAPE` (clamped to >= 0), so a recipe that lands one slot's share
 * scores higher. Recipes with no nutrition data contribute 0 error and score
 * neutrally (they neither help nor hurt).
 *
 * For the greedy planner walk, callers pass the REMAINING slots on the current
 * day (decremented per placed meal) so each slot takes an equal share of
 * what's left. For the context-free MacroFitStrategy composite, callers pass
 * the total slots per day.
 *
 * Higher = better. Pure & deterministic.
 */
export function scoreRecipeMacroFit(
  recipe: Recipe,
  target: MacroTarget,
  dayTotals: NutritionSummary,
  slotsPerDay: number
): number {
  if (!hasAnyTarget(target) || slotsPerDay <= 0) return 0;

  // Per-slot share of the remaining headroom for each pinned macro.
  const remainingCalories = isFinitePositive(target.calories)
    ? (target.calories as number) - dayTotals.calories
    : null;
  const remainingProtein = isFinitePositive(target.proteinG)
    ? (target.proteinG as number) - dayTotals.protein
    : null;
  const remainingCarbs = isFinitePositive(target.carbsG)
    ? (target.carbsG as number) - dayTotals.carbs
    : null;
  const remainingFat = isFinitePositive(target.fatG)
    ? (target.fatG as number) - dayTotals.fat
    : null;

  let errorSum = 0;
  let components = 0;

  if (remainingCalories !== null) {
    errorSum += absPctError(recipe.calories ?? 0, remainingCalories / slotsPerDay);
    components++;
  }
  if (remainingProtein !== null) {
    errorSum += absPctError(recipe.protein ?? 0, remainingProtein / slotsPerDay);
    components++;
  }
  if (remainingCarbs !== null) {
    errorSum += absPctError(recipe.carbs ?? 0, remainingCarbs / slotsPerDay);
    components++;
  }
  if (remainingFat !== null) {
    errorSum += absPctError(recipe.fat ?? 0, remainingFat / slotsPerDay);
    components++;
  }

  if (components === 0) return 0;
  const mape = errorSum / components;
  // Convert error to a score: 0% error -> 100, 100%+ error -> 0.
  return Math.max(0, 100 - mape);
}

/** Absolute percentage error of `actual` vs `goal` (0 if goal <= 0). */
function absPctError(actual: number, goal: number): number {
  if (goal <= 0) return 0;
  return (Math.abs(actual - goal) / goal) * 100;
}

/**
 * Sum the projected macros across an entire plan by reusing
 * utils/nutritionAggregation.aggregateNutrition. Each meal contributes its
 * per-serving nutrition scaled to its assigned servings (servings / recipe
 * servings multiplier). Recipes not present in `candidates` (e.g. orphaned
 * meal rows) contribute nothing — their nutrition is unknown.
 *
 * Pure: deterministic given meals + the candidate list.
 */
export function projectPlannedMacros(meals: PlannedMeal[], candidates: Recipe[]): NutritionSummary {
  if (meals.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }
  const byId = new Map<string, Recipe>();
  for (const c of candidates) byId.set(c.id, c);

  // Scale each meal's per-serving nutrition to its slot servings, then hand
  // the normalized values to the existing aggregator (single source of truth
  // for the sums) with multiplier 1 — the per-meal scaling is folded in here.
  // ⚡ Bolt Performance Optimization: Replace chaining .map().filter() with a single loop to avoid multiple array allocations
  const inputs: { calories: number; protein: number; carbs: number; fat: number; fiber: number }[] =
    [];
  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    if (meal) {
      const recipe = byId.get(meal.recipeId);
      if (recipe) {
        const base = servingsPerRecipe(recipe);
        const multiplier = base > 0 ? meal.servings / base : 1;
        inputs.push({
          calories: (recipe.calories ?? 0) * multiplier,
          protein: (recipe.protein ?? 0) * multiplier,
          carbs: (recipe.carbs ?? 0) * multiplier,
          fat: (recipe.fat ?? 0) * multiplier,
          fiber: (recipe.fiber ?? 0) * multiplier,
        });
      }
    }
  }

  if (inputs.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }
  return aggregateNutrition(inputs, 1);
}

/**
 * Ranking strategy that wraps scoreRecipeMacroFit so the macro target can be
 * composed into the existing CompositeRankingStrategy used by rankCandidates.
 * Uses only the recipe's per-serving macros vs an EQUAL-share slice of the
 * daily target (no running-day context — for the composite; the greedy slot
 * picker above is the context-aware path).
 */
export class MacroFitStrategy implements RecipeRankingStrategy {
  private readonly target: MacroTarget;
  private readonly slotsPerDay: number;

  constructor(target: MacroTarget, slotsPerDay = 2) {
    this.target = target;
    this.slotsPerDay = slotsPerDay;
  }

  score(recipe: Recipe): number {
    // No running day total available in the composite context; score against
    // an empty day so the strategy rewards recipes whose per-serving macros
    // are individually close to an equal share of the target.
    return scoreRecipeMacroFit(
      recipe,
      this.target,
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      this.slotsPerDay
    );
  }
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
