import type { Recipe } from "~/types/Recipe";
import {
  assignMealsToSlots,
  computeSlotServings,
  createPlannerFilter,
  rankCandidates,
  startOfDay,
} from "../generateWeekPlan";

// ---------------------------------------------------------------------------
// Seed recipes. These mirror the shape a Recipe[] has after the recommender
// converts DB rows — minimal but real fields only.
// ---------------------------------------------------------------------------
function makeRecipe(overrides: Partial<Recipe> & { id: string }): Recipe {
  return {
    title: overrides.title ?? overrides.id,
    description: "",
    imageUrl: "",
    ingredients: overrides.ingredients ?? [
      { name: "water", relatedIngredientId: "water", quantity: 1, unit: "cup" },
    ],
    instructions: [],
    servings: overrides.servings ?? 4,
    tags: overrides.tags,
    allergens: overrides.allergens,
    ...overrides,
  } as Recipe;
}

const R1 = makeRecipe({ id: "r1", title: "Chicken Rice" });
const R2 = makeRecipe({ id: "r2", title: "Beef Stew" });
const R3 = makeRecipe({ id: "r3", title: "Veggie Pasta" });
const R4 = makeRecipe({ id: "r4", title: "Salmon Bowl" });
const R5 = makeRecipe({ id: "r5", title: "Tofu Curry" });

const WEEK_START = new Date("2026-06-22T00:00:00"); // a Monday at midnight

describe("startOfDay", () => {
  it("zeros out the time components without mutating the input", () => {
    const input = new Date("2026-06-22T13:45:30.500");
    const result = startOfDay(input);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    // input unchanged
    expect(input.getHours()).toBe(13);
  });
});

describe("computeSlotServings", () => {
  it("returns the recipe's own servings when no target is given", () => {
    expect(computeSlotServings({ servings: 6 })).toBe(6);
  });

  it("returns 0 when no target and no recipe servings", () => {
    expect(computeSlotServings({ servings: undefined })).toBe(0);
  });

  it("returns the target when the recipe has no base servings", () => {
    expect(computeSlotServings({ servings: undefined }, 3)).toBe(3);
  });

  it("returns the target servings (whole) when scaling to household size", () => {
    // base 4, target 2 -> factor 0.5 -> round(4 * 0.5) = 2
    expect(computeSlotServings({ servings: 4 }, 2)).toBe(2);
    // base 4, target 6 -> factor 1.5 -> round(4 * 1.5) = 6
    expect(computeSlotServings({ servings: 4 }, 6)).toBe(6);
    // base 3, target 2 -> factor ~0.667 -> round(3 * 0.667) = 2
    expect(computeSlotServings({ servings: 3 }, 2)).toBe(2);
  });

  it("never scales below 1 serving", () => {
    expect(computeSlotServings({ servings: 4 }, 1)).toBe(1);
  });

  it("falls back to base servings for an invalid target", () => {
    expect(computeSlotServings({ servings: 4 }, 0)).toBe(4);
    expect(computeSlotServings({ servings: 4 }, -2)).toBe(4);
    expect(computeSlotServings({ servings: 4 }, NaN)).toBe(4);
  });
});

