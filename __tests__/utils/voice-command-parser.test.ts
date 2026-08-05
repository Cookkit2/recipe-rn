import { VoiceCommandParser } from "../../utils/voice-command-parser";
import type { Recipe, RecipeIngredient, RecipeStep } from "~/types/Recipe";

// Mock isIngredientMatch to test its branch
jest.mock("~/utils/ingredient-matching", () => ({
  isIngredientMatch: jest.fn((spoken, ingredientName) => {
    return spoken === "sugar" && ingredientName === "granulated sugar";
  }),
}));

describe("VoiceCommandParser", () => {
  let parser: VoiceCommandParser;

  beforeEach(() => {
    parser = new VoiceCommandParser();
    jest.clearAllMocks();
  });

  describe("parseCommand", () => {
    it("should parse temperature query", () => {
      const result = parser.parseCommand("what's the temperature", null);
      expect(result.type).toBe("temperature");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should parse step clarification query", () => {
      const result = parser.parseCommand("can you explain this step", null);
      expect(result.type).toBe("clarify_step");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should parse unknown query", () => {
      const result = parser.parseCommand("how is the weather today", null);
      expect(result.type).toBe("unknown");
      expect(result.confidence).toBe(0);
    });

    it("should parse ingredient amount query", () => {
      const mockRecipe: Recipe = {
        ingredients: [{ name: "Flour", quantity: 2, unit: "cups" } as RecipeIngredient],
      } as Recipe;
      const result = parser.parseCommand("how much flour do i need", mockRecipe);
      expect(result.type).toBe("ingredient_amount");
      expect(result.ingredient?.name).toBe("Flour");
    });

    it("should handle ingredient amount query without recipe", () => {
      const result = parser.parseCommand("how much flour do i need", null);
      expect(result.type).toBe("unknown");
    });

    it("should handle ingredient amount query with empty ingredients", () => {
      const mockRecipe: Recipe = { ingredients: [] } as unknown as Recipe;
      const result = parser.parseCommand("how much flour do i need", mockRecipe);
      expect(result.type).toBe("unknown");
    });

    it("should extract ingredient with exact match", () => {
      const mockRecipe: Recipe = {
        ingredients: [{ name: "Flour", quantity: 2, unit: "cups" } as RecipeIngredient],
      } as Recipe;
      const result = parser.parseCommand("how much flour", mockRecipe);
      expect(result.type).toBe("ingredient_amount");
      expect(result.ingredient?.name).toBe("Flour");
    });

    it("should extract ingredient using isIngredientMatch utility", () => {
      const mockRecipe: Recipe = {
        ingredients: [{ name: "granulated sugar", quantity: 1, unit: "cup" } as RecipeIngredient],
      } as Recipe;
      const result = parser.parseCommand("how much sugar", mockRecipe);
      expect(result.type).toBe("ingredient_amount");
      expect(result.ingredient?.name).toBe("granulated sugar");
    });

    it("should extract ingredient using partial match (contains)", () => {
      const mockRecipe: Recipe = {
        ingredients: [{ name: "brown sugar", quantity: 1, unit: "cup" } as RecipeIngredient],
      } as Recipe;
      const result = parser.parseCommand("how much brown sugar pack", mockRecipe);
      expect(result.type).toBe("ingredient_amount");
      expect(result.ingredient?.name).toBe("brown sugar");
    });

    it("should extract ingredient with fuzzy matching", () => {
      const mockRecipe: Recipe = {
        ingredients: [{ name: "All-purpose Flour", quantity: 2, unit: "cups" } as RecipeIngredient],
      } as Recipe;
      const result = parser.parseCommand("how much all-purpose", mockRecipe);
      expect(result.type).toBe("ingredient_amount");
      expect(result.ingredient?.name).toBe("All-purpose Flour");
    });

    it("should handle plural ingredient fuzzy matching via singularize", () => {
      const mockRecipe: Recipe = {
        ingredients: [
          { name: "Cherry", quantity: 2, unit: "cups" } as RecipeIngredient,
          { name: "Tomato", quantity: 2, unit: "cups" } as RecipeIngredient,
          { name: "House", quantity: 2, unit: "cups" } as RecipeIngredient,
          { name: "Knife", quantity: 2, unit: "cups" } as RecipeIngredient,
          { name: "Box", quantity: 2, unit: "cups" } as RecipeIngredient,
          { name: "Peach", quantity: 2, unit: "cups" } as RecipeIngredient,
          { name: "Dish", quantity: 2, unit: "cups" } as RecipeIngredient,
        ],
      } as Recipe;

      const testCases = [
        ["how many cherries", "Cherry"],
        ["how many tomatoes", "Tomato"],
        ["how many houses", "House"],
        ["how many knives", "Knife"],
        ["how many boxes", "Box"],
        ["how many peaches", "Peach"],
        ["how many dishes", "Dish"],
      ];

      for (const [command, expectedIngredient] of testCases) {
        const result = parser.parseCommand(command, mockRecipe);
        expect(result.type).toBe("ingredient_amount");
        expect(result.ingredient?.name).toBe(expectedIngredient);
      }
    });

    it("should handle ingredient fuzzy matching with unnormalized strings", () => {
      const mockRecipe: Recipe = {
        ingredients: [
          {
            name: "Very unnormalized ingredients thing here",
            quantity: 2,
            unit: "cups",
          } as RecipeIngredient,
        ],
      } as Recipe;
      // Triggers the fallback branch logic (simple word-based matching)
      const result = parser.parseCommand("how much unnormalized ingredients", mockRecipe);
      expect(result.type).toBe("ingredient_amount");
      expect(result.ingredient?.name).toBe("Very unnormalized ingredients thing here");
    });

    it("should return unknown if no ingredient matches", () => {
      const mockRecipe: Recipe = {
        ingredients: [{ name: "Flour", quantity: 2, unit: "cups" } as RecipeIngredient],
      } as Recipe;
      const result = parser.parseCommand("how much water do i need", mockRecipe);
      // Fails to match anything
      expect(result.type).toBe("unknown");
    });
  });

  describe("Temperature extraction", () => {
    it("should extract temperature from recipe step", () => {
      const mockRecipe = {
        instructions: [{ title: "Prep", description: "Preheat oven to 350°F" } as RecipeStep],
      } as Recipe;

      const temp = parser.extractTemperature(mockRecipe);
      expect(temp).toBeDefined();
      expect(temp?.value).toBe(350);
      expect(temp?.unit).toBe("F");
    });

    it("should extract multiple temperatures", () => {
      const mockRecipe = {
        instructions: [
          { title: "Prep", description: "Bake at 350 degrees F and then 400°C" } as RecipeStep,
        ],
      } as Recipe;

      const temps = parser.extractAllTemperatures(mockRecipe);
      expect(temps.length).toBeGreaterThanOrEqual(2);
      expect(temps[0]?.value).toBe(350);
      expect(temps[1]?.value).toBe(400);
      expect(temps[1]?.unit).toBe("C");
    });

    it("should return undefined if no recipe is provided for extractTemperature", () => {
      expect(parser.extractTemperature(null)).toBeUndefined();
    });

    it("should return undefined if no temperature found", () => {
      const mockRecipe = {
        instructions: [{ title: "Prep", description: "Mix the ingredients" } as RecipeStep],
      } as Recipe;
      expect(parser.extractTemperature(mockRecipe)).toBeUndefined();
    });

    it("should return empty array if no recipe is provided for extractAllTemperatures", () => {
      expect(parser.extractAllTemperatures(null)).toEqual([]);
    });

    it("should correctly handle bounds for context extraction", () => {
      const mockRecipe = {
        instructions: [{ title: "Prep", description: "350F" } as RecipeStep],
      } as Recipe;
      const temps = parser.extractAllTemperatures(mockRecipe);
      expect(temps[0]?.context).toBe("Prep 350F");
    });
  });

  describe("convertTemperature", () => {
    it("should convert F to C", () => {
      expect(parser.convertTemperature(212, "F", "C")).toBe(100);
    });

    it("should convert C to F", () => {
      expect(parser.convertTemperature(100, "C", "F")).toBe(212);
    });

    it("should return same value for same units", () => {
      expect(parser.convertTemperature(100, "C", "C")).toBe(100);
      expect(parser.convertTemperature(212, "F", "F")).toBe(212);
    });
  });

  describe("getSuggestions", () => {
    it("should return base suggestions when no context", () => {
      const suggestions = parser.getSuggestions();
      expect(suggestions).toContain("Try saying 'next step'");
    });

    it("should return specific suggestions for ingredients context", () => {
      const suggestions = parser.getSuggestions("ingredients");
      expect(suggestions).toContain("Try saying 'how much [ingredient]'");
    });

    it("should return specific suggestions for step context", () => {
      const suggestions = parser.getSuggestions("step");
      expect(suggestions).toContain("Try saying 'explain this step'");
    });
  });

  describe("getErrorMessage", () => {
    it("should format error message", () => {
      const msg = parser.getErrorMessage("what");
      expect(msg).toContain("I didn't catch that");
    });

    it("should format error message with context", () => {
      const msg = parser.getErrorMessage("what", "ingredients");
      expect(msg).toContain("Try saying 'next step'");
    });
  });
});
