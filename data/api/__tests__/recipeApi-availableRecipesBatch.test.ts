jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { convertDbRecipesToUIRecipesBatch } from "../recipe-conversion";

function makeRecipeDetails(id: string) {
  const recipe = {
    id,
    title: `Recipe ${id}`,
    description: "",
    imageUrl: "",
    prepMinutes: 10,
    cookMinutes: 20,
    difficultyStars: 2,
    servings: 2,
    sourceUrl: "",
    calories: 100,
    tags: [],
  };

  const steps = [
    {
      id: `${id}_step1`,
      step: 1,
      title: "Step 1",
      description: "Do something",
    },
  ];

  const ingredients = [
    {
      id: `${id}_ing1`,
      name: "Ingredient",
      quantity: 1,
      unit: "unit",
      notes: "",
    },
  ];

  return { recipe, steps, ingredients };
}

describe("convertDbRecipesToUIRecipesBatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("converts multiple recipes when details exist in map", () => {
    const dbRecipes = [
      { id: "r1", title: "R1" },
      { id: "r2", title: "R2" },
    ];
    const detailsMap = new Map<string, ReturnType<typeof makeRecipeDetails>>([
      ["r1", makeRecipeDetails("r1")],
      ["r2", makeRecipeDetails("r2")],
      ["r3", makeRecipeDetails("r3")],
    ]);

    const uiRecipes = convertDbRecipesToUIRecipesBatch(dbRecipes as any, detailsMap);

    expect(uiRecipes.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(uiRecipes[0]?.ingredients).toHaveLength(1);
    expect(uiRecipes[0]?.instructions).toHaveLength(1);
  });

  it("skips recipes that are missing from recipeDetailsMap", () => {
    const dbRecipes = [
      { id: "r1", title: "R1" },
      { id: "r2", title: "R2" },
    ];

    // Only provide details for r1; r2 should be skipped
    const detailsMap = new Map<string, ReturnType<typeof makeRecipeDetails>>([
      ["r1", makeRecipeDetails("r1")],
    ]);

    const uiRecipes = convertDbRecipesToUIRecipesBatch(dbRecipes as any, detailsMap);

    expect(uiRecipes.map((r) => r.id)).toEqual(["r1"]);
  });
});
