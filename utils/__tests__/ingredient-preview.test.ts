import type { PantryItem } from "~/types/PantryItem";
import type { RecipeIngredient } from "~/types/Recipe";
import { buildIngredientPreviewData } from "../ingredient-preview";

const makeIngredient = (name: string): RecipeIngredient => ({
  name,
  relatedIngredientId: name,
  quantity: 1,
  unit: "piece",
});

describe("buildIngredientPreviewData", () => {
  it("builds placeholder preview items from recipe ingredients without requiring scaled ingredients", () => {
    const ingredients = [makeIngredient("chicken"), makeIngredient("salt")];

    const previewData = buildIngredientPreviewData(ingredients, () => null);

    expect(previewData).toEqual({
      matched: [],
      missing: [
        { name: "chicken", index: 0, quantity: 1, unit: "piece" },
        { name: "salt", index: 1, quantity: 1, unit: "piece" },
      ],
    });
  });

  it("puts matched pantry items with images in the matched preview group", () => {
    const ingredients = [makeIngredient("chicken")];
    const chicken = {
      id: "pantry-chicken",
      name: "chicken",
      quantity: 1,
      unit: "piece",
      category: "protein",
      type: "fridge",
      image_url: "https://example.com/chicken.png",
      background_color: undefined,
      created_at: new Date("2026-01-01"),
      updated_at: new Date("2026-01-01"),
      steps_to_store: [],
    } satisfies PantryItem;

    const previewData = buildIngredientPreviewData(ingredients, () => chicken);

    expect(previewData).toEqual({
      matched: [
        {
          name: "chicken",
          imageUrl: "https://example.com/chicken.png",
          quantity: 1,
          unit: "piece",
        },
      ],
      missing: [],
    });
  });
});
