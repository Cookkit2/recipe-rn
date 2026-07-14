import { buildIngredientPreviewData } from "../ingredient-preview";
import type { RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";

describe("buildIngredientPreviewData", () => {
  const createRecipeIngredient = (name: string, quantity = 1, unit = "cup"): RecipeIngredient => ({
    name,
    relatedIngredientId: name.toLowerCase(),
    quantity,
    unit,
  });

  const createPantryItem = (name: string, imageUrl?: string): Partial<PantryItem> => ({
    name,
    image_url: imageUrl,
  });

  it("should return empty arrays when no ingredients are provided", () => {
    const result = buildIngredientPreviewData([], () => null);
    expect(result).toEqual({ matched: [], missing: [] });
  });

  it("should categorize fully matched ingredients with images to 'matched'", () => {
    const ingredients = [createRecipeIngredient("Tomato", 2, "whole")];
    const matchFn = jest
      .fn()
      .mockReturnValue(createPantryItem("Tomato", "http://example.com/tomato.jpg"));

    const result = buildIngredientPreviewData(ingredients, matchFn);

    expect(result.matched).toHaveLength(1);
    expect(result.missing).toHaveLength(0);
    expect(result.matched[0]).toEqual({
      name: "Tomato",
      imageUrl: "http://example.com/tomato.jpg",
      quantity: 2,
      unit: "whole",
    });
    expect(matchFn).toHaveBeenCalledWith(ingredients[0]);
  });

  it("should categorize ingredients as 'missing' if there is no match", () => {
    const ingredients = [createRecipeIngredient("Onion", 1, "whole")];
    const matchFn = jest.fn().mockReturnValue(null);

    const result = buildIngredientPreviewData(ingredients, matchFn);

    expect(result.matched).toHaveLength(0);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]).toEqual({
      name: "Onion",
      index: 0,
      quantity: 1,
      unit: "whole",
    });
  });

  it("should categorize ingredients as 'missing' if the match lacks an image", () => {
    const ingredients = [createRecipeIngredient("Garlic", 3, "cloves")];
    const matchFn = jest.fn().mockReturnValue(createPantryItem("Garlic", undefined));

    const result = buildIngredientPreviewData(ingredients, matchFn);

    expect(result.matched).toHaveLength(0);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]).toEqual({
      name: "Garlic",
      index: 0,
      quantity: 3,
      unit: "cloves",
    });
  });

  it("should correctly handle a mix of matched and missing ingredients", () => {
    const ingredients = [
      createRecipeIngredient("Tomato"),
      createRecipeIngredient("Onion"),
      createRecipeIngredient("Garlic"),
    ];

    const matchFn = (ingredient: RecipeIngredient) => {
      if (ingredient.name === "Tomato") {
        return createPantryItem("Tomato", "tomato.jpg") as PantryItem;
      }
      return null;
    };

    const result = buildIngredientPreviewData(ingredients, matchFn);

    expect(result.matched).toHaveLength(1);
    expect(result.missing).toHaveLength(2);
    expect(result.matched?.[0]?.name).toBe("Tomato");
    expect(result.missing?.[0]?.name).toBe("Onion");
    expect(result.missing?.[1]?.name).toBe("Garlic");
  });

  it("should honor the default limit of 6 for both arrays", () => {
    const ingredients = Array.from({ length: 10 }, (_, i) => createRecipeIngredient(`Item ${i}`));

    const matchFn = (ingredient: RecipeIngredient) => {
      const idx = parseInt(ingredient.name.split(" ")[1] ?? "0", 10);
      if (idx % 2 === 0) {
        return createPantryItem(ingredient.name, "image.jpg") as PantryItem;
      }
      return null;
    };

    const result = buildIngredientPreviewData(ingredients, matchFn);

    // 5 matches, 5 missing. Both under limit of 6.
    expect(result.matched).toHaveLength(5);
    expect(result.missing).toHaveLength(5);
  });

  it("should truncate arrays if they exceed the specified limit", () => {
    const ingredients = Array.from({ length: 10 }, (_, i) =>
      createRecipeIngredient(`Matched Item ${i}`)
    ).concat(Array.from({ length: 10 }, (_, i) => createRecipeIngredient(`Missing Item ${i}`)));

    const matchFn = (ingredient: RecipeIngredient) => {
      if (ingredient.name.startsWith("Matched")) {
        return createPantryItem(ingredient.name, "image.jpg") as PantryItem;
      }
      return null;
    };

    const limit = 3;
    const result = buildIngredientPreviewData(ingredients, matchFn, limit);

    expect(result.matched).toHaveLength(limit);
    expect(result.missing).toHaveLength(limit);
    expect(result.matched?.[result.matched.length - 1]?.name).toBe("Matched Item 2");
    expect(result.missing?.[result.missing.length - 1]?.name).toBe("Missing Item 2");
  });
});
