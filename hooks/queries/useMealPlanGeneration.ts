// =============================================================================
// useMealPlanGeneration — orchestration hook for the "Plan my week" flow (#727)
// =============================================================================
// This hook wires the pure planner (lib/meal-plan/generateWeekPlan) to the live
// data layer: it fetches ranked candidate recipes via the EXISTING
// recipeApi.getRecipeRecommendations (which composes AvailabilityFilter +
// DietaryFilter + createHistoryAwareRankingStrategy under the hood), runs the
// pure planner to assign them to a week's slots with a no-repeat constraint,
// and writes the resulting rows via MealPlanRepository.batchUpsert.
//
// MVP boundary (spike #739 v1a): base recipes ONLY. The tailored-recipe Gemini
// layer is intentionally NOT invoked per slot — see PR deferredFollowups.
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeApi } from "~/data/api/recipeApi";
import { MealPlanRepository } from "~/data/db/repositories/MealPlanRepository";
import { mealPlanQueryKeys } from "./mealPlanQueryKeys";
import { log } from "~/utils/logger";
import {
  assignMealsToSlots,
  createPlannerFilter,
  type PlannedMeal,
  type GenerateWeekPlanOptions,
} from "~/lib/meal-plan/generateWeekPlan";
import type { MealSlot } from "~/types/MealPlan";
import type { MacroTarget, NutritionSummary } from "~/types/Nutrition";

/** Inputs the UI passes to generate a week plan. */
export interface GenerateWeekPlanInput {
  /** Start of the week to plan (day-0). Defaults to the start of today. */
  weekStart?: Date;
  /** Days to plan (default 7). */
  days?: number;
  /** Slots to fill per day (default lunch + dinner). */
  mealSlots?: MealSlot[];
  /** Target servings per slot. Defaults to household size (members + 1). */
  targetServings?: number;
  /** Minimum pantry completion % to schedule a recipe (default 0). */
  minAvailability?: number;
  /**
   * Daily macro/calorie target to optimize toward (#746). When set, the planner
   * greedily biases picks per day toward the target. Optional — omitted fields
   * are not scored.
   */
  macroTarget?: MacroTarget;
}

/** Output of a successful generation. */
export interface GenerateWeekPlanResult {
  meals: PlannedMeal[];
  /**
   * Projected macros summed across the whole plan (#746). The UI compares this
   * against `macroTarget * days` to show projected-vs-target.
   */
  projectedMacros: NutritionSummary;
}

/**
 * Default slot layout for the MVP: lunch + dinner, 7 days = 14 slots.
 * Kept conservative (no breakfast/snack) so a modest recipe pool can fill the
 * week under the no-repeat constraint.
 */
export const DEFAULT_PLAN_SLOTS: MealSlot[] = ["lunch", "dinner"];

function mealPlanRepository(): MealPlanRepository {
  return new MealPlanRepository();
}

/**
 * Persist a generated week as MealPlan rows. Uses the repository's batchUpsert
 * (WatermelonDB batch — operation arrays passed directly, per CLAUDE.md gotcha)
 * so all 14 rows commit atomically.
 */
async function persistPlan(meals: PlannedMeal[]): Promise<void> {
  if (meals.length === 0) return;

  const creates = meals.map((meal) => ({
    recipeId: meal.recipeId,
    servings: meal.servings,
    date: meal.date,
    mealSlot: meal.mealSlot,
  }));

  await mealPlanRepository().batchUpsert(creates, []);
}

/**
 * useMutation that generates a pantry-aware, dietary-respecting week plan and
 * writes it to the meal plan.
 *
 * On success it invalidates the meal-plan query keys (items, count, all
 * dateRange queries, and grocery attributes) so the calendar, the grocery list
 * (which derives from the plan and auto-dedups against pantry — reused, not
 * rebuilt), and the recipe `isInPlan` badges all refresh.
 */
export function useMealPlanGeneration() {
  const queryClient = useQueryClient();

  return useMutation<GenerateWeekPlanResult, Error, GenerateWeekPlanInput>({
    mutationFn: async (input) => {
      const {
        weekStart = new Date(),
        days = 7,
        mealSlots = DEFAULT_PLAN_SLOTS,
        targetServings,
        minAvailability = 0,
        macroTarget,
      } = input;

      // 1) Fetch ranked candidates via the EXISTING recommendation pipeline.
      // getRecipeRecommendations composes DietaryFilter + the supplied filter,
      // ranks with createHistoryAwareRankingStrategy, and returns
      // { recipe, completionPercentage }[] best-first. We supply a pantry-aware
      // filter (AvailabilityFilter + DietaryFilter) so only satisfiable recipes
      // reach the planner.
      const filterStrategy = createPlannerFilter(minAvailability);

      const recommendation = await recipeApi.getRecipeRecommendations({
        filterStrategy,
      });

      const candidates = recommendation.recipes.map((r) => r.recipe);

      if (candidates.length === 0) {
        throw new Error(
          "No recipes match your pantry and dietary preferences. Try relaxing your filters or adding pantry items."
        );
      }

      // 2) Run the pure planner: assign best-first with no-repeat-in-week,
      // scaling servings to the household target. When a macro target is
      // supplied (#746), the planner greedily biases per-day picks toward it.
      const plannerOptions: GenerateWeekPlanOptions = {
        candidates,
        weekStart,
        days,
        mealSlots,
      };
      if (targetServings !== undefined) {
        plannerOptions.targetServings = targetServings;
      }
      if (macroTarget) {
        plannerOptions.macroTarget = macroTarget;
      }

      const { meals, projectedMacros } = assignMealsToSlots(plannerOptions);

      if (meals.length === 0) {
        throw new Error("Could not build a plan from the available recipes.");
      }

      // 3) Persist atomically.
      await persistPlan(meals);

      log.info(`Generated ${meals.length}-meal week plan`);

      return { meals, projectedMacros };
    },
    onSuccess: (data) => {
      // Invalidate everything the calendar + grocery list + badges read from.
      // The grocery list (useGroceryList) derives from the meal-plan query and
      // auto-dedups against pantry — no separate grocery logic here.
      queryClient.invalidateQueries({ queryKey: mealPlanQueryKeys.items() });
      queryClient.invalidateQueries({ queryKey: mealPlanQueryKeys.count() });
      queryClient.invalidateQueries({ queryKey: [...mealPlanQueryKeys.all, "dateRange"] });
      queryClient.invalidateQueries({ queryKey: ["grocery_attributes"] });
      // isNewPlan lookups per placed recipe (so recipe cards re-render as "in plan").
      for (const meal of data.meals) {
        queryClient.invalidateQueries({
          queryKey: mealPlanQueryKeys.isInPlan(meal.recipeId),
          exact: true,
        });
      }
    },
  });
}

// Re-export the pure planner's start-of-day helper for callers that need to
// normalize a week-start date before invoking the mutation.
export { startOfDay as planWeekStartOfDay } from "~/lib/meal-plan/generateWeekPlan";
