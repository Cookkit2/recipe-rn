import type { Recipe } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";
import type { Allergen } from "~/types/Allergen";
import type { Diet } from "~/types/Diet";
import type { Recipe as DbRecipe } from "~/data/db/models";

export const buildPantryHash = (pantryItems: PantryItem[]): string => {
  const normalized = pantryItems
    .map((item) => `${item.name.toLowerCase().trim()}|${item.quantity}|${item.unit}`)
    .sort()
    .join(";;");

  return simpleHash(normalized);
};

export const buildTailoredPrompt = (
  recipe: Recipe,
  pantryItems: PantryItem[],
  dietaryInfo: {
    diet?: Diet;
    allergens: Allergen[];
    otherAllergens: string[];
    appliances: string[];
  }
): string => {
  const availableIngredients = pantryItems
    .map((item) => `- ${item.name}: ${item.quantity} ${item.unit}`)
    .join("\n");

  const recipeIngredients = recipe.ingredients
    .map((ing) => {
      const notes = ing.notes ? ` (${ing.notes})` : "";
      return `- ${ing.name}: ${ing.quantity} ${ing.unit}${notes}`;
    })
    .join("\n");

  const recipeInstructions = recipe.instructions
    .map((step) => `${step.step}. ${step.title}: ${step.description}`)
    .join("\n");

  const diet = dietaryInfo.diet && dietaryInfo.diet !== "none" ? `Diet: ${dietaryInfo.diet}` : "";
  const allergens = dietaryInfo.allergens.length
    ? `Allergens: ${dietaryInfo.allergens.join(", ")}`
    : "";
  const otherAllergens = dietaryInfo.otherAllergens.length
    ? `Other allergens: ${dietaryInfo.otherAllergens.join(", ")}`
    : "";
  const appliances = dietaryInfo.appliances.length
    ? `Available cooking appliances: ${dietaryInfo.appliances.join(", ")}`
    : "";

  const dietaryLines = [diet, allergens, otherAllergens, appliances].filter(Boolean).join("\n");

  return `I have the following ingredients available:
${availableIngredients}

My dietary preferences:
${dietaryLines || "None"}

Base recipe:
- ${recipe.title}: ${recipe.description || "No description"}
  Ingredients:
${recipeIngredients}
  Instructions:
${recipeInstructions}

Please tweaked the instructions and recipe to adapt to the ingredients and its quantity that I have now.`;
};

export const parseTailoredRecipeResponse = (responseText: string, baseRecipe: Recipe): Recipe => {
  const cleaned = stripJsonFences(responseText);
  let parsed: Partial<Recipe> & {
    ingredients?: Array<{
      name?: string;
      quantity?: number;
      unit?: string;
      notes?: string | null;
    }>;
    instructions?: Array<{
      step?: number;
      title?: string;
      description?: string;
    }>;
  };

  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    throw new Error("Invalid tailored recipe response: failed to parse JSON");
  }

  if (!parsed || !parsed.title || !parsed.ingredients || !parsed.instructions) {
    throw new Error("Invalid tailored recipe response");
  }

  const ingredients = parsed.ingredients.map((ing, index) => ({
    name: ing.name || `ingredient-${index + 1}`,
    relatedIngredientId: `tailored-${baseRecipe.id}-${index + 1}`,
    quantity: typeof ing.quantity === "number" ? ing.quantity : 0,
    unit: ing.unit || "unit",
    notes: ing.notes ?? undefined,
  }));

  const instructions = parsed.instructions.map((step, index) => ({
    step: typeof step.step === "number" ? step.step : index + 1,
    title: step.title || `Step ${index + 1}`,
    description: step.description || "",
    relatedIngredientIds: [],
  }));

  const difficulty =
    typeof parsed.difficultyStars === "number"
      ? Math.min(5, Math.max(1, Math.round(parsed.difficultyStars)))
      : baseRecipe.difficultyStars;

  return {
    id: parsed.id || `tailored-${baseRecipe.id}`,
    title: parsed.title,
    description: parsed.description || baseRecipe.description,
    imageUrl: baseRecipe.imageUrl,
    prepMinutes:
      typeof parsed.prepMinutes === "number" ? parsed.prepMinutes : baseRecipe.prepMinutes,
    cookMinutes:
      typeof parsed.cookMinutes === "number" ? parsed.cookMinutes : baseRecipe.cookMinutes,
    servings: typeof parsed.servings === "number" ? parsed.servings : baseRecipe.servings,
    difficultyStars: difficulty,
    calories: typeof parsed.calories === "number" ? parsed.calories : baseRecipe.calories,
    tags: Array.isArray(parsed.tags) ? parsed.tags : baseRecipe.tags,
    ingredients,
    instructions,
    sourceUrl: baseRecipe.sourceUrl,
  };
};

export const convertDbTailoredRecipeToUIRecipe = (
  recipe: DbRecipe,
  steps: Array<{ step: number; title: string; description: string; id: string }>,
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
    id: string;
  }>,
  baseRecipe: Recipe
): Recipe => {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description || baseRecipe.description,
    imageUrl: recipe.imageUrl || baseRecipe.imageUrl,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    difficultyStars: recipe.difficultyStars,
    servings: recipe.servings,
    calories: recipe.calories ?? baseRecipe.calories,
    tags: recipe.tags || baseRecipe.tags,
    ingredients: ingredients.map((ing, index) => ({
      name: ing.name,
      relatedIngredientId: `tailored-${recipe.id}-${index + 1}`,
      quantity: ing.quantity,
      unit: ing.unit,
      notes: ing.notes,
    })),
    instructions: steps.map((step) => ({
      step: step.step,
      title: step.title,
      description: step.description,
      relatedIngredientIds: [],
    })),
    sourceUrl: baseRecipe.sourceUrl,
  };
};

const simpleHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return `h${Math.abs(hash)}`;
};

const stripJsonFences = (text: string): string => {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
};
