import { voiceCommandParser } from "../voice-command-parser";
import type { Recipe } from "~/types/Recipe";

describe("VoiceCommandParser", () => {
  describe("parseCommand", () => {
    it("parses ingredient amount queries and normalizes ingredient names with modifiers and plurals", () => {
      const mockRecipe = {
        ingredients: [{ name: "Tomato", quantity: 2, unit: "cups", relatedIngredientId: "1" }],
      } as Recipe;

      // "fresh tomatoes" should match "Tomato" due to modifier stripping and singularization (oes -> o)
      const result = voiceCommandParser.parseCommand(
        "how much fresh tomatoes do I need",
        mockRecipe
      );
      expect(result.type).toBe("ingredient_amount");
      expect(result.ingredient?.name).toBe("Tomato");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("parses temperature queries", () => {
      const result = voiceCommandParser.parseCommand("what is the temperature", null);
      expect(result.type).toBe("temperature");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("parses step clarification queries", () => {
      const result = voiceCommandParser.parseCommand("what's the next step", null);
      expect(result.type).toBe("clarify_step");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("returns unknown for unrecognized commands", () => {
      const result = voiceCommandParser.parseCommand("play some music", null);
      expect(result.type).toBe("unknown");
    });
  });

  describe("extractAllTemperatures", () => {
    it("extracts fahrenheit temperatures", () => {
      const mockRecipe = {
        instructions: [{ title: "Prep", description: "Bake at 350°F for 30 minutes" }],
      } as Recipe;
      const temps = voiceCommandParser.extractAllTemperatures(mockRecipe);
      expect(temps).toHaveLength(1);
      expect(temps[0]?.value).toBe(350);
      expect(temps[0]?.unit).toBe("F");
      expect(temps[0]?.context).toContain("Bake at 350°F");
    });

    it("extracts celsius temperatures", () => {
      const mockRecipe = {
        instructions: [{ title: "Prep", description: "Cook at 180°C" }],
      } as Recipe;
      const temps = voiceCommandParser.extractAllTemperatures(mockRecipe);
      expect(temps).toHaveLength(1);
      expect(temps[0]?.value).toBe(180);
      expect(temps[0]?.unit).toBe("C");
    });

    it("extracts temperatures without explicit C/F assuming F", () => {
      const mockRecipe = {
        instructions: [{ title: "Prep", description: "preheat oven to 400 degrees" }],
      } as Recipe;
      const temps = voiceCommandParser.extractAllTemperatures(mockRecipe);
      expect(temps).toHaveLength(1);
      expect(temps[0]?.value).toBe(400);
      expect(temps[0]?.unit).toBe("F");
    });
  });
});
