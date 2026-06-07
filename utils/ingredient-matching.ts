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

// Cache for keyword extraction to avoid running regex over same string continuously in loop
const _wordCache = new Map<string, string[]>();

// ⚡ Bolt Optimization: Use module level Map cache and eliminate closure allocations
const extractKeyWords = (name: string): string[] => {
  const cached = _wordCache.get(name);
  if (cached) return cached;

  const result: string[] = [];
  const words = name.replace(STOP_WORDS_REGEX, "").split(/[\s,\-()]+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i]?.trim();
    if (word && word.length > 2) {
      result.push(word);
    }
  }

  // Only cache if map isn't excessively large to avoid memory leaks
  if (_wordCache.size < 5000) {
    _wordCache.set(name, result);
  }
  return result;
};

export const isIngredientMatch = (
  pantryItemName: string,
  recipeIngredientName: string,
  pantryItemSynonyms: (string | { synonym: string })[] = []
): boolean => {
  const pantryName = pantryItemName.toLowerCase().trim();
  const recipeName = recipeIngredientName.toLowerCase().trim();

  // Direct match
  if (!pantryName || !recipeName) return pantryName === recipeName;

  // Direct match
  if (pantryName === recipeName) return true;

  // Check provided synonyms (from database)
  if (pantryItemSynonyms && pantryItemSynonyms.length > 0) {
    // ⚡ Bolt Optimization: Use standard for loop over iterators or array methods to avoid closure overhead
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
  }

  // Contains match (existing logic)
  if (pantryName.includes(recipeName) || recipeName.includes(pantryName)) return true;

  const pantryWords = extractKeyWords(pantryName);
  const recipeWords = extractKeyWords(recipeName);

  // Check if any significant words match
  // ⚡ Bolt Optimization: Use standard for loop to avoid closure overhead in hot path
  let hasCommonKeyWord = false;
  for (let i = 0; i < pantryWords.length; i++) {
    const pantryWord = pantryWords[i];
    if (!pantryWord) continue;
    for (let j = 0; j < recipeWords.length; j++) {
      const recipeWord = recipeWords[j];
      if (!recipeWord) continue;
      if (
        pantryWord === recipeWord ||
        pantryWord.includes(recipeWord) ||
        recipeWord.includes(pantryWord)
      ) {
        hasCommonKeyWord = true;
        break;
      }
    }
    if (hasCommonKeyWord) break;
  }

  // Optimization: return early before checking synonyms if we already matched
  if (hasCommonKeyWord) return true;

  // Check synonyms
  // ⚡ Bolt Optimization: Use indexed loop instead of .some to avoid closure overhead
  for (let i = 0; i < SYNONYM_MAP_ENTRIES.length; i++) {
    const entry = SYNONYM_MAP_ENTRIES[i];
    if (!entry) continue;
    const baseWord = entry[0];
    const synonyms = entry[1];

    let pantryContainsBase = false;
    for (let j = 0; j < pantryWords.length; j++) {
      const word = pantryWords[j];
      if (word && word.includes(baseWord)) {
        pantryContainsBase = true;
        break;
      }
    }

    let pantryContainsSynonym = false;
    if (!pantryContainsBase) {
      for (let j = 0; j < synonyms.length; j++) {
        const syn = synonyms[j];
        if (syn && pantryName.includes(syn)) {
          pantryContainsSynonym = true;
          break;
        }
      }
    }

    // Optimization: only check recipe words if pantry matched
    if (pantryContainsBase || pantryContainsSynonym) {
      let recipeContainsBase = false;
      for (let j = 0; j < recipeWords.length; j++) {
        const rWord = recipeWords[j];
        if (rWord && rWord.includes(baseWord)) {
          recipeContainsBase = true;
          break;
        }
      }

      let recipeContainsSynonym = false;
      if (!recipeContainsBase) {
        for (let j = 0; j < synonyms.length; j++) {
          const syn = synonyms[j];
          if (syn && recipeName.includes(syn)) {
            recipeContainsSynonym = true;
            break;
          }
        }
      }

      if (recipeContainsBase || recipeContainsSynonym) {
        return true;
      }
    }
  }

  return false;
};
