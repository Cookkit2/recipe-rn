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
  if (!pantryName || !recipeName) return pantryName === recipeName;

  // Direct match
  if (pantryName === recipeName) return true;

  // Check provided synonyms (from database)
  if (pantryItemSynonyms.length > 0) {
    for (let i = 0; i < pantryItemSynonyms.length; i++) {
      const syn = pantryItemSynonyms[i]?.toLowerCase().trim();
      if (syn && (syn === recipeName || recipeName.includes(syn) || syn.includes(recipeName))) {
        return true;
      }
    }
  }

  // Contains match (existing logic)
  if (pantryName.includes(recipeName) || recipeName.includes(pantryName)) return true;

  // Extract key words and remove common modifiers
  const extractKeyWords = (name: string): string[] => {
    const replaced = name.replace(STOP_WORDS_REGEX, "");
    const parts = replaced.split(/[\s,\-()]+/);
    const result: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const word = parts[i]?.trim();
      if (word && word.length > 2) {
        result.push(word);
      }
    }
    return result;
  };

  const pantryWords = extractKeyWords(pantryName);
  const recipeWords = extractKeyWords(recipeName);

  // Check if any significant words match
  let hasCommonKeyWord = false;
  for (let i = 0; i < pantryWords.length; i++) {
    const pWord = pantryWords[i];
    if (!pWord) continue;

    for (let j = 0; j < recipeWords.length; j++) {
      const rWord = recipeWords[j];
      if (!rWord) continue;

      if (pWord === rWord || pWord.includes(rWord) || rWord.includes(pWord)) {
        hasCommonKeyWord = true;
        break;
      }
    }
    if (hasCommonKeyWord) break;
  }

  // Optimization: return early before checking synonyms if we already matched
  if (hasCommonKeyWord) return true;

  // Check synonyms
  for (let i = 0; i < SYNONYM_MAP_ENTRIES.length; i++) {
    const entry = SYNONYM_MAP_ENTRIES[i];
    if (!entry) continue;

    const baseWord = entry[0];
    const synonyms = entry[1];

    let pantryMatch = false;
    for (let j = 0; j < pantryWords.length; j++) {
      if (pantryWords[j]?.includes(baseWord)) {
        pantryMatch = true;
        break;
      }
    }

    if (!pantryMatch) {
      for (let j = 0; j < synonyms.length; j++) {
        if (pantryName.includes(synonyms[j]!)) {
          pantryMatch = true;
          break;
        }
      }
    }

    // Optimization: only check recipe words if pantry matched
    if (pantryMatch) {
      let recipeMatch = false;
      for (let j = 0; j < recipeWords.length; j++) {
        if (recipeWords[j]?.includes(baseWord)) {
          recipeMatch = true;
          break;
        }
      }

      if (!recipeMatch) {
        for (let j = 0; j < synonyms.length; j++) {
          if (recipeName.includes(synonyms[j]!)) {
            recipeMatch = true;
            break;
          }
        }
      }

      if (recipeMatch) {
        return true;
      }
    }
  }

  return false;
};
