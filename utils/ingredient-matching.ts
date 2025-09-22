// Improved ingredient matching function that handles synonyms and variations
export const isIngredientMatch = (
  pantryItemName: string,
  recipeIngredientName: string
): boolean => {
  const pantryName = pantryItemName.toLowerCase().trim();
  const recipeName = recipeIngredientName.toLowerCase().trim();

  // Direct match
  if (pantryName === recipeName) return true;

  // Contains match (existing logic)
  if (pantryName.includes(recipeName) || recipeName.includes(pantryName))
    return true;

  // Extract key words and remove common modifiers
  const extractKeyWords = (name: string): string[] => {
    return name
      .replace(
        /\b(fresh|frozen|canned|dried|cooked|raw|organic|whole|sliced|diced|chopped|steamed|boiled|fried|grilled)\b/g,
        ""
      )
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

  // Handle specific synonyms
  const synonymMap: Record<string, string[]> = {
    rice: ["white rice", "steamed rice", "jasmine rice", "basmati rice"],
    chicken: ["chicken breast", "chicken thigh", "chicken leg"],
    beef: ["ground beef", "beef steak", "beef roast"],
    tomato: ["cherry tomato", "roma tomato", "beef tomato"],
    onion: ["yellow onion", "white onion", "red onion"],
    pepper: ["bell pepper", "green pepper", "red pepper"],
    cheese: ["cheddar cheese", "mozzarella cheese", "parmesan cheese"],
  };

  // Check synonyms
  for (const [baseWord, synonyms] of Object.entries(synonymMap)) {
    const pantryContainsBase = pantryWords.some((word) =>
      word.includes(baseWord)
    );
    const recipeContainsBase = recipeWords.some((word) =>
      word.includes(baseWord)
    );
    const pantryContainsSynonym = synonyms.some((synonym) =>
      pantryName.includes(synonym)
    );
    const recipeContainsSynonym = synonyms.some((synonym) =>
      recipeName.includes(synonym)
    );

    if (
      (pantryContainsBase || pantryContainsSynonym) &&
      (recipeContainsBase || recipeContainsSynonym)
    ) {
      return true;
    }
  }

  return hasCommonKeyWord;
};
