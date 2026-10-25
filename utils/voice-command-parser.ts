/**
 * Voice Command Parser
 *
 * Parses natural language voice commands for cooking mode.
 * Detects ingredient amount queries, temperature questions, and step clarifications.
 */

import { log } from "~/utils/logger";
import { matchesRecipeIngredient } from "~/utils/recipe-ingredient-match";
import type { Recipe, RecipeIngredient, RecipeStep } from "~/types/Recipe";

/**
 * Represents a parsed voice command with extracted information
 */
export interface ParsedVoiceCommand {
  type: "ingredient_amount" | "temperature" | "clarify_step" | "unknown";
  ingredient?: RecipeIngredient;
  confidence: number;
}

/**
 * Represents temperature information extracted from recipe
 */
export interface TemperatureInfo {
  value: number;
  unit: "F" | "C";
  context?: string; // e.g., "Preheat oven to", "Bake at"
}

/**
 * Voice Command Parser class
 *
 * Parses natural language voice commands and extracts relevant information
 * from recipe context for voice answer generation.
 */
class VoiceCommandParser {
  // Patterns for detecting ingredient amount queries
  private readonly INGREDIENT_PATTERNS = [
    /\b(how much|how many|quantity|amount of|what amount)\b/i,
    /\b(do i need|need|i need)\s+(much|many)\b/i,
  ];

