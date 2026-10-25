import pluralize from "pluralize";

// Food names that a general English inflector can mistake for plurals.
const INVARIANT_FOODS = new Set([
  "asparagus",
  "couscous",
  "hummus",
  "molasses",
  "watercress",
  "cress",
  "bass",
]);
const ALIASES: Readonly<Record<string, string>> = {
  aubergine: "eggplant",
  courgette: "zucchini",
  chilli: "chili",
};

/** Full-name identity: grammatical variants and explicit aliases only; preserve modifiers. */
export function normalizeIngredientIdentity(name: string): string {
  const normalized = name
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[-‐‑]/g, " ")
    .replace(/\s+/g, " ");
  return normalized
    .split(/ (of|in) /)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      const words = part.split(" ");
      // Inflect noun heads, never adjectives (Swiss cheese, Brussels sprouts).
      const last = words.pop() ?? "";
      words.push(
        INVARIANT_FOODS.has(last)
          ? last
          : pluralize.singular(last === "chillies" || last === "chilies" ? "chili" : last)
      );
      const key = words.join(" ");
      return ALIASES[key] ?? key;
    })
    .join(" ");
}

export function isSameIngredient(
  left: string,
  right: string,
  aliases: readonly string[] = []
): boolean {
  const key = normalizeIngredientIdentity(right);
  return (
    Boolean(key) && [left, ...aliases].some((name) => normalizeIngredientIdentity(name) === key)
  );
}

const CATEGORIES = new Set([
  "item",
  "stuff",
  "thing",
  "vegetable",
  "veggie",
  "veggy",
  "veg",
  "dairy product",
  "food item",
  "pantry ingredient",
  "pantry item",
  "cooking ingredient",
  "fruit",
  "meat",
  "seafood",
  "fish",
  "dairy",
  "protein",
  "produce",
  "food",
  "ingredient",
  "grocery",
  "herb",
  "spice",
  "condiment",
  "seasoning",
  "snack",
  "grain",
  "oil",
]);
const CATEGORY_MODIFIERS =
  /\b(some|few|a|an|the|fresh|frozen|canned|dried|organic|assorted|various|green|leafy|mixed|other)\b/g;

/** A known category needs clarification; unknown specific foods remain usable offline. */
export function ingredientClarification(name: string): string | null {
  const normalized = normalizeIngredientIdentity(
    name.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
  );
  if (!normalized) return "Which ingredient would you like to add?";
  if (
    /^(?:(?:fresh|frozen|canned|dried|organic) )*mixed (?:vegetable|fruit|berry|nut|herb|spice)$/.test(
      normalized
    )
  )
    return null;
  const category = normalized.replace(CATEGORY_MODIFIERS, "").trim().replace(/\s+/g, " ");
  return !category || CATEGORIES.has(category)
    ? "Which specific ingredient would you like to add?"
    : null;
}

const UNIT_ALIASES: Readonly<Record<string, string>> = {
  count: "count",
  pc: "count",
  pcs: "count",
  piece: "count",
  item: "count",
  unit: "count",
  gram: "g",
  kilogram: "kg",
  milliliter: "ml",
  millilitre: "ml",
  liter: "l",
  litre: "l",
  ounce: "oz",
  pound: "lb",
  teaspoon: "tsp",
  tablespoon: "tbsp",
};

/** Equivalent unit spellings only. No guessed mass/count or container conversions. */
export function normalizeStockUnit(unit: string): string {
  const key = pluralize.singular(unit.toLowerCase().trim());
  return UNIT_ALIASES[key] ?? key;
}
