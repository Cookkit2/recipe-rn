import type { Recipe } from "../types/Recipe";

/** Explicit allowlist: no owner, pantry IDs, favorites, ratings or local file paths. */
export interface RecipeShareSnapshot {
  version: 1;
  title: string;
  description: string;
  imageUrl: string;
  sourceUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  difficultyStars: number;
  servings: number;
  calories?: number;
  tags: string[];
  ingredients: { name: string; quantity: number; unit: string; notes?: string }[];
  instructions: { step: number; title: string; description: string }[];
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid recipe");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, required = false): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    throw new Error("Invalid recipe text");
  }
  return value.trim();
}
function number(value: unknown, max: number, min = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error("Invalid recipe quantity");
  }
  return value;
}
function webUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

/** Validate untrusted API data and discard every field outside the public contract. */
export function parseRecipeShareSnapshot(value: unknown): RecipeShareSnapshot {
  const data = record(value);
  if (data.version !== 1) throw new Error("Unsupported shared recipe");
  if (!Array.isArray(data.ingredients) || !data.ingredients.length || data.ingredients.length > 200)
    throw new Error("Invalid recipe ingredients");
  if (
    !Array.isArray(data.instructions) ||
    !data.instructions.length ||
    data.instructions.length > 100
  )
    throw new Error("Invalid recipe instructions");
  if (!Array.isArray(data.tags) || data.tags.length > 30) throw new Error("Invalid recipe tags");
  const sourceUrl = webUrl(data.sourceUrl);
  return {
    version: 1,
    title: text(data.title, 300, true),
    description: text(data.description, 10000),
    imageUrl: webUrl(data.imageUrl),
    ...(sourceUrl ? { sourceUrl } : {}),
    prepMinutes: number(data.prepMinutes, 10080),
    cookMinutes: number(data.cookMinutes, 10080),
    difficultyStars: number(data.difficultyStars, 5, 1),
    servings: number(data.servings, 1000, 0.01),
    ...(data.calories === undefined ? {} : { calories: number(data.calories, 1000000) }),
    tags: data.tags.map((tag) => text(tag, 100, true)),
    ingredients: data.ingredients.map((item) => {
      const row = record(item);
      return {
        name: text(row.name, 300, true),
        quantity: number(row.quantity, 1000000),
        unit: text(row.unit, 100),
        ...(row.notes === undefined ? {} : { notes: text(row.notes, 2000) }),
      };
    }),
    instructions: data.instructions.map((item, index) => {
      const row = record(item);
      return {
        step: index + 1,
        title: text(row.title, 300),
        description: text(row.description, 10000, true),
      };
    }),
  };
}

export function buildRecipeShareSnapshot(recipe: Recipe): RecipeShareSnapshot {
  const snapshot = parseRecipeShareSnapshot({
    ...recipe,
    version: 1,
    prepMinutes: recipe.prepMinutes ?? 0,
    cookMinutes: recipe.cookMinutes ?? 0,
    difficultyStars: recipe.difficultyStars ?? 1,
    servings: recipe.servings ?? 1,
    // WatermelonDB represents absent optional columns as null on persisted recipes.
    calories: recipe.calories ?? undefined,
    tags: recipe.tags ?? [],
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      notes: ingredient.notes ?? undefined,
    })),
  });
  if (new TextEncoder().encode(JSON.stringify(snapshot)).byteLength > 128000) {
    throw new Error("This recipe is too large to share as a link.");
  }
  return snapshot;
}
