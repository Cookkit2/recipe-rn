import type { Recipe } from "~/types/Recipe";
import {
  assignMealsToSlots,
  hasAnyTarget,
  projectPlannedMacros,
  scoreRecipeMacroFit,
  MacroFitStrategy,
} from "../generateWeekPlan";

// The planner imports ~/hooks/recommendation -> DietaryFilter -> ~/data, which
// pulls react-native-mmkv (ESM, untransformable in jest). Mock ~/data the same
// way the sibling generateWeekPlan.test.ts does so the pure helpers can be
// exercised without the native storage stack.
jest.mock("~/data", () => ({
  storage: {
    get: () => undefined,
    set: () => undefined,
  },
}));

// ---------------------------------------------------------------------------
// Seed recipes. Per-serving nutrition set directly on the Recipe fields
// (calories/protein/carbs/fat), mirroring how the UI Recipe carries nutrition.
// ---------------------------------------------------------------------------
function makeRecipe(
  id: string,
  nutrition: { calories?: number; protein?: number; carbs?: number; fat?: number },
  servings = 4
): Recipe {
  return {
    id,
    title: id,
    description: "",
    imageUrl: "",
    servings,
    ingredients: [{ name: "x", relatedIngredientId: "x", quantity: 1, unit: "cup" }],
    instructions: [],
    ...nutrition,
  } as Recipe;
}

const WEEK_START = new Date("2026-06-22T00:00:00");
const EMPTY_DAY = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

describe("hasAnyTarget", () => {
  it("returns false for an empty target", () => {
    expect(hasAnyTarget({})).toBe(false);
  });

  it("returns true when at least one positive field is set", () => {
    expect(hasAnyTarget({ calories: 2000 })).toBe(true);
    expect(hasAnyTarget({ proteinG: 150 })).toBe(true);
  });

  it("returns false for zero / negative / non-finite values", () => {
    expect(hasAnyTarget({ calories: 0 })).toBe(false);
    expect(hasAnyTarget({ proteinG: -5 })).toBe(false);
    expect(hasAnyTarget({ carbsG: Number.NaN })).toBe(false);
  });
});

describe("scoreRecipeMacroFit", () => {
  it("returns 0 when the target has no usable fields", () => {
    const recipe = makeRecipe("r", { calories: 500 });
    expect(scoreRecipeMacroFit(recipe, {}, EMPTY_DAY, 2)).toBe(0);
  });

  it("returns 0 when slotsPerDay <= 0", () => {
    const recipe = makeRecipe("r", { calories: 500 });
    expect(scoreRecipeMacroFit(recipe, { calories: 2000 }, EMPTY_DAY, 0)).toBe(0);
  });

  it("scores a recipe that hits the target higher than one far from it", () => {
    // Target: 1000 cal for the day, one slot (slotsPerDay = 1) so a 1000-cal
    // recipe is a perfect hit (score 100), while a 500-cal recipe is 50% off.
    const perfect = makeRecipe("perfect", { calories: 1000 });
    const half = makeRecipe("half", { calories: 500 });
    const target = { calories: 1000 };

    const scorePerfect = scoreRecipeMacroFit(perfect, target, EMPTY_DAY, 1);
    const scoreHalf = scoreRecipeMacroFit(half, target, EMPTY_DAY, 1);

    expect(scorePerfect).toBe(100); // 0% error -> 100
    expect(scoreHalf).toBe(50); // 50% error -> 50
    expect(scorePerfect).toBeGreaterThan(scoreHalf);
  });

  it("accounts for the day's running total (greedy steering)", () => {
    // Target 1000 cal, 1 slot left. Day already has 500 cal -> remaining
    // headroom 500, per-slot share 500. A recipe adding exactly 500 (closing)
    // matches its share (score 100); one adding 1000 (overshoot) is 100% over
    // its share (score 0). The closing recipe scores higher.
    const target = { calories: 1000 };
    const closing = makeRecipe("closing", { calories: 500 });
    const overshoot = makeRecipe("overshoot", { calories: 1000 });
    const daySoFar = { ...EMPTY_DAY, calories: 500 };

    const scoreClosing = scoreRecipeMacroFit(closing, target, daySoFar, 1);
    const scoreOvershoot = scoreRecipeMacroFit(overshoot, target, daySoFar, 1);

    expect(scoreClosing).toBe(100); // matches its 500-cal slot share
    expect(scoreOvershoot).toBe(0); // 100% over its 500-cal slot share
    expect(scoreClosing).toBeGreaterThan(scoreOvershoot);
  });

  it("averages error across multiple pinned macros", () => {
    // Target 1000 cal + 100g protein. Recipe hits calories exactly but is 50%
    // over protein -> MAPE = (0 + 50) / 2 = 25 -> score 75.
    const target = { calories: 1000, proteinG: 100 };
    const recipe = makeRecipe("r", { calories: 1000, protein: 150 });
    expect(scoreRecipeMacroFit(recipe, target, EMPTY_DAY, 1)).toBe(75);
  });

  it("does not penalize missing nutrition data (scores 0 neutrally)", () => {
    const target = { calories: 1000 };
    const noData = makeRecipe("noData", {});
    // projected 0 vs 1000 -> 100% error -> score max(0, 100-100) = 0
    expect(scoreRecipeMacroFit(noData, target, EMPTY_DAY, 1)).toBe(0);
  });
});

