import type {
  AssistantPantryInput,
  AssistantPantryResult,
  PantryWriteResult,
  PantryRemovalResult,
} from "~/types/AssistantPantryMutation";
import { matchesRecipeIngredient } from "~/utils/recipe-ingredient-match";

export interface PantryItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  expiryDate: string | null;
  householdId: string | null;
  addedByUserId: string | null;
}

export interface DietProfile {
  diet: string | null;
  allergens: string[];
  macroTarget: {
    calories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  } | null;
  source: "device" | "supabase" | "merged" | "none";
}

export interface CatalogIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface CatalogRecipe {
  id: string;
  title: string;
  tags: string[];
  allergens: string[];
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  servings: number | null;
  cookMinutes: number | null;
  ingredients: CatalogIngredient[];
}

export interface CookingDataClient {
  managePantry?(input: AssistantPantryInput): Promise<AssistantPantryResult<PantryItem>>;
  listPantry(): Promise<PantryItem[]>;
  addIngredient(input: {
    name: string;
    quantity?: number;
    unit?: string;
    stockId?: string;
  }): Promise<PantryWriteResult<PantryItem>>;
  removeIngredient(input: {
    name?: string;
    stockId?: string;
  }): Promise<PantryRemovalResult<PantryItem>>;
  getDietProfile(): Promise<DietProfile>;
  listRecipes(): Promise<{ recipes: CatalogRecipe[]; truncated: boolean }>;
}

export const EMPTY_DIET_PROFILE: DietProfile = {
  diet: null,
  allergens: [],
  macroTarget: null,
  source: "none",
};

const DIET_AVOID: Record<string, string[]> = {
  vegan: [
    "beef",
    "pork",
    "chicken",
    "turkey",
    "lamb",
    "fish",
    "salmon",
    "tuna",
    "shrimp",
    "milk",
    "cheese",
    "butter",
    "cream",
    "yogurt",
    "egg",
    "honey",
    "gelatin",
  ],
  vegetarian: ["beef", "pork", "chicken", "turkey", "lamb", "fish", "salmon", "tuna", "shrimp"],
  pescatarian: ["beef", "pork", "chicken", "turkey", "lamb"],
  halal: ["pork", "bacon", "ham", "gelatin", "alcohol", "wine", "beer"],
  kosher: ["pork", "bacon", "ham", "shellfish", "shrimp", "crab"],
};

const ALLERGEN_WORDS: Record<string, string[]> = {
  milk: ["milk", "cheese", "butter", "cream", "yogurt"],
  eggs: ["egg"],
  nuts: ["almond", "walnut", "pecan", "cashew", "pistachio", "hazelnut"],
  fish: ["fish", "salmon", "tuna", "cod"],
  shellfish: ["shrimp", "crab", "lobster", "prawn"],
  wheat: ["wheat", "flour", "bread", "pasta"],
  soy: ["soy", "tofu", "edamame"],
  peanuts: ["peanut"],
  sesame: ["sesame", "tahini"],
};

function normalizeDietWords(value: string): string {
  return value.toLowerCase().replace(/\b([a-z]+)s\b/g, (word, stem: string) => {
    if (word.endsWith("ss")) return word;
    if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
    return stem;
  });
}

function includesWord(haystack: string, needle: string): boolean {
  const escaped = normalizeDietWords(needle).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(normalizeDietWords(haystack));
}

export function dietConflicts(name: string, profile: DietProfile): string[] {
  const reasons: string[] = [];
  const diet = profile.diet?.toLowerCase() ?? "";
  const avoided = DIET_AVOID[diet] ?? [];
  for (const word of avoided) {
    if (includesWord(name, word)) {
      reasons.push(`may conflict with ${diet} (${word})`);
      break;
    }
  }
  for (const allergen of profile.allergens) {
    const key = allergen.toLowerCase();
    const words = ALLERGEN_WORDS[key] ?? [key];
    if (words.some((word) => includesWord(name, word))) {
      reasons.push(`matches allergen ${allergen}`);
    }
  }
  return reasons;
}

export interface DietAnalysis {
  profile: DietProfile;
  pantryCount: number;
  conflicts: { id: string; name: string; reasons: string[] }[];
  note: string;
}

export function analyzePantryDiet(
  pantry: readonly PantryItem[],
  profile: DietProfile
): DietAnalysis {
  const conflicts = pantry.flatMap((item) => {
    const reasons = dietConflicts(item.name, profile);
    return reasons.length ? [{ id: item.id, name: item.name, reasons }] : [];
  });
  return {
    profile,
    pantryCount: pantry.length,
    conflicts,
    note: "Pantry rows do not store calories. This checks diet and allergen words in ingredient names, not a certification or a medical plan.",
  };
}

export interface ScoredRecipe extends CatalogRecipe {
  matched: string[];
  missing: string[];
  coverage: number;
}

export function scoreRecipe(recipe: CatalogRecipe, pantryNames: readonly string[]): ScoredRecipe {
  const matched: string[] = [];
  const missing: string[] = [];
  for (const ingredient of recipe.ingredients) {
    const name = ingredient.name.trim();
    if (!name) continue;
    const hit = pantryNames.some((pantryName) => matchesRecipeIngredient(pantryName, name));
    if (hit) matched.push(name);
    else missing.push(name);
  }
  const total = matched.length + missing.length;
  return {
    ...recipe,
    matched,
    missing,
    coverage: total === 0 ? 0 : matched.length / total,
  };
}

function recipeViolatesDiet(recipe: CatalogRecipe, profile: DietProfile): boolean {
  const diet = profile.diet?.toLowerCase();
  if (diet && diet !== "none") {
    const tags = recipe.tags.map((tag) => tag.toLowerCase());
    if (!tags.includes(diet)) return true;
  }
  for (const allergen of profile.allergens) {
    const listed = recipe.allergens.some((value) => value.toLowerCase() === allergen.toLowerCase());
    if (listed) return true;
    if (
      recipe.ingredients.some(
        (ingredient) => dietConflicts(ingredient.name, { ...profile, diet: null }).length
      )
    ) {
      return true;
    }
  }
  return false;
}

export function rankRecipes(
  recipes: readonly CatalogRecipe[],
  pantryNames: readonly string[],
  profile: DietProfile,
  limit: number
): ScoredRecipe[] {
  return recipes
    .filter((recipe) => !recipeViolatesDiet(recipe, profile))
    .map((recipe) => scoreRecipe(recipe, pantryNames))
    .filter((recipe) => recipe.coverage > 0)
    .sort((a, b) => b.coverage - a.coverage || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export interface MealSuggestion {
  day: number;
  slot: string;
  recipeId: string;
  title: string;
  coverage: number;
  calories: number | null;
}

export function suggestMeals(input: {
  recipes: readonly CatalogRecipe[];
  pantryNames: readonly string[];
  profile: DietProfile;
  days: number;
  slots: readonly string[];
}): { meals: MealSuggestion[]; unfilled: number } {
  const ranked = rankRecipes(
    input.recipes,
    input.pantryNames,
    input.profile,
    input.days * input.slots.length
  );
  const meals: MealSuggestion[] = [];
  let cursor = 0;
  for (let day = 1; day <= input.days; day += 1) {
    for (const slot of input.slots) {
      const recipe = ranked[cursor];
      cursor += 1;
      if (!recipe) continue;
      meals.push({
        day,
        slot,
        recipeId: recipe.id,
        title: recipe.title,
        coverage: recipe.coverage,
        calories: recipe.calories,
      });
    }
  }
  return { meals, unfilled: input.days * input.slots.length - meals.length };
}
