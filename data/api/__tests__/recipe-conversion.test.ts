import { convertDbRecipesToUIRecipesBatch } from "../recipe-conversion";
import type { DbRecipeForConversion } from "../recipe-conversion";

// Mock logger
jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("recipe-conversion", () => {
  describe("convertDbRecipesToUIRecipesBatch", () => {
    it("should convert empty array", () => {
      const result = convertDbRecipesToUIRecipesBatch([], new Map());

      expect(result).toEqual([]);
    });

    it("should convert single recipe with all fields", () => {
      const dbRecipe: DbRecipeForConversion = {
        id: "recipe-1",
        title: "Test Recipe",
        description: "Test description",
        imageUrl: "https://example.com/image.jpg",
        prepMinutes: 10,
        cookMinutes: 20,
        difficultyStars: 3,
        servings: 4,
        sourceUrl: "https://example.com/recipe",
        calories: 500,
        tags: ["tag1", "tag2"],
      };

      const recipeDetails = {
        recipe: dbRecipe,
        steps: [
          { step: 1, title: "Step 1", description: "Description 1" },
          { step: 2, title: "Step 2", description: "Description 2" },
        ],
        ingredients: [
          { id: "ing-1", name: "Ingredient 1", quantity: 1, unit: "cup", notes: "chopped" },
          { id: "ing-2", name: "Ingredient 2", quantity: 2, unit: "tbsp", notes: null },
        ],
      };

      const map = new Map([[dbRecipe.id, recipeDetails]]);
      const result = convertDbRecipesToUIRecipesBatch([dbRecipe], map);

      expect(result).toHaveLength(1);
      expect(result[0]!!).toMatchObject({
        id: "recipe-1",
        title: "Test Recipe",
        description: "Test description",
        imageUrl: "https://example.com/image.jpg",
        prepMinutes: 10,
        cookMinutes: 20,
        difficultyStars: 3,
        servings: 4,
        sourceUrl: "https://example.com/recipe",
        calories: 500,
        tags: ["tag1", "tag2"],
      });
    });

    it("should handle null optional fields", () => {
      const dbRecipe: DbRecipeForConversion = {
        id: "recipe-2",
        title: "Minimal Recipe",
        description: undefined,
        imageUrl: null,
        prepMinutes: null,
        cookMinutes: null,
        difficultyStars: null,
        servings: null,
        sourceUrl: null,
        calories: null,
        tags: null,
      };

      const recipeDetails = {
        recipe: dbRecipe,
        steps: [],
        ingredients: [],
      };

      const map = new Map([[dbRecipe.id, recipeDetails]]);
      const result = convertDbRecipesToUIRecipesBatch([dbRecipe], map);

      expect(result).toHaveLength(1);
      expect(result[0]!!).toMatchObject({
        id: "recipe-2",
        title: "Minimal Recipe",
        imageUrl: "",
        prepMinutes: undefined,
        cookMinutes: undefined,
        difficultyStars: undefined,
        servings: undefined,
        sourceUrl: undefined,
        calories: undefined,
        tags: undefined,
      });
    });

    it("should convert ingredients with related IDs", () => {
      const dbRecipe: DbRecipeForConversion = {
        id: "recipe-3",
        title: "Recipe with Ingredients",
        description: "Test",
      };

      const recipeDetails = {
        recipe: dbRecipe,
        steps: [],
        ingredients: [
          { id: "ing-1", name: "Flour", quantity: 2, unit: "cups", notes: null },
          { id: "ing-2", name: "Sugar", quantity: 1, unit: "cup", notes: "organic" },
        ],
      };

      const map = new Map([[dbRecipe.id, recipeDetails]]);
      const result = convertDbRecipesToUIRecipesBatch([dbRecipe], map);

      expect(result[0]!!.ingredients).toEqual([
        {
          name: "Flour",
          relatedIngredientId: "ing-1",
          quantity: 2,
          unit: "cups",
          notes: undefined,
        },
        { name: "Sugar", relatedIngredientId: "ing-2", quantity: 1, unit: "cup", notes: "organic" },
      ]);
    });

    it("should convert steps with empty relatedIngredientIds", () => {
      const dbRecipe: DbRecipeForConversion = {
        id: "recipe-4",
        title: "Recipe with Steps",
        description: "Test",
      };

      const recipeDetails = {
        recipe: dbRecipe,
        steps: [
          { step: 1, title: "Prepare", description: "Get ingredients ready" },
          { step: 2, title: "Cook", description: "Cook the food" },
          { step: 3, title: "Serve", description: "Serve hot" },
        ],
        ingredients: [],
      };

      const map = new Map([[dbRecipe.id, recipeDetails]]);
      const result = convertDbRecipesToUIRecipesBatch([dbRecipe], map);

      expect(result[0]!!.instructions).toEqual([
        {
          step: 1,
          title: "Prepare",
          description: "Get ingredients ready",
          relatedIngredientIds: [],
        },
        { step: 2, title: "Cook", description: "Cook the food", relatedIngredientIds: [] },
        { step: 3, title: "Serve", description: "Serve hot", relatedIngredientIds: [] },
      ]);
    });

    it("should convert multiple recipes", () => {
      const dbRecipe1: DbRecipeForConversion = {
        id: "recipe-1",
        title: "Recipe 1",
        description: "Desc 1",
      };
      const dbRecipe2: DbRecipeForConversion = {
        id: "recipe-2",
        title: "Recipe 2",
        description: "Desc 2",
      };

      const details1 = { recipe: dbRecipe1, steps: [], ingredients: [] };
      const details2 = { recipe: dbRecipe2, steps: [], ingredients: [] };

      const map = new Map([
        [dbRecipe1.id, details1],
        [dbRecipe2.id, details2],
      ]);

      const result = convertDbRecipesToUIRecipesBatch([dbRecipe1, dbRecipe2], map);

      expect(result).toHaveLength(2);
      expect(result[0]!!.title).toBe("Recipe 1");
      expect(result[1]!.title).toBe("Recipe 2");
    });

    it("should skip recipes with missing details", () => {
      const dbRecipe1: DbRecipeForConversion = {
        id: "recipe-1",
        title: "Recipe 1",
        description: "Desc 1",
      };
      const dbRecipe2: DbRecipeForConversion = {
        id: "recipe-2",
        title: "Recipe 2",
        description: "Desc 2",
      };

      const details1 = { recipe: dbRecipe1, steps: [], ingredients: [] };

      const map = new Map([[dbRecipe1.id, details1]]);

      const result = convertDbRecipesToUIRecipesBatch([dbRecipe1, dbRecipe2], map);

      expect(result).toHaveLength(1);
      expect(result[0]!!.id).toBe("recipe-1");
    });

    it("should handle empty ingredient notes", () => {
      const dbRecipe: DbRecipeForConversion = {
        id: "recipe-5",
        title: "Recipe",
        description: "Test",
      };

      const recipeDetails = {
        recipe: dbRecipe,
        steps: [],
        ingredients: [{ id: "ing-1", name: "Salt", quantity: 1, unit: "tsp", notes: "" }],
      };

      const map = new Map([[dbRecipe.id, recipeDetails]]);
      const result = convertDbRecipesToUIRecipesBatch([dbRecipe], map);

      expect(result[0]!!.ingredients[0]!.notes).toBe("");
    });

    it("should handle empty unit in ingredients", () => {
      const dbRecipe: DbRecipeForConversion = {
        id: "recipe-6",
        title: "Recipe",
        description: "Test",
      };

      const recipeDetails = {
        recipe: dbRecipe,
        steps: [],
        ingredients: [{ id: "ing-1", name: "Egg", quantity: 2, unit: null, notes: null }],
      };

      const map = new Map([[dbRecipe.id, recipeDetails]]);
      const result = convertDbRecipesToUIRecipesBatch([dbRecipe], map);

      expect(result[0]!!.ingredients[0]!.unit).toBe("");
    });

    it("should preserve all step fields", () => {
      const dbRecipe: DbRecipeForConversion = {
        id: "recipe-7",
        title: "Recipe",
        description: "Test",
      };

      const recipeDetails = {
        recipe: dbRecipe,
        steps: [
          { step: 5, title: "Complex Step", description: "Complex description with details" },
        ],
        ingredients: [],
      };

      const map = new Map([[dbRecipe.id, recipeDetails]]);
      const result = convertDbRecipesToUIRecipesBatch([dbRecipe], map);

      expect(result[0]!!.instructions[0]!).toEqual({
        step: 5,
        title: "Complex Step",
        description: "Complex description with details",
        relatedIngredientIds: [],
      });
    });

    it("should convert recipes with zero calories", () => {
      const dbRecipe: DbRecipeForConversion = {
        id: "recipe-8",
        title: "Zero Cal Recipe",
        description: "Test",
        calories: 0,
      };

      const recipeDetails = { recipe: dbRecipe, steps: [], ingredients: [] };
      const map = new Map([[dbRecipe.id, recipeDetails]]);

      const result = convertDbRecipesToUIRecipesBatch([dbRecipe], map);

      expect(result[0]!!.calories).toBe(0);
    });

    it("should convert recipes with empty tags array", () => {
      const dbRecipe: DbRecipeForConversion = {
        id: "recipe-9",
        title: "Recipe",
        description: "Test",
        tags: [],
      };

      const recipeDetails = { recipe: dbRecipe, steps: [], ingredients: [] };
      const map = new Map([[dbRecipe.id, recipeDetails]]);

      const result = convertDbRecipesToUIRecipesBatch([dbRecipe], map);

      expect(result[0]!!.tags).toEqual([]);
    });
  });
});
