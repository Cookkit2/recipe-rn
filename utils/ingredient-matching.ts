/**
 * Determines if a pantry item matches a recipe ingredient by name and optional synonyms.
 *
 * Matching order: direct name equality → synonym list (DB) → substring contains →
 * key-word extraction (ignoring modifiers like "fresh", "diced") → built-in synonym map.
 *
 * @param pantryItemName - Display name of the pantry item
 * @param recipeIngredientName - Ingredient name from the recipe
 * @param pantryItemSynonyms - Optional list of synonyms for the pantry item (e.g. from DB)
 * @returns true if the pantry item is considered a match for the recipe ingredient
 *
 * @example
 * isIngredientMatch("Chicken Breast", "chicken breast", []); // true
 * isIngredientMatch("Milk", "whole milk", ["whole milk"]);    // true (synonym)
 */

// Optimization: Pre-compile regex and extract it outside the function
// to avoid recompilation on every call
const STOP_WORDS_REGEX =
  /\b(fresh|frozen|canned|dried|cooked|raw|organic|whole|sliced|diced|chopped|steamed|boiled|fried|grilled)\b/g;

// Optimization: Pre-define the synonym map outside the function
// to avoid object allocation and Object.entries overhead on every call
const SYNONYM_MAP_ENTRIES = Object.entries({
  rice: ["white rice", "steamed rice", "jasmine rice", "basmati rice"],
  chicken: ["chicken breast", "chicken thigh", "chicken leg"],
  beef: ["ground beef", "beef steak", "beef roast"],
  tomato: ["cherry tomato", "roma tomato", "beef tomato"],
  onion: ["yellow onion", "white onion", "red onion"],
  pepper: ["bell pepper", "green pepper", "red pepper"],
  cheese: ["cheddar cheese", "mozzarella cheese", "parmesan cheese"],
});

export const isIngredientMatch = (
  pantryItemName: string,
  recipeIngredientName: string,
  pantryItemSynonyms: string[] = []
): boolean => {
  const pantryName = pantryItemName.toLowerCase().trim();
  const recipeName = recipeIngredientName.toLowerCase().trim();

  // Direct match
  if (pantryName === recipeName) return true;

  // Check provided synonyms (from database)
  if (pantryItemSynonyms.length > 0) {
    const isSynonymMatch = pantryItemSynonyms.some((synonym) => {
      const syn = synonym.toLowerCase().trim();
      return syn === recipeName || recipeName.includes(syn) || syn.includes(recipeName);
    });
    if (isSynonymMatch) return true;
  }

  // Contains match (existing logic)
  if (pantryName.includes(recipeName) || recipeName.includes(pantryName)) return true;

  // Extract key words and remove common modifiers
  const extractKeyWords = (name: string): string[] => {
    return name
      .replace(STOP_WORDS_REGEX, "")
      .split(/[\s,\-()]+/)
      .filter((word) => word.length > 2) // Filter out short words
      .map((word) => word.trim());
  };

  const pantryWords = extractKeyWords(pantryName);
  const recipeWords = extractKeyWords(recipeName);

  // Check if any significant words match
  const hasCommonKeyWord = pantryWords.some((pantryWord) =>
    recipeWords.some(
      (recipeWord) =>
        pantryWord === recipeWord ||
        pantryWord.includes(recipeWord) ||
        recipeWord.includes(pantryWord)
    )
  );

  // Optimization: return early before checking synonyms if we already matched
  if (hasCommonKeyWord) return true;

  // Check synonyms
  for (const [baseWord, synonyms] of SYNONYM_MAP_ENTRIES) {
    const pantryContainsBase = pantryWords.some((word) => word.includes(baseWord));
    const pantryContainsSynonym = synonyms.some((synonym) => pantryName.includes(synonym));

    // Optimization: only check recipe words if pantry matched
    if (pantryContainsBase || pantryContainsSynonym) {
      const recipeContainsBase = recipeWords.some((word) => word.includes(baseWord));
      const recipeContainsSynonym = synonyms.some((synonym) => recipeName.includes(synonym));

      if (recipeContainsBase || recipeContainsSynonym) {
        return true;
      }
    }
  }

  return false;
};
