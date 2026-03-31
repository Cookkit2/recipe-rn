import { voiceAnswerGenerator } from "../voice-answer-generator";
import { voiceCookingService } from "../voice-cooking";
import type RecipeStep from "~/data/db/models/RecipeStep";
import type RecipeIngredient from "~/data/db/models/RecipeIngredient";

// Mock the voiceCookingService
jest.mock("../voice-cooking", () => ({
  voiceCookingService: {
    formatStepForSpeech: jest.fn(),
    formatIngredientsForSpeech: jest.fn(),
    speak: jest.fn(),
  },
}));

// Mock the logger to prevent console noise during tests
jest.mock("~/utils/logger", () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("VoiceAnswerGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateIngredientAmount", () => {
    it("should return correct response for 0 quantity", () => {
      const result = voiceAnswerGenerator.generateIngredientAmount("flour", 0, "cup");
      expect(result).toEqual({
        text: "You don't need any flour for this recipe.",
        type: "ingredient_amount",
      });
    });

    it("should format whole numbers and simple units correctly", () => {
      const result = voiceAnswerGenerator.generateIngredientAmount("eggs", 2, "piece");
      expect(result).toEqual({
        text: "You need 2 pieces of eggs.",
        type: "ingredient_amount",
      });
    });

    it("should format fractions naturally", () => {
      const result = voiceAnswerGenerator.generateIngredientAmount("sugar", 0.5, "cup");
      expect(result).toEqual({
        text: "You need half cups of sugar.",
        type: "ingredient_amount",
      });
    });

    it("should map common abbreviations and handle plurals appropriately", () => {
      // 1 tbsp -> 1 tablespoon
      expect(voiceAnswerGenerator.generateIngredientAmount("salt", 1, "tbsp").text).toBe(
        "You need 1 tablespoon of salt."
      );

      // 2 tbsp -> 2 tablespoons
      expect(voiceAnswerGenerator.generateIngredientAmount("salt", 2, "tbsp").text).toBe(
        "You need 2 tablespoons of salt."
      );

      // g -> grams (plural)
      expect(voiceAnswerGenerator.generateIngredientAmount("flour", 100, "g").text).toBe(
        "You need 100 grams of flour."
      );

      // ml -> millilitre (no plural)
      expect(voiceAnswerGenerator.generateIngredientAmount("water", 50, "ml").text).toBe(
        "You need 50 millilitre of water."
      );
    });
  });

  describe("generateTemperatureInfo", () => {
    it("should format temperature with context and convert F to C", () => {
      const result = voiceAnswerGenerator.generateTemperatureInfo({
        value: 350,
        unit: "F",
        context: "Bake",
      });
      expect(result).toEqual({
        text: "Bake at 350 degrees Fahrenheit, or 177 degrees Celsius.",
        type: "temperature",
      });
    });

    it("should format temperature without context and convert C to F", () => {
      const result = voiceAnswerGenerator.generateTemperatureInfo({
        value: 180,
        unit: "C",
      });
      expect(result).toEqual({
        text: "The temperature is 180 degrees Celsius, or 356 degrees Fahrenheit.",
        type: "temperature",
      });
    });

    it("should handle same unit gracefully (though internal logic handles unit switching explicitly)", () => {
      // conversion of F to F isn't reachable based on the logic:
      // const convertedUnit: "F" | "C" = temperature.unit === "F" ? "C" : "F";
      // This is just a sanity check for the formatting wrapper.
      const result = voiceAnswerGenerator.generateTemperatureInfo({
        value: 400,
        unit: "F",
      });
      expect(result.text).toContain("400 degrees Fahrenheit, or 204 degrees Celsius.");
    });
  });

  describe("generateNoTemperatureFound", () => {
    it("should generate response with recipe name", () => {
      const result = voiceAnswerGenerator.generateNoTemperatureFound("Pasta");
      expect(result).toEqual({
        text: "I couldn't find a specific temperature for Pasta. Check the recipe instructions for cooking temperature details.",
        type: "temperature",
      });
    });

    it("should generate response without recipe name", () => {
      const result = voiceAnswerGenerator.generateNoTemperatureFound();
      expect(result).toEqual({
        text: "I couldn't find a specific temperature. Check the recipe instructions for cooking temperature details.",
        type: "temperature",
      });
    });
  });

  describe("generateStepClarification", () => {
    it("should generate clarification text using voiceCookingService formatter", () => {
      const mockStep = {
        step: 2,
        title: "Chop vegetables",
        description: "Dice the onions and slice the carrots.",
      } as RecipeStep;

      (voiceCookingService.formatStepForSpeech as jest.Mock).mockReturnValue(
        "Step 2. Chop vegetables. Dice the onions and slice the carrots."
      );

      const result = voiceAnswerGenerator.generateStepClarification(mockStep);

      expect(voiceCookingService.formatStepForSpeech).toHaveBeenCalledWith(
        2,
        "Chop vegetables",
        "Dice the onions and slice the carrots."
      );

      expect(result).toEqual({
        text: "Here's step 2: Step 2. Chop vegetables. Dice the onions and slice the carrots.",
        type: "step_clarification",
      });
    });
  });

  describe("generateNavigationConfirmation", () => {
    it("should format next action with total steps", () => {
      const result = voiceAnswerGenerator.generateNavigationConfirmation("next", 3, 5);
      expect(result).toEqual({
        text: "Going to step 3 of 5.",
        type: "navigation_confirmation",
      });
    });

    it("should format next action without total steps", () => {
      const result = voiceAnswerGenerator.generateNavigationConfirmation("next", 3);
      expect(result).toEqual({
        text: "Going to step 3.",
        type: "navigation_confirmation",
      });
    });

    it("should format previous action", () => {
      const result = voiceAnswerGenerator.generateNavigationConfirmation("previous", 2);
      expect(result).toEqual({
        text: "Going back to step 2.",
        type: "navigation_confirmation",
      });
    });

    it("should format back action", () => {
      const result = voiceAnswerGenerator.generateNavigationConfirmation("back", 1);
      expect(result).toEqual({
        text: "Going back to step 1.",
        type: "navigation_confirmation",
      });
    });

    it("should handle invalid actions gracefully", () => {
      const result = voiceAnswerGenerator.generateNavigationConfirmation("jump" as any, 4);
      expect(result).toEqual({
        text: "Moving to step 4.",
        type: "navigation_confirmation",
      });
    });
  });

  describe("generateErrorResponse", () => {
    it("should generate ingredient error", () => {
      const result = voiceAnswerGenerator.generateErrorResponse("ingredient");
      expect(result.text).toContain("Try asking about a specific ingredient");
      expect(result.type).toBe("error");
    });

    it("should generate temperature error", () => {
      const result = voiceAnswerGenerator.generateErrorResponse("temperature");
      expect(result.text).toContain("For temperature, try saying");
    });

    it("should generate step error", () => {
      const result = voiceAnswerGenerator.generateErrorResponse("step");
      expect(result.text).toContain("For step help, try");
    });

    it("should generate general error", () => {
      const result = voiceAnswerGenerator.generateErrorResponse("general");
      expect(result.text).toContain("You can say 'next step', 'how much'");
    });

    it("should fall back to general error if no context provided", () => {
      const result = voiceAnswerGenerator.generateErrorResponse();
      expect(result.text).toContain("You can say 'next step', 'how much'");
    });
  });

  describe("generateHelpResponse", () => {
    it("should return the help message", () => {
      const result = voiceAnswerGenerator.generateHelpResponse();
      expect(result.type).toBe("help");
      expect(result.text).toContain("Here are some commands you can use");
    });
  });

  describe("generateIngredientNotFound", () => {
    it("should include the ingredient name in the error", () => {
      const result = voiceAnswerGenerator.generateIngredientNotFound("unicorn tears");
      expect(result.type).toBe("error");
      expect(result.text).toBe(
        "I couldn't find unicorn tears in this recipe. Try asking about a different ingredient, or say 'ingredients' to hear the full list."
      );
    });
  });

  describe("generateIngredientsList", () => {
    it("should return empty state message if no ingredients", () => {
      const result = voiceAnswerGenerator.generateIngredientsList([]);
      expect(result).toEqual({
        text: "This recipe doesn't have any ingredients listed.",
        type: "ingredient_amount",
      });
    });

    it("should format ingredient list using voiceCookingService", () => {
      const mockIngredients = [{ name: "flour", quantity: 2, unit: "cup" }] as RecipeIngredient[];

      (voiceCookingService.formatIngredientsForSpeech as jest.Mock).mockReturnValue(
        "You'll need 1 ingredient. 2 cups of flour."
      );

      const result = voiceAnswerGenerator.generateIngredientsList(mockIngredients);

      expect(voiceCookingService.formatIngredientsForSpeech).toHaveBeenCalledWith([
        { name: "flour", quantity: 2, unit: "cup" },
      ]);

      expect(result).toEqual({
        text: "You'll need 1 ingredient. 2 cups of flour.",
        type: "ingredient_amount",
      });
    });
  });

  describe("speakAnswer", () => {
    it("should call voiceCookingService.speak with default options", async () => {
      const answer = { text: "Hello", type: "help" as const };

      await voiceAnswerGenerator.speakAnswer(answer);

      expect(voiceCookingService.speak).toHaveBeenCalledWith("Hello", {
        interrupt: true,
        onDone: undefined,
      });
    });

    it("should pass through provided options", async () => {
      const answer = { text: "Hello", type: "help" as const };
      const onDone = jest.fn();

      await voiceAnswerGenerator.speakAnswer(answer, { interrupt: false, onDone });

      expect(voiceCookingService.speak).toHaveBeenCalledWith("Hello", {
        interrupt: false,
        onDone,
      });
    });

    it("should catch errors from speak to prevent crashing", async () => {
      const answer = { text: "Hello", type: "help" as const };
      (voiceCookingService.speak as jest.Mock).mockRejectedValueOnce(new Error("Speech failed"));

      // Should not throw
      await expect(voiceAnswerGenerator.speakAnswer(answer)).resolves.not.toThrow();
    });
  });
});
