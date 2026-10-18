import {
  analyzePantryDiet,
  rankRecipes,
  suggestMeals,
  type CatalogRecipe,
  type DietProfile,
  type PantryItem,
} from "../tools/planning";

const pantry: PantryItem[] = [
  {
    id: "1",
    name: "chicken breast",
    quantity: 1,
    unit: "lb",
    expiryDate: null,
    householdId: null,
    addedByUserId: "user-1",
  },
  {
    id: "2",
    name: "milk",
    quantity: 1,
    unit: "cup",
    expiryDate: null,
    householdId: null,
    addedByUserId: "user-1",
  },
];

const vegan: DietProfile = {
  diet: "vegan",
  allergens: ["peanuts"],
  macroTarget: null,
  source: "device",
};

const pasta: CatalogRecipe = {
  id: "r1",
  title: "Tomato pasta",
  tags: ["vegan"],
  allergens: [],
  calories: 400,
  protein: 12,
  carbs: 60,
  fat: 8,
  fiber: 4,
  servings: 2,
  cookMinutes: 20,
  ingredients: [
    { name: "pasta", quantity: 200, unit: "g" },
    { name: "tomato", quantity: 2, unit: null },
  ],
};

const stew: CatalogRecipe = {
  id: "r2",
  title: "Chicken stew",
  tags: ["high-protein"],
  allergens: ["milk"],
  calories: 500,
  protein: 40,
  carbs: 10,
  fat: 20,
  fiber: 2,
  servings: 2,
  cookMinutes: 40,
  ingredients: [
    { name: "chicken breast", quantity: 1, unit: "lb" },
    { name: "milk", quantity: 1, unit: "cup" },
  ],
};

it("flags pantry items that conflict with a diet or allergen", () => {
  const analysis = analyzePantryDiet(pantry, vegan);
  expect(analysis.conflicts.map((conflict) => conflict.name).sort()).toEqual([
    "chicken breast",
    "milk",
  ]);
  expect(analysis.note).toContain("not a certification");
});

it("ranks pantry overlap and drops recipes that miss the diet tag", () => {
  const ranked = rankRecipes([stew, pasta], ["tomato", "pasta"], vegan, 5);
  expect(ranked.map((recipe) => recipe.id)).toEqual(["r1"]);
  expect(ranked[0]?.coverage).toBe(1);
});

it("fills meal slots without repeating a recipe", () => {
  const plan = suggestMeals({
    recipes: [pasta, stew],
    pantryNames: ["tomato", "pasta", "chicken breast"],
    profile: { diet: null, allergens: [], macroTarget: { calories: 1800 }, source: "none" },
    days: 1,
    slots: ["lunch", "dinner"],
  });
  expect(plan.meals).toHaveLength(2);
  expect(new Set(plan.meals.map((meal) => meal.recipeId)).size).toBe(2);
  expect(plan.unfilled).toBe(0);
});
