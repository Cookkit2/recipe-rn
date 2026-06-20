import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock the data layer the orchestration hook depends on. recipeApi and the
// MealPlanRepository are the only side-effecting seams; everything else is
// the pure planner (covered in generateWeekPlan.test.ts).
const getRecipeRecommendations = jest.fn();
jest.mock("~/data/api/recipeApi", () => ({
  recipeApi: {
    getRecipeRecommendations,
  },
}));

const batchUpsert = jest.fn().mockResolvedValue([]);
jest.mock("~/data/db/repositories/MealPlanRepository", () => ({
  MealPlanRepository: jest.fn().mockImplementation(() => ({ batchUpsert })),
}));

// DietaryFilter (composed via createPlannerFilter) reads diet/allergen prefs
// from ~/data storage; stub it so the test never touches the ESM-only
// react-native-mmkv backing the real storage facade. No prefs are set, so the
// filter passes everything through (candidates come from the mocked recipeApi).
jest.mock("~/data", () => ({
  storage: { get: () => undefined },
}));

import { useMealPlanGeneration } from "../useMealPlanGeneration";
import type { Recipe } from "~/types/Recipe";

function makeRecipe(id: string, servings = 4): Recipe {
  return {
    id,
    title: id,
    description: "",
    imageUrl: "",
    servings,
    ingredients: [{ name: "x", relatedIngredientId: "x", quantity: 1, unit: "cup" }],
    instructions: [],
  } as Recipe;
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useMealPlanGeneration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes one MealPlan row per assigned slot with correct date/slot mapping", async () => {
    // 3 candidates, 2 days x 2 slots (lunch/dinner) -> 3 meals (pool exhausts).
    const recipes = [makeRecipe("a"), makeRecipe("b"), makeRecipe("c")];
    getRecipeRecommendations.mockResolvedValue({
      recipes: recipes.map((r) => ({ recipe: r, completionPercentage: 100 })),
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useMealPlanGeneration(), {
      wrapper: wrapper(client),
    });

    const weekStart = new Date("2026-06-22T00:00:00");
    await result.current.mutateAsync({
      weekStart,
      days: 2,
      mealSlots: ["lunch", "dinner"],
    });

    // batchUpsert called once with the planned creates.
    expect(batchUpsert).toHaveBeenCalledTimes(1);
    const [creates, updates] = batchUpsert.mock.calls[0]!;
    expect(updates).toEqual([]);
    expect(creates).toHaveLength(3);

    // Date/slot mapping: day0-lunch=a, day0-dinner=b, day1-lunch=c.
    expect(creates[0]).toMatchObject({ recipeId: "a", mealSlot: "lunch" });
    expect(creates[1]).toMatchObject({ recipeId: "b", mealSlot: "dinner" });
    expect(creates[2]).toMatchObject({ recipeId: "c", mealSlot: "lunch" });

    // Absolute dates derived from weekStart.
    expect(creates[0]!.date.toISOString()).toBe(new Date("2026-06-22T00:00:00").toISOString());
    expect(creates[2]!.date.toISOString()).toBe(new Date("2026-06-23T00:00:00").toISOString());
  });

  it("scales servings to the target household size", async () => {
    const recipes = [makeRecipe("a", 2), makeRecipe("b", 6)];
    getRecipeRecommendations.mockResolvedValue({
      recipes: recipes.map((r) => ({ recipe: r, completionPercentage: 100 })),
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useMealPlanGeneration(), {
      wrapper: wrapper(client),
    });

    await result.current.mutateAsync({
      weekStart: new Date("2026-06-22T00:00:00"),
      days: 1,
      mealSlots: ["lunch", "dinner"],
      targetServings: 4,
    });

    const [creates] = batchUpsert.mock.calls[0]!;
    expect(creates[0]!.servings).toBe(4); // base 2 -> 4
    expect(creates[1]!.servings).toBe(4); // base 6 -> 4
  });

  it("throws a clear error when no recipes match the pantry/diet filter", async () => {
    getRecipeRecommendations.mockResolvedValue({ recipes: [] });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useMealPlanGeneration(), {
      wrapper: wrapper(client),
    });

    await expect(
      result.current.mutateAsync({
        weekStart: new Date("2026-06-22T00:00:00"),
        days: 7,
      })
    ).rejects.toThrow(/No recipes match your pantry/);

    // Nothing written on empty candidates.
    expect(batchUpsert).not.toHaveBeenCalled();
  });

  it("invalidates meal-plan + grocery query keys on success", async () => {
    const recipes = [makeRecipe("a")];
    getRecipeRecommendations.mockResolvedValue({
      recipes: recipes.map((r) => ({ recipe: r, completionPercentage: 100 })),
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useMealPlanGeneration(), {
      wrapper: wrapper(client),
    });

    await result.current.mutateAsync({
      weekStart: new Date("2026-06-22T00:00:00"),
      days: 1,
      mealSlots: ["dinner"],
    });

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());

    // Collect the query keys that were invalidated (flatten the call args).
    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    const joined = invalidatedKeys.join("\n");
    expect(joined).toContain("mealPlan"); // items / count / dateRange
    expect(joined).toContain("grocery_attributes");
  });
});
