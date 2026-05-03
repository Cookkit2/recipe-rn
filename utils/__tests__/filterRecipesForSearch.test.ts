import type { Recipe } from "~/types/Recipe";
import type { RecipeFilters } from "~/hooks/queries/useRecipeQueries";
import { filterRecipesForSearch } from "../filterRecipesForSearch";

const r = (overrides: Partial<Recipe> & Pick<Recipe, "id" | "title">): Recipe => ({
  id: overrides.id,
  title: overrides.title,
  description: overrides.description ?? "",
  imageUrl: overrides.imageUrl ?? "",
  prepMinutes: overrides.prepMinutes,
  cookMinutes: overrides.cookMinutes,
  difficultyStars: overrides.difficultyStars,
  servings: overrides.servings,
  ingredients: [],
  instructions: [],
  tags: overrides.tags,
});

describe("filterRecipesForSearch", () => {
  const recipes: Recipe[] = [
    r({
      id: "1",
      title: "Tomato Soup",
      description: "Comfort food",
      prepMinutes: 10,
      cookMinutes: 20,
      difficultyStars: 1,
      tags: ["Vegetarian"],
    }),
    r({
      id: "2",
      title: "Beef Steak",
      description: "Grilled",
      prepMinutes: 5,
      cookMinutes: 15,
      difficultyStars: 3,
      tags: [],
    }),
    r({
      id: "3",
      title: "Quick Salad",
      description: "Tomato and greens",
      prepMinutes: 2,
      cookMinutes: 0,
      difficultyStars: 1,
      tags: ["Vegan", "Gluten-Free"],
    }),
  ];

  it("returns all when no text and no filters", () => {
    expect(filterRecipesForSearch(recipes, "", undefined)).toHaveLength(3);
  });

  it("filters by title substring case-insensitive", () => {
    expect(filterRecipesForSearch(recipes, "tom", undefined).map((x) => x.id)).toEqual(["1", "3"]);
  });

  it("filters by description", () => {
    expect(filterRecipesForSearch(recipes, "grilled", undefined).map((x) => x.id)).toEqual(["2"]);
  });

  it("applies difficulty", () => {
    const f: RecipeFilters = { difficulty: 1 };
    expect(filterRecipesForSearch(recipes, "", f).map((x) => x.id)).toEqual(["1", "3"]);
  });

  it("applies tag OR semantics", () => {
    const f: RecipeFilters = { tags: ["Vegetarian", "Vegan"] };
    const ids = filterRecipesForSearch(recipes, "", f)
      .map((x) => x.id)
      .sort();
    expect(ids).toEqual(["1", "3"]);
  });

  it("applies maxTotalTime like repository (prep, cook, total caps)", () => {
    const f: RecipeFilters = { maxTotalTime: 25 };
    const ids = filterRecipesForSearch(recipes, "", f)
      .map((x) => x.id)
      .sort();
    expect(ids).toEqual(["2", "3"]);
  });

  it("applies minTotalTime", () => {
    const f: RecipeFilters = { minTotalTime: 30 };
    expect(filterRecipesForSearch(recipes, "", f).map((x) => x.id)).toEqual(["1"]);
  });

  it("combines text and filters", () => {
    const f: RecipeFilters = { difficulty: 1 };
    expect(filterRecipesForSearch(recipes, "salad", f).map((x) => x.id)).toEqual(["3"]);
  });
});