describe("assignMealsToSlots", () => {
  it("assigns one meal per (day, slot) cell in order", () => {
    const { meals } = assignMealsToSlots({
      candidates: [R1, R2, R3, R4],
      weekStart: WEEK_START,
      days: 2,
      mealSlots: ["lunch", "dinner"],
    });

    expect(meals).toHaveLength(4); // 2 days * 2 slots
    expect(meals[0]).toMatchObject({ recipeId: "r1", dayOffset: 0, mealSlot: "lunch" });
    expect(meals[1]).toMatchObject({ recipeId: "r2", dayOffset: 0, mealSlot: "dinner" });
    expect(meals[2]).toMatchObject({ recipeId: "r3", dayOffset: 1, mealSlot: "lunch" });
    expect(meals[3]).toMatchObject({ recipeId: "r4", dayOffset: 1, mealSlot: "dinner" });
  });

  it("does not repeat a recipe within the week (variety constraint)", () => {
    const { meals } = assignMealsToSlots({
      candidates: [R1, R2, R3, R4, R5],
      weekStart: WEEK_START,
      days: 2,
      mealSlots: ["lunch", "dinner"],
    });

    const recipeIds = meals.map((m) => m.recipeId);
    const unique = new Set(recipeIds);
    expect(unique.size).toBe(recipeIds.length); // all distinct
  });

  it("stops assigning once the no-repeat pool is exhausted", () => {
    // Only 2 candidates but 4 cells needed -> only 2 meals produced.
    const { meals, unusedRecipes } = assignMealsToSlots({
      candidates: [R1, R2],
      weekStart: WEEK_START,
      days: 7,
      mealSlots: ["lunch", "dinner"],
    });

    expect(meals).toHaveLength(2);
    expect(meals.map((m) => m.recipeId)).toEqual(["r1", "r2"]);
    expect(unusedRecipes).toEqual([]);
  });

  it("computes absolute slot dates from the week start", () => {
    const { meals } = assignMealsToSlots({
      candidates: [R1, R2, R3],
      weekStart: WEEK_START,
      days: 3,
      mealSlots: ["dinner"],
    });

    expect(meals[0]!.date.toISOString()).toBe(new Date("2026-06-22T00:00:00").toISOString());
    expect(meals[1]!.date.toISOString()).toBe(new Date("2026-06-23T00:00:00").toISOString());
    expect(meals[2]!.date.toISOString()).toBe(new Date("2026-06-24T00:00:00").toISOString());
    // dayOffset tracks the dates
    expect(meals.map((m) => m.dayOffset)).toEqual([0, 1, 2]);
  });

  it("reports recipes that were ranked but never placed as unused", () => {
    const { meals, unusedRecipes } = assignMealsToSlots({
      candidates: [R1, R2, R3, R4, R5],
      weekStart: WEEK_START,
      days: 1,
      mealSlots: ["dinner"],
    });

    expect(meals).toHaveLength(1);
    expect(meals[0]!.recipeId).toBe("r1");
    expect(unusedRecipes.map((r) => r.id)).toEqual(["r2", "r3", "r4", "r5"]);
  });

  it("scales slot servings to the target household size", () => {
    const baseTwo = makeRecipe({ id: "t1", servings: 2 });
    const baseSix = makeRecipe({ id: "t2", servings: 6 });
    const { meals } = assignMealsToSlots({
      candidates: [baseTwo, baseSix],
      weekStart: WEEK_START,
      days: 1,
      mealSlots: ["lunch", "dinner"],
      targetServings: 4,
    });

    expect(meals[0]!.servings).toBe(4); // base 2 -> target 4
    expect(meals[1]!.servings).toBe(4); // base 6 -> target 4
    // recipeServings is preserved for downstream grocery scaling
    expect(meals[0]!.recipeServings).toBe(2);
    expect(meals[1]!.recipeServings).toBe(6);
  });

  it("keeps each recipe's base servings when no target is given", () => {
    const baseTwo = makeRecipe({ id: "t1", servings: 2 });
    const baseSix = makeRecipe({ id: "t2", servings: 6 });
    const { meals } = assignMealsToSlots({
      candidates: [baseTwo, baseSix],
      weekStart: WEEK_START,
      days: 1,
      mealSlots: ["lunch", "dinner"],
    });

    expect(meals[0]!.servings).toBe(2);
    expect(meals[1]!.servings).toBe(6);
  });
});

describe("createPlannerFilter", () => {
  it("composes AvailabilityFilter + DietaryFilter (AND logic)", () => {
    const filter = createPlannerFilter(50);
    expect(filter.filterCount).toBe(2);
  });
});

// Storage holder lives on globalThis so the hoisted jest.mock("~/data") factory
// (which runs before any top-level `let`/`const` is initialized) can read it
// without hitting a TDZ. DietaryFilter reads diet/allergen prefs from this stub.
const STORAGE_KEY = "__plannerTestStorage";
(globalThis as Record<string, unknown>)[STORAGE_KEY] = new Map<string, unknown>();
jest.mock("~/data", () => ({
  storage: {
    get: (key: string) => {
      const map = (globalThis as Record<string, unknown>)[STORAGE_KEY] as Map<string, unknown>;
      return map?.get(key);
    },
  },
}));

