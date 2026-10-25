import type { CookingDataClient, PantryItem } from "../tools/planning";
import { runManageIngredients, runSuggestMealPlan, runSuggestRecipes } from "../tools/actions";

function pantryItem(name: string, id = name): PantryItem {
  return {
    id,
    name,
    quantity: 1,
    unit: null,
    expiryDate: null,
    householdId: null,
    addedByUserId: "user-1",
  };
}

function createFakeData(): CookingDataClient & { added: string[] } {
  const items = [pantryItem("tomato")];
  return {
    added: [],
    async listPantry() {
      return items;
    },
    async addIngredient(input) {
      this.added.push(input.name);
      const item = pantryItem(input.name);
      items.push(item);
      return { ok: true, item };
    },
    async removeIngredient(input) {
      const removed = items.filter((item) => item.name === input.name);
      return { ok: true, removed };
    },
    async getDietProfile() {
      return { diet: null, allergens: [], macroTarget: null, source: "none" };
    },
    async listRecipes() {
      return {
        truncated: false,
        recipes: [
          {
            id: "r1",
            title: "Tomato salad",
            tags: [],
            allergens: [],
            calories: 100,
            protein: 2,
            carbs: 8,
            fat: 4,
            fiber: 2,
            servings: 1,
            cookMinutes: 10,
            ingredients: [{ name: "tomato", quantity: 1, unit: null }],
          },
        ],
      };
    },
  };
}

it("adds an ingredient through the pantry client", async () => {
  const data = createFakeData();
  const result = await runManageIngredients(data, { action: "add", name: " eggs ", quantity: 6 });
  expect(result).toMatchObject({ ok: true, item: { name: "eggs" } });
  expect(data.added).toEqual(["eggs"]);
});

it("refuses an add without a name", async () => {
  const data = createFakeData();
  await expect(runManageIngredients(data, { action: "add", name: " " })).resolves.toEqual({
    ok: false,
    error: "An ingredient name is required.",
  });
});

it("suggests the recipe that matches the pantry", async () => {
  const data = createFakeData();
  const result = await runSuggestRecipes(data, { limit: 3 });
  expect(result.recipes[0]?.title).toBe("Tomato salad");
  expect(result.recipes[0]?.coverage).toBe(1);
});

it.each(["recipes", "meals"] as const)(
  "discloses unavailable catalog metadata for %s",
  async (kind) => {
    const data = createFakeData();
    const result =
      kind === "recipes" ? await runSuggestRecipes(data, {}) : await runSuggestMealPlan(data, {});
    expect(result.note).toContain("Allergen checks use ingredient names");
    expect(result.note).toContain("macro nutrition are unavailable");
  }
);

it("returns complete missing ingredient lists for partial matches", async () => {
  const data = createFakeData();
  const original = await data.listRecipes();
  const recipe = original.recipes[0]!;
  data.listRecipes = async () => ({
    truncated: false,
    recipes: [
      {
        ...recipe,
        ingredients: [
          ...recipe.ingredients,
          ...Array.from({ length: 12 }, (_, i) => ({
            name: `extra ${i}`,
            quantity: 1,
            unit: null,
          })),
        ],
      },
    ],
  });
  const result = await runSuggestRecipes(data, {});
  expect(result.recipes[0]?.missing).toHaveLength(12);
});
