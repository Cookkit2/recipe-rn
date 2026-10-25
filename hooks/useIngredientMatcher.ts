import { useCallback, useMemo, useRef } from "react";

import { ingredientClarification } from "~/utils/ingredient-identity";
import { normalizeRecipeIngredient } from "~/utils/recipe-ingredient-match";

import type { PantryItem } from "~/types/PantryItem";
import type { RecipeIngredient } from "~/types/Recipe";

/**
 * Result of matching an ingredient against pantry items
 */
interface IngredientMatchResult {
  ingredient: RecipeIngredient;
  matchedPantryItem: PantryItem | null;
}

/**
 * Options for the ingredient matcher hook
 */
interface UseIngredientMatcherOptions {
  pantryItems: PantryItem[];
}

/**
 * Return type for useIngredientMatcher hook
 */
interface IngredientMatcherReturn {
  /**
   * Find matching pantry item for a single ingredient
   * @param ingredient - The recipe ingredient to match
   * @returns Matching pantry item or null
   */
  findMatch: (ingredient: RecipeIngredient) => PantryItem | null;

  /**
   * Get match results for all recipe ingredients
   * @param ingredients - Array of recipe ingredients
   * @returns Array of match results
   */
  matchIngredients: (ingredients: RecipeIngredient[]) => IngredientMatchResult[];

  /**
   * Count how many pantry items match any of the given ingredients
   * @param ingredients - Array of recipe ingredients
   * @returns Number of pantry items that have at least one match
   */
  countMatchingPantryItems: (ingredients: RecipeIngredient[]) => number;

  /**
   * Filter ingredients that have no matching pantry item
   * @param ingredients - Array of recipe ingredients
   * @returns Array of ingredients with no matches
   */
  getMissingIngredients: (ingredients: RecipeIngredient[]) => RecipeIngredient[];
}

/** Index complete names and explicit synonyms; never categories or keyword fragments. */
const buildPantryIndex = (pantryItems: PantryItem[]): Map<string, PantryItem> => {
  const index = new Map<string, PantryItem>();

  for (const pantryItem of pantryItems) {
    if (ingredientClarification(pantryItem.name)) continue;
    const normalizedName = normalizeRecipeIngredient(pantryItem.name);

    // Index the main name (preserve first-in-array match if duplicates exist)
    if (!index.has(normalizedName)) {
      index.set(normalizedName, pantryItem);
    }

    // Index all synonyms
    if (pantryItem.synonyms && pantryItem.synonyms.length > 0) {
      for (const synonymEntry of pantryItem.synonyms) {
        const normalizedSynonym = normalizeRecipeIngredient(synonymEntry.synonym);

        // Preserve first-in-array match for duplicate synonyms as well
        if (
          normalizedSynonym &&
          !ingredientClarification(synonymEntry.synonym) &&
          !index.has(normalizedSynonym)
        ) {
          index.set(normalizedSynonym, pantryItem);
        }
      }
    }
  }

  return index;
};

/**
 * Custom hook for optimized ingredient matching against pantry items
 *
 * This hook builds a pre-computed index from pantry items on mount and when pantry items change,
 * then provides O(1) lookup functions for matching recipe ingredients.
 *
 * @param options - Configuration options including pantry items to index
 * @returns Object containing matching functions
 */
export function useIngredientMatcher(
  options: UseIngredientMatcherOptions
): IngredientMatcherReturn {
  const { pantryItems } = options;

  // Build index memoized - only rebuilds when pantryItems changes
  const pantryIndex = useMemo(() => buildPantryIndex(pantryItems), [pantryItems]);

  // Keep a ref to avoid rebuilding callbacks on every render
  const pantryIndexRef = useRef(pantryIndex);
  pantryIndexRef.current = pantryIndex;

  /**
   * Find a matching pantry item for a single ingredient using O(1) index lookup
   */
  const findMatch = useCallback((ingredient: RecipeIngredient): PantryItem | null => {
    const normalizedName = normalizeRecipeIngredient(ingredient.name);

    if (ingredientClarification(ingredient.name)) return null;
    return pantryIndexRef.current.get(normalizedName) ?? null;
  }, []);

  /**
   * Match all ingredients against pantry items
   * Returns array of results with matched pantry item or null
   */
  const matchIngredients = useCallback(
    (ingredients: RecipeIngredient[]): IngredientMatchResult[] => {
      return ingredients.map((ingredient) => ({
        ingredient,
        matchedPantryItem: findMatch(ingredient),
      }));
    },
    [findMatch]
  );

  /**
   * Count how many unique pantry items match at least one ingredient
   * Used for determining if recipe can be tailored (>=50% match threshold)
   */
  const countMatchingPantryItems = useCallback(
    (ingredients: RecipeIngredient[]): number => {
      const matchedPantryItemIds = new Set<string>();

      for (const ingredient of ingredients) {
        const match = findMatch(ingredient);
        if (match) {
          matchedPantryItemIds.add(match.id);
        }
      }

      return matchedPantryItemIds.size;
    },
    [findMatch]
  );

  /**
   * Get all ingredients that don't have a matching pantry item
   * Used for displaying missing ingredients list
   */
  const getMissingIngredients = useCallback(
    (ingredients: RecipeIngredient[]): RecipeIngredient[] => {
      return ingredients.filter((ingredient) => {
        return !findMatch(ingredient);
      });
    },
    [findMatch]
  );

  return {
    findMatch,
    matchIngredients,
    countMatchingPantryItems,
    getMissingIngredients,
  };
}

export type { IngredientMatchResult, IngredientMatcherReturn, UseIngredientMatcherOptions };
