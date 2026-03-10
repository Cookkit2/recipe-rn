jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { isValidRecipe } from "../validation-utils";

describe("isValidRecipe", () => {
  it("returns false for undefined or missing title/ingredients/steps", () => {
    expect(isValidRecipe(undefined)).toBe(false);
    expect(isValidRecipe({})).toBe(false);
    expect(
      isValidRecipe({
        title: " ",
        ingredients: [],
        steps: [],
      } as any),
    ).toBe(false);
  });

  it("rejects recipes with only unknown ingredients", () => {
    const recipe = {
      title: "Test",
      ingredients: [
        { name: "" },
      ],
      steps: [{ description: "Step 1" }],
    };

    expect(isValidRecipe(recipe as any)).toBe(false);
  });

  it("accepts recipes with valid title, ingredients and steps", () => {
    const recipe = {
      title: "Pasta",
      ingredients: [{ name: "Spaghetti" }],
      steps: [{ description: "Boil water" }],
    };

    expect(isValidRecipe(recipe as any)).toBe(true);
  });

  it("rejects recipes with non-positive servings when provided", () => {
    const recipe = {
      title: "Soup",
      ingredients: [{ name: "Water" }],
      steps: [{ description: "Boil" }],
      servings: 0,
    };

    expect(isValidRecipe(recipe as any)).toBe(false);
  });
});

