import { buildIngredientPreviewData } from "../../utils/ingredient-preview";
import type { RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";

describe("buildIngredientPreviewData", () => {
  const mockIngredients: RecipeIngredient[] = [
    { name: "Flour", quantity: 2, unit: "cups", relatedIngredientId: "1" },
    { name: "Sugar", quantity: 1, unit: "cup", relatedIngredientId: "2" },
    { name: "Salt", quantity: 1, unit: "tsp", relatedIngredientId: "3" },
    { name: "Eggs", quantity: 2, unit: "large", relatedIngredientId: "4" },
  ];

  it("should categorize matching ingredients with image_url as matched", () => {
    const mockFindMatch = (ingredient: RecipeIngredient): PantryItem | null => {
      if (ingredient.name === "Flour") {
        return { name: "Flour", image_url: "flour.jpg" } as unknown as PantryItem;
      }
      return null;
    };

    const result = buildIngredientPreviewData(mockIngredients, mockFindMatch);

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]?.name).toBe("Flour");
    expect(result.matched[0]?.imageUrl).toBe("flour.jpg");
    expect(result.missing).toHaveLength(3);
    expect(result.missing[0]?.name).toBe("Sugar");
  });

  it("should categorize matching ingredients without image_url as missing", () => {
    const mockFindMatch = (ingredient: RecipeIngredient): PantryItem | null => {
      if (ingredient.name === "Flour") {
        return { name: "Flour", image_url: null } as unknown as PantryItem;
      }
      return null;
    };

    const result = buildIngredientPreviewData(mockIngredients, mockFindMatch);

    expect(result.matched).toHaveLength(0);
    expect(result.missing).toHaveLength(4);
    expect(result.missing[0]?.name).toBe("Flour");
  });

  it("should respect the limit parameter", () => {
    const mockFindMatch = (ingredient: RecipeIngredient): PantryItem | null => {
      return { name: ingredient.name, image_url: `${ingredient.name}.jpg` } as unknown as PantryItem;
    };

    const result = buildIngredientPreviewData(mockIngredients, mockFindMatch, 2);

    expect(result.matched).toHaveLength(2);
    expect(result.missing).toHaveLength(0);
    expect(result.matched[0]?.name).toBe("Flour");
    expect(result.matched[1]?.name).toBe("Sugar");
  });

  it("should handle empty ingredients array", () => {
    const mockFindMatch = jest.fn();

    const result = buildIngredientPreviewData([], mockFindMatch);

    expect(result.matched).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
    expect(mockFindMatch).not.toHaveBeenCalled();
  });
});
