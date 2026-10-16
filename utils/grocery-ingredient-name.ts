/** Conservative matching: complete names or explicit pantry synonyms, never keyword overlap. */
export function normalizeGroceryIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fresh|chopped|diced|minced|sliced|grated|peeled)\b/g, "")
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.endsWith("oes")) return word.slice(0, -2);
      if (word.endsWith("ies")) return word.slice(0, -3) + "y";
      if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
      return word;
    })
    .join(" ");
}
