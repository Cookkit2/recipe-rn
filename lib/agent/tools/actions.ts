import type { CookingDataClient } from "./planning";
import { analyzePantryDiet, rankRecipes, suggestMeals } from "./planning";

const CATALOG_DATA_NOTE =
  "Allergen checks use ingredient names; catalog allergen labels and macro nutrition are unavailable. Do not claim recipes are allergen-free or invent macro values.";

const DEFAULT_SLOTS = ["lunch", "dinner"] as const;

export async function runManageIngredients(
  data: CookingDataClient,
  input: {
    action: "add" | "remove";
    name?: string;
    quantity?: number;
    unit?: string;
    stockId?: string;
  }
) {
  if (input.action === "add") {
    const name = input.name?.trim() ?? "";
    if (!name) return { ok: false as const, error: "An ingredient name is required." };
    return data.addIngredient({
      name,
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.unit ? { unit: input.unit } : {}),
    });
  }
  return data.removeIngredient({
    ...(input.name ? { name: input.name } : {}),
    ...(input.stockId ? { stockId: input.stockId } : {}),
  });
}

export async function runAnalyzeDiet(data: CookingDataClient) {
  const [pantry, profile] = await Promise.all([data.listPantry(), data.getDietProfile()]);
  return analyzePantryDiet(pantry, profile);
}

export async function runSuggestRecipes(data: CookingDataClient, input: { limit?: number }) {
  const [pantry, profile, catalog] = await Promise.all([
    data.listPantry(),
    data.getDietProfile(),
    data.listRecipes(),
  ]);
  const limit = input.limit ?? 5;
  const recipes = rankRecipes(
    catalog.recipes,
    pantry.map((item) => item.name),
    profile,
    limit
  ).map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    coverage: recipe.coverage,
    matched: recipe.matched,
    missing: recipe.missing,
    calories: recipe.calories,
    tags: recipe.tags,
  }));
  return {
    recipes,
    truncated: catalog.truncated,
    pantryCount: pantry.length,
    note: CATALOG_DATA_NOTE,
  };
}

export async function runSuggestMealPlan(
  data: CookingDataClient,
  input: { days?: number; slots?: string[] }
) {
  const days = input.days ?? 3;
  const slots = input.slots && input.slots.length > 0 ? input.slots : [...DEFAULT_SLOTS];
  const [pantry, profile, catalog] = await Promise.all([
    data.listPantry(),
    data.getDietProfile(),
    data.listRecipes(),
  ]);
  const plan = suggestMeals({
    recipes: catalog.recipes,
    pantryNames: pantry.map((item) => item.name),
    profile,
    days,
    slots,
  });
  const calories = plan.meals.reduce((sum, meal) => sum + (meal.calories ?? 0), 0);
  return {
    ...plan,
    calories,
    macroTarget: profile.macroTarget,
    persisted: false,
    note: `Suggestions only. Meal plans stay in the on-device calendar and were not saved. ${CATALOG_DATA_NOTE}`,
    truncated: catalog.truncated,
  };
}