describe("MacroFitStrategy", () => {
  it("ranks a closer recipe above a farther one (composite-compatible)", () => {
    const target = { calories: 1000, proteinG: 100 };
    const strategy = new MacroFitStrategy(target, 1);
    const close = makeRecipe("close", { calories: 1000, protein: 100 });
    const far = makeRecipe("far", { calories: 2000, protein: 200 });

    expect(strategy.score(close)).toBeGreaterThan(strategy.score(far));
    expect(strategy.score(close)).toBe(100);
  });

  it("scores 0 against an empty target", () => {
    const strategy = new MacroFitStrategy({}, 2);
    const recipe = makeRecipe("r", { calories: 500 });
    expect(strategy.score(recipe)).toBe(0);
  });
});

describe("projectPlannedMacros", () => {
  it("sums per-serving macros scaled to slot servings across the plan", () => {
    // 2 meals, both recipe base servings = 4, slot servings = 4 (1x each).
    const a = makeRecipe("a", { calories: 400, protein: 20, carbs: 40, fat: 10 }, 4);
    const b = makeRecipe("b", { calories: 600, protein: 30, carbs: 60, fat: 20 }, 4);
    const result = assignMealsToSlots({
      candidates: [a, b],
      weekStart: WEEK_START,
      days: 1,
      mealSlots: ["lunch", "dinner"],
      targetServings: 4,
    });

    const macros = result.projectedMacros;
    // 400 + 600 = 1000 cal, protein 50, carbs 100, fat 30
    expect(macros.calories).toBeCloseTo(1000, 5);
    expect(macros.protein).toBeCloseTo(50, 5);
    expect(macros.carbs).toBeCloseTo(100, 5);
    expect(macros.fat).toBeCloseTo(30, 5);
  });

  it("scales correctly when slot servings differ from recipe base servings", () => {
    // Recipe base 4 servings @ 400 cal. Slot servings = 2 (0.5x) -> 200 cal.
    const a = makeRecipe("a", { calories: 400 }, 4);
    const result = assignMealsToSlots({
      candidates: [a],
      weekStart: WEEK_START,
      days: 1,
      mealSlots: ["dinner"],
      targetServings: 2,
    });
    expect(result.projectedMacros.calories).toBeCloseTo(200, 5);
  });

  it("returns zeros for an empty plan", () => {
    const macros = projectPlannedMacros([], []);
    expect(macros).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  });

  it("ignores meals whose recipe is absent from the candidate list", () => {
    const a = makeRecipe("a", { calories: 400 }, 4);
    const result = assignMealsToSlots({
      candidates: [a],
      weekStart: WEEK_START,
      days: 1,
      mealSlots: ["dinner"],
    });
    // Remove the recipe from the candidate list post-hoc to simulate an orphan.
    const macros = projectPlannedMacros(result.meals, []);
    expect(macros).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  });
});

describe("assignMealsToSlots with macro target", () => {
  it("still produces projectedMacros when no target is set (backward compatible)", () => {
    const a = makeRecipe("a", { calories: 400 }, 4);
    const result = assignMealsToSlots({
      candidates: [a],
      weekStart: WEEK_START,
      days: 1,
      mealSlots: ["dinner"],
    });
    expect(result.projectedMacros.calories).toBeCloseTo(400, 5);
    // No target -> no reordering: first candidate placed.
    expect(result.meals[0]!.recipeId).toBe("a");
  });

  it("biases per-day picks toward the target", () => {
    // 2 slots on one day. Target 1000 cal. Two "good" recipes at 500 cal each
    // (sum to the target), plus a "big" 1200-cal recipe that overshoots on its
    // own. Provide "big" FIRST in the list to prove the target reorders it away
    // from the default best-first walk.
    const big = makeRecipe("big", { calories: 1200 }, 4);
    const good1 = makeRecipe("good1", { calories: 500 }, 4);
    const good2 = makeRecipe("good2", { calories: 500 }, 4);

    const result = assignMealsToSlots({
      candidates: [big, good1, good2],
      weekStart: WEEK_START,
      days: 1,
      mealSlots: ["lunch", "dinner"],
      macroTarget: { calories: 1000 },
    });
    // Without the target, the first meal would be "big" (input order). With the
    // target, the planner prefers a 500-cal recipe first (lands the day closer
    // to 1000), so "big" must NOT be the first meal.
    expect(result.meals[0]!.recipeId).not.toBe("big");
    expect(result.meals[1]!.recipeId).not.toBe("big");
    // And the two placed meals should be the two good recipes.
    const placedIds = result.meals.map((m) => m.recipeId).sort();
    expect(placedIds).toEqual(["good1", "good2"]);
  });

  it("preserves the no-repeat-in-week constraint under a target", () => {
    const recipes = Array.from({ length: 5 }, (_, i) =>
      makeRecipe(`r${i}`, { calories: 500 + i * 50 }, 4)
    );
    const result = assignMealsToSlots({
      candidates: recipes,
      weekStart: WEEK_START,
      days: 2,
      mealSlots: ["lunch", "dinner"],
      macroTarget: { calories: 2000 },
    });
    const ids = result.meals.map((m) => m.recipeId);
    expect(new Set(ids).size).toBe(ids.length); // all distinct
  });
});
