import { matchesRecipeIngredient, containsIngredientPhrase } from "../recipe-ingredient-match";

it.each([
  ["Eggs", "egg"],
  ["tomatoes", "diced tomato"],
  ["fresh onions", "chopped onion"],
])("matches recipe preparation and plural forms: %s / %s", (stock, recipe) => {
  expect(matchesRecipeIngredient(stock, recipe)).toBe(true);
});

it.each([
  ["milk", "coconut milk"],
  ["tomato", "cherry tomato"],
  ["fresh tomato", "canned tomatoes"],
  ["ground beef", "beef steak"],
  ["jasmine rice", "basmati rice"],
  ["vegetables", "vegetable"],
  ["", ""],
])("does not invent recipe compatibility: %s / %s", (stock, recipe) => {
  expect(matchesRecipeIngredient(stock, recipe)).toBe(false);
});

it("matches full explicit synonyms", () => {
  expect(matchesRecipeIngredient("scallion", "spring onions", [{ synonym: "spring onion" }])).toBe(
    true
  );
  expect(matchesRecipeIngredient("scallion", "spring onion powder", ["spring onion"])).toBe(false);
});

it("uses whole phrase containment only for allergen scanning", () => {
  expect(containsIngredientPhrase("roasted celery seeds", "celery")).toBe(true);
  expect(containsIngredientPhrase("eggplant", "egg")).toBe(false);
  expect(containsIngredientPhrase("nutmeg", "nuts")).toBe(false);
});

it("preserves meaningful raw product names", () => {
  expect(matchesRecipeIngredient("raw sugar", "sugar")).toBe(false);
});

it.each(["Brussels sprouts", "aubergine powder"])(
  "never misses exact custom allergen %s",
  (name) => {
    expect(containsIngredientPhrase(name, name)).toBe(true);
    expect(containsIngredientPhrase(`roasted ${name}`, name)).toBe(true);
  }
);

it.each([
  ["tomato", "tomatoes, diced"],
  ["onion", "onion (chopped)"],
])("matches preparation punctuation: %s / %s", (stock, recipe) => {
  expect(matchesRecipeIngredient(stock, recipe)).toBe(true);
});
