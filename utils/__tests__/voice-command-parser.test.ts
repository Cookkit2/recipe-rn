import { normalizeIngredientName, voiceCommandParser } from "../voice-command-parser";
import type { Recipe } from "~/types/Recipe";

describe("VoiceCommandParser", () => {
  describe("parseCommand", () => {
    it("parses ingredient amount queries", () => {
      const mockRecipe = {
        ingredients: [
          { name: "Flour", quantity: 2, unit: "cups", relatedIngredientId: "1" },
          { name: "Sugar", quantity: 1, unit: "cup", relatedIngredientId: "2" },
        ],
      } as Recipe;

      const result = voiceCommandParser.parseCommand("how much flour do I need", mockRecipe);
      expect(result).toMatchObject({
        type: "ingredient_amount",
        ingredient: { name: "Flour", quantity: 2, unit: "cups" },
        confidence: 0.9,
      });
    });

    it("parses temperature queries", () => {
      const result = voiceCommandParser.parseCommand("what is the temperature", null);
      expect(result.type).toBe("temperature");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("parses step clarification queries", () => {
      const result = voiceCommandParser.parseCommand("what's the step", null);
      expect(result.type).toBe("clarify_step");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("returns unknown for unrecognized commands", () => {
      const result = voiceCommandParser.parseCommand("play some music", null);
      expect(result.type).toBe("unknown");
    });
  });

  describe("ingredient normalization", () => {
    it("normalizes modifiers and common plural endings", () => {
      expect(normalizeIngredientName("fresh tomatoes")).toEqual(["tomato"]);
      expect(normalizeIngredientName("diced onions")).toEqual(["onion"]);
      expect(normalizeIngredientName("cooked chicken breast")).toEqual(["chicken", "breast"]);
      expect(normalizeIngredientName("frozen cherries")).toEqual(["cherry"]);
    });

    it("matches modified plural ingredient names through the public parser", () => {
      const mockRecipe = {
        ingredients: [{ name: "Tomato", quantity: 3, unit: "pieces", relatedIngredientId: "1" }],
      } as Recipe;

      const result = voiceCommandParser.parseCommand(
        "how much fresh tomatoes do I need",
        mockRecipe
      );

      expect(result.type).toBe("ingredient_amount");
      expect(result.ingredient?.name).toBe("Tomato");
    });
  });

  describe("extractAllTemperatures", () => {
    it.each([
      ["Bake at 350°F for 30 minutes", 350, "F"],
      ["Cook at 180°C", 180, "C"],
      ["Preheat oven to 400 degrees", 400, "F"],
    ] as const)("extracts a temperature from %s", (description, value, unit) => {
      const mockRecipe = {
        instructions: [{ title: "Cook", description }],
      } as Recipe;

      expect(voiceCommandParser.extractAllTemperatures(mockRecipe)).toEqual([
        expect.objectContaining({ value, unit }),
      ]);
    });

    it("extracts multiple temperatures from recipe steps", () => {
      const mockRecipe = {
        instructions: [
          { title: "Prep", description: "Preheat oven to 350°F." },
          { title: "Cook", description: "Then raise heat to 400 degrees." },
          { title: "Cool", description: "Let it cool." },
        ],
      } as Recipe;

      const temps = voiceCommandParser.extractAllTemperatures(mockRecipe);
      expect(temps).toHaveLength(2);
      expect(temps[0]?.value).toBe(350);
      expect(temps[1]?.value).toBe(400);
    });

    it("returns empty array for no temperatures", () => {
      const mockRecipe = {
        instructions: [{ title: "Prep", description: "Mix ingredients." }],
      } as Recipe;

      const temps = voiceCommandParser.extractAllTemperatures(mockRecipe);
      expect(temps).toHaveLength(0);
    });

    it("returns empty array for null recipe", () => {
      const temps = voiceCommandParser.extractAllTemperatures(null);
      expect(temps).toHaveLength(0);
    });
  });
});
