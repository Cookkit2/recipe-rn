import { ingredientClarification, normalizeIngredientIdentity } from "./ingredient-identity";

/** Recipe compatibility ignores cutting instructions, preserving varieties and food forms. */
export function normalizeRecipeIngredient(name: string): string {
  return normalizeIngredientIdentity(
    name
      .replace(/\b(fresh|organic|chopped|diced|minced|sliced|grated|peeled)\b/gi, "")
      .replace(/[,()]/g, " ")
  );
}

export function matchesRecipeIngredient(
  stock: string,
  recipe: string,
  aliases: readonly (string | { synonym: string })[] = []
): boolean {
  const key = normalizeRecipeIngredient(recipe);
  if (!key || ingredientClarification(stock) || ingredientClarification(recipe)) return false;
  return [
    stock,
    ...aliases.map((alias) => (typeof alias === "string" ? alias : alias.synonym)),
  ].some((name) => !ingredientClarification(name) && normalizeRecipeIngredient(name) === key);
}

function normalizeDietaryPhrase(value: string): string {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(normalizeIngredientIdentity)
    .join(" ");
}

/** Dietary screening is deliberately a separate, whole-word containment policy. */
export function containsIngredientPhrase(name: string, phrase: string): boolean {
  const key = normalizeDietaryPhrase(phrase);
  return Boolean(key) && ` ${normalizeDietaryPhrase(name)} `.includes(` ${key} `);
}
