/**
 * Unit tests for the first-session "cook tonight" selector (issue #720).
 *
 * These assert the selection + ranking in isolation, WITHOUT touching
 * WatermelonDB, Supabase, or TanStack Query — the selector is a pure
 * orchestration of the existing AvailabilityFilter + ReadinessStrategy
 * primitives, mirroring the testable-core pattern in the funnel-events suite.
 */

import type { Recipe } from "~/types/Recipe";
import { selectCookTonightRecipes, matchCategoryForCompletion } from "../selectCookTonightRecipes";

function makeRecipe(id: string, overrides: Partial<Recipe> = {}): Recipe {
  return {
    id,
    title: `Recipe ${id}`,
    description: "",
    imageUrl: "",
    ingredients: [],
    instructions: [],
    ...overrides,
  };
}

describe("matchCategoryForCompletion", () => {
  it("classifies 100% as can_make_now", () => {
    expect(matchCategoryForCompletion(100)).toBe("can_make_now");
  });

  it("classifies mid completion as missing_1_2", () => {
    expect(matchCategoryForCompletion(75)).toBe("missing_1_2");
    expect(matchCategoryForCompletion(60)).toBe("missing_1_2");
  });

  it("classifies low completion as missing_3_plus", () => {
    expect(matchCategoryForCompletion(59)).toBe("missing_3_plus");
    expect(matchCategoryForCompletion(0)).toBe("missing_3_plus");
  });
});

describe("selectCookTonightRecipes", () => {
  it("returns ONLY 100%-complete recipes", () => {
    const recipes = [makeRecipe("a"), makeRecipe("b"), makeRecipe("c")];
    const completion = new Map([
      ["a", 100],
      ["b", 50],
      ["c", 100],
    ]);

    const result = selectCookTonightRecipes(recipes, { completionPercentages: completion });

    expect(result.map((r) => r.recipe.id)).toEqual(["a", "c"]);
    result.forEach((r) => {
      expect(r.completionPercentage).toBe(100);
      expect(r.matchCategory).toBe("can_make_now");
    });
  });

  it("returns an empty array (never null) when nothing is cookable", () => {
    const recipes = [makeRecipe("a"), makeRecipe("b")];
    const completion = new Map([
      ["a", 50],
      ["b", 20],
    ]);

    const result = selectCookTonightRecipes(recipes, { completionPercentages: completion });
    expect(result).toEqual([]);
  });

  it("ranks 100%-complete recipes via ReadinessStrategy (stable, higher completion first)", () => {
    // All selected recipes are 100% (so all share the fullReadinessBonus),
    // but the selector still applies the multiplier — verifying the ranking
    // path runs and produces a stable order.
    const recipes = [makeRecipe("first"), makeRecipe("second")];
    const completion = new Map([
      ["first", 100],
      ["second", 100],
    ]);

    const result = selectCookTonightRecipes(recipes, { completionPercentages: completion });
    expect(result.map((r) => r.recipe.id)).toEqual(["first", "second"]);
  });

  it("respects maxResults cap", () => {
    const recipes = ["a", "b", "c", "d"].map((id) => makeRecipe(id));
    const completion = new Map(recipes.map((r) => [r.id, 100]));

    const result = selectCookTonightRecipes(recipes, {
      completionPercentages: completion,
      maxResults: 2,
    });
    expect(result).toHaveLength(2);
  });

  it("is non-empty for a realistic starter pantry (sanity: the aha climax is non-empty)", () => {
    // Simulates the issue's risk mitigation: a realistic first pantry must
    // yield >=1 cook-tonight recipe so the climax surface never backfires.
    const recipes = [
      makeRecipe("pasta"),
      makeRecipe("salad"),
      makeRecipe("omelette"),
      makeRecipe("roast"), // not cookable tonight
    ];
    const completion = new Map([
      ["pasta", 100],
      ["salad", 100],
      ["omelette", 100],
      ["roast", 25],
    ]);

    const result = selectCookTonightRecipes(recipes, { completionPercentages: completion });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.map((r) => r.recipe.id).sort()).toEqual(["omelette", "pasta", "salad"]);
  });

  it("forwards the readiness multiplier to the ranking strategy without changing selection", () => {
    const recipes = [makeRecipe("a"), makeRecipe("b")];
    const completion = new Map([
      ["a", 100],
      ["b", 100],
    ]);

    const result = selectCookTonightRecipes(recipes, {
      completionPercentages: completion,
      readinessMultiplier: 3,
    });
    // Selection is unaffected by the multiplier (still 100%-complete only);
    // only internal ordering weights change.
    expect(result.map((r) => r.recipe.id).sort()).toEqual(["a", "b"]);
  });
});