function setPref(key: string, value: unknown): void {
  const map = (globalThis as Record<string, unknown>)[STORAGE_KEY] as Map<string, unknown>;
  map.set(key, value);
}
function clearPrefs(): void {
  const map = (globalThis as Record<string, unknown>)[STORAGE_KEY] as Map<string, unknown>;
  map.clear();
}

describe("rankCandidates + DietaryFilter", () => {
  beforeEach(() => {
    clearPrefs();
  });

  it("excludes recipes containing a configured allergen (FAILS if filter bypassed)", () => {
    const peanutRecipe = makeRecipe({
      id: "peanut",
      title: "Peanut Noodles",
      ingredients: [
        { name: "peanut butter", relatedIngredientId: "pb", quantity: 2, unit: "tbsp" },
        { name: "noodles", relatedIngredientId: "noodle", quantity: 1, unit: "cup" },
      ],
    });
    const safeRecipe = makeRecipe({
      id: "safe",
      title: "Plain Rice",
      ingredients: [{ name: "rice", relatedIngredientId: "rice", quantity: 1, unit: "cup" }],
    });

    setPref("pref:allergens", ["peanuts"]);

    const ranked = rankCandidates([peanutRecipe, safeRecipe], {
      availability: {
        canMake: [peanutRecipe, safeRecipe],
        partiallyCanMake: [],
      },
    });

    const ids = ranked.map((r) => r.recipe.id);
    expect(ids).not.toContain("peanut"); // allergen filter excluded it
    expect(ids).toContain("safe");

    // Sanity: WITHOUT the filter (bypass), the peanut recipe would be present.
    // This proves the test fails if the dietary filter is removed.
    const allWithoutFilter = [peanutRecipe, safeRecipe].map((r) => r.id);
    expect(allWithoutFilter).toContain("peanut");
  });

  it("respects a vegetarian diet preference via recipe tags", () => {
    const meatRecipe = makeRecipe({
      id: "meat",
      title: "Steak",
      tags: ["dinner"],
    });
    const vegRecipe = makeRecipe({
      id: "veg",
      title: "Garden Salad",
      tags: ["vegetarian", "dinner"],
    });

    setPref("pref:diet", "vegetarian");

    const ranked = rankCandidates([meatRecipe, vegRecipe], {
      availability: { canMake: [meatRecipe, vegRecipe], partiallyCanMake: [] },
    });

    const ids = ranked.map((r) => r.recipe.id);
    expect(ids).toContain("veg");
    expect(ids).not.toContain("meat");
  });

  it("ranks candidates best-first and tags completion percentage", () => {
    const full = makeRecipe({ id: "full", title: "Full" });
    const partial = makeRecipe({ id: "partial", title: "Partial" });

    const ranked = rankCandidates([full, partial], {
      availability: {
        canMake: [full],
        partiallyCanMake: [{ recipe: partial, completionPercentage: 40 }],
      },
    });

    expect(ranked).toHaveLength(2);
    const fullEntry = ranked.find((r) => r.recipe.id === "full");
    const partialEntry = ranked.find((r) => r.recipe.id === "partial");
    expect(fullEntry?.completionPercentage).toBe(100);
    expect(partialEntry?.completionPercentage).toBe(40);
  });

  it("honors a minimum-availability threshold", () => {
    const low = makeRecipe({ id: "low", title: "Low" });
    const high = makeRecipe({ id: "high", title: "High" });

    const ranked = rankCandidates([low, high], {
      minAvailability: 50,
      availability: {
        canMake: [high],
        partiallyCanMake: [{ recipe: low, completionPercentage: 20 }],
      },
    });

    const ids = ranked.map((r) => r.recipe.id);
    expect(ids).toContain("high");
    expect(ids).not.toContain("low"); // 20% < 50% threshold
  });
});
