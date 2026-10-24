/**
 * Shared Nebius recipe utilities.
 *
 * Provides the common JSON schema for recipe generation, ingredient normalisation,
 * and step normalisation used by both WebsiteRecipeService and RecipeAnalyzer.
 */

import type { AIRequest } from "~/lib/ai/types";
import type { GeneratedRecipe } from "~/types/ScrappedRecipe";

// ─── Recipe JSON Schema for Nebius ───────────────────────────────────

/**
 * The response schema used when asking Nebius to return structured recipe data.
 * Both WebsiteRecipeService (cleanRecipeWithAI) and RecipeAnalyzer (analyzeForRecipe)
 * use this same shape.
 */
export function getRecipeResponseSchema() {
  return {
    type: "object" as const,
    properties: {
      title: { type: "string" as const, minLength: 1 },
      description: { type: "string" as const },
      prepMinutes: { type: "integer" as const, minimum: 0 },
      cookMinutes: { type: "integer" as const, minimum: 0 },
      servings: { type: "integer" as const, minimum: 1 },
      difficultyStars: { type: "integer" as const, minimum: 1, maximum: 5 },
      calories: { type: ["integer", "null"], minimum: 0 },
      tags: {
        type: "array" as const,
        items: { type: "string" as const },
      },
      ingredients: {
        type: "array" as const,
        minItems: 1,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const, minLength: 1 },
            quantity: { type: "number" as const, minimum: 0 },
            unit: { type: "string" as const, minLength: 1 },
            notes: { type: ["string", "null"] },
          },
          required: ["name", "quantity", "unit"],
        },
      },
      steps: {
        type: "array" as const,
        minItems: 1,
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
      isCookingVideo: {
        type: "boolean" as const,
        description:
          "True if the supplied content contains a recipe, including plain text or captions. This legacy field does not require video input.",
      },
      confidence: { type: "number" as const, minimum: 0, maximum: 1 },
      errorMessage: { type: "string" as const },
      recipe: {
        type: "object" as const,
        properties: getRecipeResponseSchema().properties,
        required: getRecipeResponseSchema().required,
      },
    },
    required: ["isCookingVideo", "confidence"],
    if: { properties: { isCookingVideo: { const: true } } },
    then: { required: ["recipe"] },
    else: { not: { required: ["recipe"] } },
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

/** Build the shared text-only recipe analysis request. The server selects Nano. */
export function buildTextRecipeRequest(prompt: string): AIRequest {
  return {
    prompt,
    systemPrompt:
      "Extract recipes only from the supplied content. isCookingVideo is a legacy field: set it true when captions, transcripts, descriptions, website content or plain text contain ingredients and preparation instructions. Set it false and omit recipe when actual recipe content is absent. Do not claim to watch videos or open links yourself.",
    responseSchema: getAnalysisResponseSchema(),
  };
}

/** Social/video drafts may contain an explicitly unknown ingredient unit for review. */
export function buildSocialRecipeRequest(prompt: string): AIRequest {
  const responseSchema = getAnalysisResponseSchema();
  const ingredient = responseSchema.properties.recipe.properties.ingredients.items;
  ingredient.properties.unit = { type: "string", minLength: 0 };
  Object.assign(responseSchema.properties.recipe.properties.steps.items.properties.description, {
    description:
      "Copy the exact preparation instruction from the supplied caption, transcript or frame observations. Do not add cooking knowledge or rewrite it.",
  });
  return { ...buildTextRecipeRequest(prompt), responseSchema };
}
