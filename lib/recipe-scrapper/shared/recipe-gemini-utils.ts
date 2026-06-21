/**
 * Shared Gemini recipe utilities.
 *
 * Provides the common JSON schema for recipe generation, ingredient normalisation,
 * and step normalisation used by both WebsiteRecipeService and RecipeAnalyzer.
 */

import type { GeneratedRecipe } from "~/types/ScrappedRecipe";

// ─── Recipe JSON Schema for Gemini ───────────────────────────────────

/**
 * The response schema used when asking Gemini to return structured recipe data.
 * Both WebsiteRecipeService (cleanRecipeWithGemini) and RecipeAnalyzer (analyzeForRecipe)
 * use this same shape.
 */
export function getRecipeResponseSchema() {
  return {
    type: "object" as const,
    properties: {
      title: { type: "string" as const },
      description: { type: "string" as const },
      prepMinutes: { type: "integer" as const },
      cookMinutes: { type: "integer" as const },
      servings: { type: "integer" as const },
      difficultyStars: { type: "integer" as const },
      calories: { type: "integer" as const },
      tags: {
        type: "array" as const,
        items: { type: "string" as const },
      },
      ingredients: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            quantity: { type: "number" as const },
            unit: { type: "string" as const },
            notes: { type: "string" as const },
          },
          required: ["name", "quantity", "unit"],
        },
      },
      steps: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            step: { type: "integer" as const },
            title: { type: "string" as const },
            description: { type: "string" as const },
          },
          required: ["step", "title", "description"],
        },
      },
    },
    required: [
      "title",
      "description",
      "prepMinutes",
      "cookMinutes",
      "servings",
      "difficultyStars",
      "ingredients",
      "steps",
    ],
  };
}

/**
 * Full analysis response schema (includes isCookingVideo + confidence wrapper).
 */
export function getAnalysisResponseSchema() {
  return {
    type: "object" as const,
    properties: {
      isCookingVideo: { type: "boolean" as const },
      confidence: { type: "number" as const },
      errorMessage: { type: "string" as const },
      recipe: {
        type: "object" as const,
        properties: getRecipeResponseSchema().properties,
        required: getRecipeResponseSchema().required,
      },
    },
    required: ["isCookingVideo", "confidence"],
  };
}

// ─── Normalisation helpers ───────────────────────────────────────────

/**
 * Normalise ingredient data to ensure consistency.
 */
export function normalizeIngredients(
  ingredients: GeneratedRecipe["ingredients"] | undefined
): GeneratedRecipe["ingredients"] {
  if (!ingredients || !Array.isArray(ingredients)) {
    return [];
  }

  return ingredients.map((ing) => ({
    name: (ing.name || "Unknown ingredient").trim().toLowerCase(),
    quantity: ing.quantity ?? 1,
    unit: (ing.unit || "piece").trim().toLowerCase(),
    notes: ing.notes?.trim(),
  }));
}

/**
 * Normalise step data and ensure proper ordering.
 */
export function normalizeSteps(
  steps: GeneratedRecipe["steps"] | undefined
): GeneratedRecipe["steps"] {
  if (!steps || !Array.isArray(steps)) {
    return [];
  }

  return steps.map((step, index) => ({
    step: step.step || index + 1,
    title: (step.title || `Step ${index + 1}`).trim(),
    description: (step.description || "").trim(),
  }));
}

/**
 * Shared Gemini generation config for structured recipe responses.
 */
export function getRecipeGenerationConfig(temperature: number = 0.3) {
  return {
    responseMimeType: "application/json",
    responseSchema: getAnalysisResponseSchema(),
    temperature,
  };
}

/**
 * Build a text-only Gemini request body for recipe analysis.
 */
export function buildTextRecipeRequestBody(prompt: string, temperature: number = 0.3) {
  return JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: getRecipeGenerationConfig(temperature),
  });
}
