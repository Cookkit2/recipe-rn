/**
 * Voice Command Parser
 *
 * Parses natural language voice commands for cooking mode.
 * Detects ingredient amount queries, temperature questions, and step clarifications.
 */

import { log } from "~/utils/logger";
import { isIngredientMatch } from "~/utils/ingredient-matching";
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
  parseCommand(
    text: string,
    recipe: Recipe | null,
    currentStep?: RecipeStep
  ): ParsedVoiceCommand {
    const normalizedText = text.toLowerCase().trim();

    // Try to parse as ingredient amount query
    if (this.isIngredientQuery(normalizedText)) {
      const ingredient = this.extractIngredient(
        normalizedText,
        recipe?.ingredients ?? []
      );
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
   * Extract ingredient from text using fuzzy matching
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
      .trim();

    if (!cleanedText) {
      return undefined;
    }

    // Try to find best match using fuzzy matching
    let bestMatch: RecipeIngredient | undefined;
    let bestScore = 0;

    for (const ingredient of ingredients) {
      const score = this.calculateMatchScore(cleanedText, ingredient.name);
      if (score > bestScore && score >= 0.6) {
        // 0.6 threshold for fuzzy match
        bestScore = score;
        bestMatch = ingredient;
      }
    }

    return bestMatch;
  }

  /**
   * Normalize ingredient name by removing common modifiers and handling plurals
   *
   * @param name - The ingredient name to normalize
   * @returns Normalized name with key words extracted
   */
  private normalizeIngredientName(name: string): string[] {
    return name
      .toLowerCase()
      .replace(
        /\b(fresh|frozen|canned|dried|cooked|raw|organic|whole|sliced|diced|chopped|steamed|boiled|fried|grilled|ground|minced)\b/g,
        ""
      )
      .split(/[\s,\-()]+/)
      .filter((word) => word.length > 2)
      .map((word) => this.singularize(word.trim()));
  }

  /**
   * Convert plural form to singular (simple implementation)
   *
   * @param word - The word to singularize
   * @returns Singular form of the word
   */
  private singularize(word: string): string {
    // Common plural endings
    const pluralRules = [
      { pattern: /ies$/i, replacement: "y" }, // tomatoes -> tomato, cherries -> cherry
      { pattern: /ses$/i, replacement: "s" }, // houses -> house (keeps s)
      { pattern: /ves$/i, replacement: "f" }, // knives -> knife
      { pattern: /xes$/i, replacement: "x" }, // boxes -> box
      { pattern: /ches$/i, replacement: "ch" }, // peaches -> peach
      { pattern: /shes$/i, replacement: "sh" }, // dishes -> dish
      { pattern: /s$/i, replacement: "" }, // cats -> cat
    ];

    for (const rule of pluralRules) {
      if (rule.pattern.test(word)) {
        return word.replace(rule.pattern, rule.replacement);
      }
    }

    return word;
  }

  /**
   * Calculate fuzzy match score between two sets of words
   *
   * @param spokenWords - Words from spoken text
   * @param ingredientWords - Words from ingredient name
   * @returns Match score between 0 and 1
   */
  private calculateFuzzyScore(spokenWords: string[], ingredientWords: string[]): number {
    if (spokenWords.length === 0 || ingredientWords.length === 0) {
      return 0;
    }

    // Count matching words (partial matches allowed)
    const matchingWords = spokenWords.filter((spokenWord) =>
      ingredientWords.some(
        (ingWord) =>
          spokenWord === ingWord ||
          spokenWord.includes(ingWord) ||
          ingWord.includes(spokenWord)
      )
    );

    if (matchingWords.length === 0) {
      return 0;
    }

    // Score based on proportion of matching words
    const maxWords = Math.max(spokenWords.length, ingredientWords.length);
    return matchingWords.length / maxWords;
  }

  /**
   * Calculate match score between spoken text and ingredient name
   *
   * @param spoken - The spoken text (cleaned)
   * @param ingredientName - The ingredient name
   * @returns Match score between 0 and 1
   */
  private calculateMatchScore(spoken: string, ingredientName: string): number {
    // Direct match
    if (spoken === ingredientName.toLowerCase()) {
      return 1.0;
    }

    // Use existing isIngredientMatch utility (handles synonyms and variations)
    if (isIngredientMatch(spoken, ingredientName)) {
      return 0.95;
    }

    // Contains match (partial match)
    if (
      spoken.includes(ingredientName.toLowerCase()) ||
      ingredientName.toLowerCase().includes(spoken)
    ) {
      return 0.85;
    }

    // Normalize and compare using fuzzy matching with plural handling
    const spokenWords = this.normalizeIngredientName(spoken);
    const ingredientWords = this.normalizeIngredientName(ingredientName);

    const fuzzyScore = this.calculateFuzzyScore(spokenWords, ingredientWords);
    if (fuzzyScore > 0) {
      return fuzzyScore * 0.9; // Scale down slightly for fuzzy matches
    }

    // Fallback: simple word-based matching without normalization
    const simpleSpokenWords = spoken.toLowerCase().split(/\s+/);
    const simpleIngredientWords = ingredientName.toLowerCase().split(/\s+/);

    const simpleScore = this.calculateFuzzyScore(
      simpleSpokenWords,
      simpleIngredientWords
    );
    if (simpleScore > 0) {
      return simpleScore * 0.7; // Lower score for simple match
    }

    return 0;
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
      const temps = this.extractTemperaturesFromText(
        `${step.title} ${step.description}`
      );
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
      const temps = this.extractTemperaturesFromText(
        `${step.title} ${step.description}`
      );
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
    return Math.round((value * 9 / 5) + 32);
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
      step: [
        "Try saying 'explain this step'",
        "Try saying 'what do I do'",
        "Try saying 'repeat'",
      ],
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
