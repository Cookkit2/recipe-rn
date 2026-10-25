import {
  normalizeIngredientIdentity,
  isSameIngredient,
  ingredientClarification,
  normalizeStockUnit,
} from "../ingredient-identity";

describe("ingredient identity", () => {
  it.each([
    ["Eggs", "egg"],
    ["tomatoes", "tomato"],
    ["berries", "berry"],
    ["garlic cloves", "garlic clove"],
    ["chicken thighs", "chicken thigh"],
    ["  RED   ONIONS ", "red onion"],
    ["aubergines", "eggplant"],
    ["courgettes", "zucchini"],
    ["chillies", "chili"],
  ])("resolves %s to %s", (name, expected) => {
    expect(normalizeIngredientIdentity(name)).toBe(expected);
    expect(isSameIngredient(name, expected)).toBe(true);
  });

  it.each(["asparagus", "couscous", "hummus", "molasses", "watercress", "bass", "rice"])(
    "preserves %s",
    (name) => expect(normalizeIngredientIdentity(name)).toBe(name)
  );

  it.each([
    ["milk", "coconut milk"],
    ["tomato", "cherry tomato"],
    ["fresh tomato", "canned tomatoes"],
    ["onion", "red onion"],
    ["ground beef", "beef steak"],
    ["rice", "rice vinegar"],
    ["", ""],
  ])("does not merge %s with %s", (left, right) => {
    expect(isSameIngredient(left, right)).toBe(false);
  });

  it("accepts complete explicit aliases, without substring matching", () => {
    expect(isSameIngredient("scallion", "spring onions", ["spring onion"])).toBe(true);
    expect(isSameIngredient("scallion", "spring onion powder", ["spring onion"])).toBe(false);
  });
});

describe("pantry name validation", () => {
  it.each([
    "vegetables",
    "vegetable",
    "fresh vegetables",
    "fruits",
    "some spices",
    "meat",
    "food",
    "ingredients",
    "mixed ingredients",
    "organic produce",
  ])("asks for specifics for %s", (name) =>
    expect(ingredientClarification(name)).toEqual(expect.any(String))
  );
  it.each([
    "carrots",
    "milk",
    "mushrooms",
    "frozen mixed vegetables",
    "mixed berries",
    "garam masala",
    "dragon fruit",
    "rice vinegar",
    "fresh curry leaves",
    "tempeh",
  ])("allows %s", (name) => expect(ingredientClarification(name)).toBeNull());
  it("asks for a name when empty", () => expect(ingredientClarification(" ")).toBeTruthy());
});

it("normalizes equivalent units without equating containers or dimensions", () => {
  expect(["count", "pcs", "pieces", "item", "units"].map(normalizeStockUnit)).toEqual(
    Array(5).fill("count")
  );
  expect(normalizeStockUnit("grams")).toBe("g");
  expect(normalizeStockUnit("cartons")).not.toBe(normalizeStockUnit("liters"));
  expect(normalizeStockUnit("kg")).not.toBe(normalizeStockUnit("g"));
});

it.each(["vegetables!", "veggies", "a few vegetables", "dairy products", "pantry ingredients"])(
  "clarifies category paraphrase %s",
  (name) => {
    expect(ingredientClarification(name)).toBeTruthy();
  }
);

it.each([
  ["cloves of garlic", "clove of garlic"],
  ["tomatoes in juice", "tomato in juice"],
])("resolves noun complements: %s / %s", (left, right) => {
  expect(isSameIngredient(left, right)).toBe(true);
});
it("preserves adjectives while normalizing compound food names", () => {
  expect(normalizeIngredientIdentity("Brussels sprouts")).toBe("brussels sprout");
  expect(normalizeIngredientIdentity("Swiss cheese")).toBe("swiss cheese");
  expect(isSameIngredient("tomatoes in juice", "tomatoes in oil")).toBe(false);
});

it.each(["fresh", "greens", "items", "stuff", "things"])(
  "rejects a placeholder without a food identity: %s",
  (name) => {
    expect(ingredientClarification(name)).toBeTruthy();
  }
);
