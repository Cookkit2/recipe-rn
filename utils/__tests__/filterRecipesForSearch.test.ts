import { filterRecipesForSearch } from "../filterRecipesForSearch";
import type { Recipe } from "~/types/Recipe";

describe("filterRecipesForSearch", () => {
  const MOCK_RECIPES: Recipe[] = [
    {
      id: "1",
      title: "Spaghetti Bolognese",
      description: "Classic Italian pasta dish with rich meat sauce.",
      imageUrl: "url1",
      ingredients: [],
      instructions: [],
      tags: ["italian", "pasta", "dinner"],
      difficultyStars: 3,
      prepMinutes: 15,
      cookMinutes: 45,
      avgRating: 4.5,
    },
    {
      id: "2",
      title: "Quick Pancakes",
      description: "Fluffy and quick breakfast pancakes.",
      imageUrl: "url2",
      ingredients: [],
      instructions: [],
      tags: ["breakfast", "sweet", "quick"],
      difficultyStars: 1,
      prepMinutes: 5,
      cookMinutes: 10,
      avgRating: 4.0,
    },
    {
      id: "3",
      title: "Beef Stew",
      description: "Hearty and slow-cooked winter warmer.",
      imageUrl: "url3",
      ingredients: [],
      instructions: [],
      tags: ["dinner", "meat", "slow-cooker"],
      difficultyStars: 2,
      prepMinutes: 20,
      cookMinutes: 120, // 2 hours
      avgRating: 4.8,
    },
    {
      id: "4",
      title: "Fruit Salad",
      description: "",
      imageUrl: "url4",
      ingredients: [],
      instructions: [],
      // Missing some optional properties to test edge cases
    },
  ];

  it("should match text query in title", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "spaghetti");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("1");
  });

  it("should match text query in description", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "fluffy");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("2");
  });

  it("should be case-insensitive for text query", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "BEEF STEW");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("3");
  });

  it("should return all recipes if text query is empty", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "   ");
    expect(result).toHaveLength(4);
  });

  it("should filter by tags (match if any tag matches)", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "", { tags: ["dinner", "sweet"] });
    expect(result).toHaveLength(3);
    const ids = result.map((r) => r.id).sort();
    expect(ids).toEqual(["1", "2", "3"]);
  });

  it("should return all recipes if tags array is empty", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "", { tags: [] });
    expect(result).toHaveLength(4);
  });

  it("should filter by difficulty", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "", { difficulty: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("2");
  });

  it("should handle recipes with no difficulty when filtering by difficulty", () => {
    // Fruit salad has no difficulty set, so it shouldn't match difficulty 1
    const result = filterRecipesForSearch([MOCK_RECIPES[3]!], "", { difficulty: 1 });
    expect(result).toHaveLength(0);
  });

  it("should filter by maxPrepTime", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "", { maxPrepTime: 10 });
    expect(result).toHaveLength(2); // Pancakes (5) and Fruit Salad (0)
    const ids = result.map((r) => r.id).sort();
    expect(ids).toEqual(["2", "4"]);
  });

  it("should filter by maxCookTime", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "", { maxCookTime: 15 });
    expect(result).toHaveLength(2); // Pancakes (10) and Fruit Salad (0)
    const ids = result.map((r) => r.id).sort();
    expect(ids).toEqual(["2", "4"]);
  });

  it("should filter by maxTotalTime", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "", { maxTotalTime: 20 });
    expect(result).toHaveLength(2); // Pancakes (15 total) and Fruit Salad (0 total)
    const ids = result.map((r) => r.id).sort();
    expect(ids).toEqual(["2", "4"]);
  });

  it("should filter by minTotalTime", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "", { minTotalTime: 100 });
    expect(result).toHaveLength(1); // Beef Stew (140 total)
    expect(result[0]?.id).toBe("3");
  });

  it("should filter by minRating", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "", { minRating: 4.5 });
    expect(result).toHaveLength(2); // Spaghetti (4.5) and Beef Stew (4.8)
    const ids = result.map((r) => r.id).sort();
    expect(ids).toEqual(["1", "3"]);
  });

  it("should handle recipes with no rating when filtering by minRating", () => {
    // Fruit salad has no rating, so its avgRating defaults to 0 and should fail minRating 4.0
    const result = filterRecipesForSearch([MOCK_RECIPES[3]!], "", { minRating: 4.0 });
    expect(result).toHaveLength(0);
  });

  it("should apply multiple filters concurrently (AND logic)", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "pancakes", {
      difficulty: 1,
      maxPrepTime: 10,
      tags: ["breakfast"],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("2");
  });

  it("should return empty if one filter condition fails", () => {
    const result = filterRecipesForSearch(MOCK_RECIPES, "pancakes", {
      difficulty: 3, // Fails here
      maxPrepTime: 10,
    });
    expect(result).toHaveLength(0);
  });
});
