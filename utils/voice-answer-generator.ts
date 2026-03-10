/**
 * Voice Answer Generator
 *
 * Generates natural language responses for text-to-speech in cooking mode.
 * Provides context-aware answers for ingredient queries, temperature questions,
 * and step clarifications.
 */

import { log } from "~/utils/logger";
import { voiceCookingService } from "./voice-cooking";
import type RecipeIngredient from "~/data/db/models/RecipeIngredient";
import type RecipeStep from "~/data/db/models/RecipeStep";
import type Recipe from "~/data/db/models/Recipe";

/**
 * Temperature information extracted from recipe
 */
export interface TemperatureInfo {
  value: number;
  unit: "F" | "C";
  context?: string; // e.g., "oven", "preheat", "bake"
}

/**
 * Answer types for voice responses
 */
export type AnswerType =
  | "ingredient_amount"
  | "temperature"
  | "step_clarification"
  | "navigation_confirmation"
  | "error"
  | "help";

/**
 * Result object for generated answers
 */
export interface VoiceAnswer {
  text: string;
  type: AnswerType;
}

class VoiceAnswerGenerator {
  /**
   * Generate and speak the amount needed for an ingredient
   */
  generateIngredientAmount(
    ingredientName: string,
    quantity: number,
    unit: string
  ): VoiceAnswer {
    const spokenQuantity = this.formatQuantityForSpeech(quantity);
    const spokenUnit = this.formatUnitForSpeech(unit, quantity);

    let text: string;
    if (quantity === 0) {
      text = `You don't need any ${ingredientName} for this recipe.`;
    } else {
      text = `You need ${spokenQuantity} ${spokenUnit} of ${ingredientName}.`;
    }

    return {
      text,
      type: "ingredient_amount",
    };
  }

  /**
   * Generate and speak temperature information with both units
   */
  generateTemperatureInfo(temperature: TemperatureInfo): VoiceAnswer {
    const spokenValue = this.formatTemperatureForSpeech(temperature.value);
    const unitName = temperature.unit === "F" ? "Fahrenheit" : "Celsius";

    // Calculate the equivalent in the other unit
    const convertedUnit: "F" | "C" = temperature.unit === "F" ? "C" : "F";
    const convertedValue = this.convertTemperature(temperature.value, temperature.unit, convertedUnit);
    const convertedUnitName = convertedUnit === "F" ? "Fahrenheit" : "Celsius";

    let text: string;
    if (temperature.context) {
      text = `${temperature.context} at ${spokenValue} degrees ${unitName}, or ${convertedValue} degrees ${convertedUnitName}.`;
    } else {
      text = `The temperature is ${spokenValue} degrees ${unitName}, or ${convertedValue} degrees ${convertedUnitName}.`;
    }

    return {
      text,
      type: "temperature",
    };
  }

  /**
   * Generate response when no temperature is found
   */
  generateNoTemperatureFound(recipeName?: string): VoiceAnswer {
    let text = "I couldn't find a specific temperature";
    if (recipeName) {
      text += ` for ${recipeName}`;
    }
    text += ". Check the recipe instructions for cooking temperature details.";

    return {
      text,
      type: "temperature",
    };
  }

  /**
   * Generate step clarification with emphasis
   */
  generateStepClarification(step: RecipeStep): VoiceAnswer {
    const stepText = voiceCookingService.formatStepForSpeech(
      step.step,
      step.title,
      step.description
    );

    return {
      text: `Here's step ${step.step}: ${stepText}`,
      type: "step_clarification",
    };
  }

  /**
   * Generate navigation confirmation
   */
  generateNavigationConfirmation(
    action: "next" | "previous" | "back",
    stepNumber: number,
    totalSteps?: number
  ): VoiceAnswer {
    let text: string;

    if (action === "next") {
      if (totalSteps) {
        text = `Going to step ${stepNumber} of ${totalSteps}.`;
      } else {
        text = `Going to step ${stepNumber}.`;
      }
    } else if (action === "previous" || action === "back") {
      text = `Going back to step ${stepNumber}.`;
    } else {
      text = `Moving to step ${stepNumber}.`;
    }

    return {
      text,
      type: "navigation_confirmation",
    };
  }

  /**
   * Generate error response for unknown commands
   */
  generateErrorResponse(
    context?: "ingredient" | "temperature" | "general" | "step"
  ): VoiceAnswer {
    let text = "I didn't catch that.";

    switch (context) {
      case "ingredient":
        text +=
          " Try asking about a specific ingredient, like 'how much flour' or 'how many eggs'.";
        break;
      case "temperature":
        text += " For temperature, try saying 'what's the temperature' or 'how hot should the oven be'.";
        break;
      case "step":
        text += " For step help, try 'explain this step' or 'what do I do'.";
        break;
      case "general":
      default:
        text +=
          " You can say 'next step', 'how much' followed by an ingredient name, 'what's the temperature', or 'help' for more options.";
        break;
    }

    return {
      text,
      type: "error",
    };
  }

  /**
   * Generate help response listing available commands
   */
  generateHelpResponse(): VoiceAnswer {
    const text =
      "Here are some commands you can use: 'next step' or 'go forward' to advance, 'previous' or 'go back' to go back, 'repeat' to hear the step again, 'how much' followed by an ingredient name to check amounts, 'what's the temperature' for cooking temperature, and 'stop' to stop voice assistance.";

    return {
      text,
      type: "help",
    };
  }

