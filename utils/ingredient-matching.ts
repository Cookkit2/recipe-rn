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

/** Check if two normalized names match directly or by substring containment. */
function matchesByNameOrSubstring(pantryName: string, recipeName: string): boolean {
  if (pantryName === recipeName) return true;
  return pantryName.includes(recipeName) || recipeName.includes(pantryName);
}

/** Check if any provided synonym matches the recipe ingredient name. */
function matchesByProvidedSynonyms(
  recipeName: string,
  pantryItemSynonyms: (string | { synonym: string })[]
): boolean {
  for (let i = 0; i < pantryItemSynonyms.length; i++) {
    const item = pantryItemSynonyms[i];
    if (item) {
      const synonymStr = typeof item === "string" ? item : item.synonym;
      if (synonymStr) {
        const syn = synonymStr.toLowerCase().trim();
        if (syn === recipeName || recipeName.includes(syn) || syn.includes(recipeName)) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Extract significant keywords by removing common modifiers and short words. */
function extractKeyWords(name: string): string[] {
  return name
    .replace(STOP_WORDS_REGEX, "")
    .split(/[\s,\-()]+/)
    .filter((word) => word.length > 2)
    .map((word) => word.trim());
}

/** Check if any significant keywords overlap between pantry and recipe names. */
function matchesByKeyWords(pantryWords: string[], recipeWords: string[]): boolean {
  return pantryWords.some((pantryWord) =>
    recipeWords.some(
      (recipeWord) =>
        pantryWord === recipeWord ||
        pantryWord.includes(recipeWord) ||
        recipeWord.includes(pantryWord)
    )
  );
}

/** Check built-in synonym map for a cross-match between pantry and recipe names. */
function matchesBySynonymMap(
  pantryName: string,
  recipeName: string,
  pantryWords: string[],
  recipeWords: string[]
): boolean {
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
}

export const isIngredientMatch = (
  pantryItemName: string,
  recipeIngredientName: string,
  pantryItemSynonyms: (string | { synonym: string })[] = []
): boolean => {
  const pantryName = pantryItemName.toLowerCase().trim();
  const recipeName = recipeIngredientName.toLowerCase().trim();

  // Empty-name guard
  if (!pantryName || !recipeName) return pantryName === recipeName;

  // Stage 1: Direct name or substring match
  if (matchesByNameOrSubstring(pantryName, recipeName)) return true;

  // Stage 2: Provided synonyms (from database)
  if (pantryItemSynonyms && pantryItemSynonyms.length > 0) {
    if (matchesByProvidedSynonyms(recipeName, pantryItemSynonyms)) return true;
  }

  // Stage 3: Keyword extraction and matching
  const pantryWords = extractKeyWords(pantryName);
  const recipeWords = extractKeyWords(recipeName);

  if (matchesByKeyWords(pantryWords, recipeWords)) return true;

  // Stage 4: Built-in synonym map
  if (matchesBySynonymMap(pantryName, recipeName, pantryWords, recipeWords)) return true;

  return false;
};