  // Patterns for detecting temperature queries
  private readonly TEMPERATURE_PATTERNS = [
    /\b(what'?s?\s+the\s+temperature|temperature|heat|oven|preheat|bake\s+at|cook\s+at)\b/i,
    /\b(how\s+hot|degrees|°[fc])\b/i,
  ];

  // Patterns for detecting step clarification queries
  private readonly CLARIFY_PATTERNS = [
    /\b(what'?s?\s+(the\s+)?step|what\s+do\s+i\s+do|explain|clarify|tell\s+me|say\s+again|read\s+again|repeat)\b/i,
    /\b(what'?s?\s+next|going\s+on|help)\b/i,
  ];

  // Temperature regex patterns for extraction
  private readonly TEMP_EXTRACTION_PATTERNS = [
    /(\d+)\s*(?:degrees?)?\s*°?\s*([FC])/gi, // "350°F", "350 degrees F"
    /(\d+)\s*(?:degrees?\s+(?:fahrenheit|celsius|fahrenheits?|celsiuss?))/gi,
    /(\d+)\s*degrees?/gi, // "350 degrees" (assumes F)
  ];

  /**
   * Parse a voice command and extract relevant information
   *
   * @param text - The spoken text to parse
   * @param recipe - The current recipe context
   * @param currentStep - The current step (optional)
   * @returns Parsed command with extracted information
   */
  parseCommand(text: string, recipe: Recipe | null, currentStep?: RecipeStep): ParsedVoiceCommand {
    const normalizedText = text.toLowerCase().trim();

    // Try to parse as ingredient amount query
    if (this.isIngredientQuery(normalizedText)) {
      const ingredient = this.extractIngredient(normalizedText, recipe?.ingredients ?? []);
      if (ingredient) {
        log.info("Parsed ingredient amount query:", ingredient.name);
        return {
          type: "ingredient_amount",
          ingredient,
          confidence: 0.9,
        };
      }
    }

    // Try to parse as temperature query
    if (this.isTemperatureQuery(normalizedText)) {
      log.info("Parsed temperature query");
      return {
        type: "temperature",
        confidence: 0.85,
      };
    }

    // Try to parse as step clarification query
    if (this.isClarifyQuery(normalizedText)) {
      log.info("Parsed step clarification query");
      return {
        type: "clarify_step",
        confidence: 0.8,
      };
    }

    log.debug("Could not parse voice command:", text);
    return {
      type: "unknown",
      confidence: 0,
    };
  }

  /**
   * Check if text is an ingredient amount query
   */
  private isIngredientQuery(text: string): boolean {
    return this.INGREDIENT_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Check if text is a temperature query
   */
  private isTemperatureQuery(text: string): boolean {
    return this.TEMPERATURE_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Check if text is a step clarification query
   */
  private isClarifyQuery(text: string): boolean {
    return this.CLARIFY_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Extract an ingredient from a spoken quantity question
   *
   * @param text - The spoken text
   * @param ingredients - List of recipe ingredients
   * @returns Matched ingredient or undefined
   */
  private extractIngredient(
    text: string,
    ingredients: RecipeIngredient[]
  ): RecipeIngredient | undefined {
    if (ingredients.length === 0) {
      return undefined;
    }

    // Remove common query phrases to extract ingredient name
    const cleanedText = text
      .replace(/\b(how much|how many|quantity|amount of|what amount|do i need|i need|need)\b/gi, "")
      .replace(/[?!.]/g, "")
      .trim()
      .replace(/^(?:(?:what|is|the|of|for)\s+)+/i, "")
      .trim();

    if (!cleanedText) {
      return undefined;
    }

    const matches = ingredients.filter((ingredient) =>
      matchesRecipeIngredient(cleanedText, ingredient.name)
    );
    return matches.length === 1 ? matches[0] : undefined;
  }

  /**
   * Extract temperature information from recipe instructions
   *
   * @param recipe - The recipe to search
   * @returns Temperature info or undefined if not found
   */
  extractTemperature(recipe: Recipe | null): TemperatureInfo | undefined {
    if (!recipe) {
      return undefined;
    }

    // Search in instructions for temperature mentions
    for (const step of recipe.instructions) {
      const temps = this.extractTemperaturesFromText(`${step.title} ${step.description}`);
      if (temps.length > 0) {
        return temps[0]; // Return first found temperature
      }
    }

    return undefined;
  }

  /**
   * Extract all temperatures from recipe with both units
   *
   * @param recipe - The recipe to search
   * @returns Array of temperature info with both F and C conversions
   */
  extractAllTemperatures(recipe: Recipe | null): TemperatureInfo[] {
    if (!recipe) {
      return [];
    }

    const allTemps: TemperatureInfo[] = [];

    for (const step of recipe.instructions) {
      const temps = this.extractTemperaturesFromText(`${step.title} ${step.description}`);
      allTemps.push(...temps);
    }

    return allTemps;
  }

  /**
   * Convert temperature between Fahrenheit and Celsius
   *
   * @param value - Temperature value to convert
   * @param fromUnit - Source unit ("F" or "C")
   * @param toUnit - Target unit ("F" or "C")
   * @returns Converted temperature value
   */
  convertTemperature(value: number, fromUnit: "F" | "C", toUnit: "F" | "C"): number {
    if (fromUnit === toUnit) {
      return value;
    }

    if (fromUnit === "F" && toUnit === "C") {
      return Math.round((value - 32) * (5 / 9));
    }

    // from C to F
    return Math.round((value * 9) / 5 + 32);
  }

  /**
   * Extract all temperatures from a text
   *
   * @param text - The text to search
   * @returns Array of temperature info
   */
  private extractTemperaturesFromText(text: string): TemperatureInfo[] {
    const results: TemperatureInfo[] = [];

    for (const pattern of this.TEMP_EXTRACTION_PATTERNS) {
      const matches = [...text.matchAll(new RegExp(pattern.source, pattern.flags))];
      for (const match of matches) {
        const value = parseInt(match[1] ?? match[0], 10);
        const unitStr = match[2] ?? "F";
        const unit: "F" | "C" = unitStr.toUpperCase() === "C" ? "C" : "F";

        // Extract context around the temperature
        const index = match.index ?? 0;
        const contextStart = Math.max(0, index - 30);
        const contextEnd = Math.min(text.length, index + match[0].length + 10);
        const context = text.slice(contextStart, contextEnd).trim();

        results.push({ value, unit, context });
      }
    }

    return results;
  }

  /**
   * Get suggestions for unrecognized commands
   *
   * @param currentContext - Current context (e.g., "ingredients", "step")
   * @returns Array of suggestion phrases
   */
  getSuggestions(currentContext?: string): string[] {
    const baseSuggestions = [
      "Try saying 'next step'",
      "Try saying 'how much flour'",
      "Try saying 'what's the temperature'",
    ];

    const contextSuggestions: Record<string, string[]> = {
      ingredients: ["Try saying 'how much [ingredient]'"],
      step: ["Try saying 'explain this step'", "Try saying 'what do I do'", "Try saying 'repeat'"],
    };

    if (currentContext && contextSuggestions[currentContext]) {
      return [...baseSuggestions, ...contextSuggestions[currentContext]];
    }

    return baseSuggestions;
  }

  /**
   * Get a helpful error message for unrecognized commands
   *
   * @param command - The unrecognized command
   * @param currentContext - Current context (optional)
   * @returns Helpful error message
   */
  getErrorMessage(command: string, currentContext?: string): string {
    const suggestions = this.getSuggestions(currentContext);
    return `I didn't catch that. ${suggestions[0]}. You can also say 'help' for more options.`;
  }
}

// Singleton instance
export const voiceCommandParser = new VoiceCommandParser();
