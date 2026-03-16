/// <reference types="jest" />
import { parseTailoredRecipeResponse } from "../helpers";
import type { Recipe } from "~/types/Recipe";

describe("parseTailoredRecipeResponse", () => {
  const baseRecipe: Recipe = {
    id: "base-123",
    title: "Base Recipe",
    description: "A base recipe description",
    imageUrl: "https://example.com/image.jpg",
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 2,
    difficultyStars: 3,
    calories: 500,
    tags: ["dinner"],
    ingredients: [],
    instructions: [],
    sourceUrl: "https://example.com",
  };

  it("should successfully parse valid JSON response", () => {
    const responseText = `\`\`\`json
    {
      "title": "Tailored Recipe",
      "ingredients": [
        { "name": "salt", "quantity": 1, "unit": "tsp" }
      ],
      "instructions": [
        { "step": 1, "title": "Mix", "description": "Mix it well" }
      ]
    }
    \`\`\``;

    const result = parseTailoredRecipeResponse(responseText, baseRecipe);

    expect(result.title).toBe("Tailored Recipe");
    expect(result.ingredients?.length).toBe(1);
    expect(result.ingredients?.[0]?.name).toBe("salt");
    expect(result.instructions?.length).toBe(1);
    expect(result.instructions?.[0]?.title).toBe("Mix");
  });

  it("should throw an error for malformed JSON", () => {
    const responseText = `\`\`\`json
    {
      "title": "Tailored Recipe",
      "ingredients": [
        { "name": "salt", "quantity": 1, "unit": "tsp" }
      ],
      "instructions": [
        { "step": 1, "title": "Mix", "description": "Mix it well" }
      ]
    `; // Missing closing brace

    expect(() => parseTailoredRecipeResponse(responseText, baseRecipe)).toThrow(
      "Invalid tailored recipe response: failed to parse JSON"
    );
  });

  it("should throw an error if parsed JSON is missing required fields", () => {
    const responseText = `\`\`\`json
    {
      "title": "Tailored Recipe"
    }
    \`\`\``;

    expect(() => parseTailoredRecipeResponse(responseText, baseRecipe)).toThrow(
      "Invalid tailored recipe response"
    );
  });
});
