import { parseTailoredRecipeResponse } from "../helpers";
import type { Recipe } from "~/types/Recipe";

describe("parseTailoredRecipeResponse", () => {
  const mockBaseRecipe = {
    id: "base-recipe-1",
    title: "Base Recipe",
    description: "A description",
    imageUrl: "https://example.com/image.jpg",
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 2,
    difficultyStars: 3,
    calories: 500,
    tags: ["dinner"],
    ingredients: [],
    instructions: [],
    sourceUrl: "https://example.com/recipe",
  } as unknown as Recipe;

  it("should successfully parse a valid tailored recipe response", () => {
    const responseText = `{
      "title": "Tailored Recipe",
      "ingredients": [{ "name": "Tomato", "quantity": 2, "unit": "unit" }],
      "instructions": [{ "step": 1, "title": "Chop", "description": "Chop tomatoes" }]
    }`;

    const result = parseTailoredRecipeResponse(responseText, mockBaseRecipe);
    expect(result.title).toBe("Tailored Recipe");
    expect(result.ingredients?.[0]?.name).toBe("Tomato");
    expect(result.instructions?.[0]?.title).toBe("Chop");
  });

  it("should throw an error if the response is not valid JSON", () => {
    const invalidJson = "{ title: 'Missing quotes', }";

    expect(() => parseTailoredRecipeResponse(invalidJson, mockBaseRecipe)).toThrow(
      "Invalid tailored recipe response: failed to parse JSON"
    );
  });

  it("should throw an error if the parsed JSON is missing required fields", () => {
    const missingTitle = `{
      "ingredients": [],
      "instructions": []
    }`;

    expect(() => parseTailoredRecipeResponse(missingTitle, mockBaseRecipe)).toThrow(
      "Invalid tailored recipe response"
    );

    const missingIngredients = `{
      "title": "Title",
      "instructions": []
    }`;

    expect(() => parseTailoredRecipeResponse(missingIngredients, mockBaseRecipe)).toThrow(
      "Invalid tailored recipe response"
    );
  });
});