  /**
   * Generate response when ingredient is not found in recipe
   */
  generateIngredientNotFound(ingredientName: string): VoiceAnswer {
    const text = `I couldn't find ${ingredientName} in this recipe. Try asking about a different ingredient, or say 'ingredients' to hear the full list.`;

    return {
      text,
      type: "error",
    };
  }

  /**
   * Generate ingredients list summary
   */
  generateIngredientsList(ingredients: RecipeIngredient[]): VoiceAnswer {
    if (ingredients.length === 0) {
      return {
        text: "This recipe doesn't have any ingredients listed.",
        type: "ingredient_amount",
      };
    }

    const text = voiceCookingService.formatIngredientsForSpeech(
      ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      }))
    );

    return {
      text,
      type: "ingredient_amount",
    };
  }

  /**
   * Format quantity for natural speech
   */
  private formatQuantityForSpeech(quantity: number): string {
    // Handle common fractions for natural speech
    if (quantity === 0.25) return "a quarter";
    if (quantity === 0.33) return "a third";
    if (quantity === 0.5) return "half";
    if (quantity === 0.66) return "two thirds";
    if (quantity === 0.75) return "three quarters";
    if (quantity === 1) return "1";

    // For small decimals, convert to fractions
    if (quantity < 1 && quantity > 0) {
      const fraction = this.decimalToFraction(quantity);
      if (fraction) {
        return fraction;
      }
    }

    // For whole numbers with reasonable magnitude
    if (Number.isInteger(quantity)) {
      return quantity.toString();
    }

    // For decimal values, speak naturally
    return quantity.toString();
  }

  /**
   * Convert decimal to fraction string for common cooking measurements
   */
  private decimalToFraction(decimal: number): string | null {
    const fractions: Record<number, string> = {
      0.125: "an eighth",
      0.166: "a sixth",
      0.2: "a fifth",
      0.25: "a quarter",
      0.333: "a third",
      0.375: "three eighths",
      0.4: "two fifths",
      0.5: "half",
      0.6: "three fifths",
      0.625: "five eighths",
      0.666: "two thirds",
      0.75: "three quarters",
      0.8: "four fifths",
      0.833: "five sixths",
      0.875: "seven eighths",
    };

    // Find closest match
    for (const [value, text] of Object.entries(fractions)) {
      const numValue = parseFloat(value);
      if (Math.abs(decimal - numValue) < 0.02) {
        return text;
      }
    }

    return null;
  }

  /**
   * Format unit for natural speech with proper pluralization
   */
  private formatUnitForSpeech(unit: string, quantity: number): string {
    const unitLower = unit.toLowerCase();

    // Handle common abbreviations and special cases
    const unitMap: Record<string, string> = {
      // Metric
      g: "gram",
      kg: "kilogram",
      l: "litre",
      ml: "millilitre",

      // Imperial/US
      oz: "ounce",
      lb: "pound",
      cup: "cup",
      pt: "pint",
      qt: "quart",
      gal: "gallon",
      tsp: "teaspoon",
      tbsp: "tablespoon",

      // Other
      clove: "clove",
      slice: "slice",
      piece: "piece",
      can: "can",
      bunch: "bunch",
      pinch: "pinch",
      dash: "dash",
    };

    const baseUnit = unitMap[unitLower] || unitLower;

    // Add 's' for plural, except for special cases
    if (quantity !== 1) {
      // Units that don't take 's' or have special plurals
      const noPlural: string[] = ["ml", "l", "kg"];
      const specialPlural: Record<string, string> = {
        pinch: "pinches",
      };

      if (noPlural.includes(unitLower)) {
        return baseUnit;
      }

      if (specialPlural[baseUnit]) {
        return specialPlural[baseUnit];
      }

      return `${baseUnit}s`;
    }

    return baseUnit;
  }

  /**
   * Format temperature for natural speech
   */
  private formatTemperatureForSpeech(temp: number): string {
    return temp.toString();
  }

  /**
   * Convert temperature between Fahrenheit and Celsius
   *
   * @param value - Temperature value to convert
   * @param fromUnit - Source unit ("F" or "C")
   * @param toUnit - Target unit ("F" or "C")
   * @returns Converted temperature value
   */
  private convertTemperature(value: number, fromUnit: "F" | "C", toUnit: "F" | "C"): number {
    if (fromUnit === toUnit) {
      return value;
    }

    if (fromUnit === "F" && toUnit === "C") {
      return Math.round((value - 32) * (5 / 9));
    }

    // from C to F
    return Math.round((value * 9 / 5) + 32);
  }

  /**
   * Speak a generated answer using the voice cooking service
   */
  async speakAnswer(
    answer: VoiceAnswer,
    options?: { interrupt?: boolean; onDone?: () => void }
  ): Promise<void> {
    try {
      await voiceCookingService.speak(answer.text, {
        interrupt: options?.interrupt ?? true,
        onDone: options?.onDone,
      });
      log.debug(`Spoke answer: [${answer.type}] ${answer.text}`);
    } catch (error) {
      log.error("Failed to speak answer:", error);
    }
  }
}

// Singleton instance
export const voiceAnswerGenerator = new VoiceAnswerGenerator();
