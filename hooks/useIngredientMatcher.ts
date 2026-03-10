import { useCallback, useMemo, useRef } from "react";

import { isIngredientMatch } from "~/utils/ingredient-matching";

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

/**
 * Build a pre-computed index from pantry items for fast exact/synonym ingredient lookups.
 *
 * Optimization: This adds an O(1) lookup path for ingredients whose normalized text
 * matches a pantry item name or one of its synonyms, reducing the number of
 * expensive `isIngredientMatch` calls in the common case.
 *
 * - n = number of recipe ingredients
 * - m = number of pantry items
 * - s = average synonyms per pantry item
 *
 * When most ingredients match via the index (e.g., 20 ingredients × 50 pantry items × 3 synonyms),
 * we go from ~3,000 `isIngredientMatch` calls per render to ~60 index lookups plus a small
 * number of fallback scans for non-exact matches.
 *
 * Note: The overall worst-case complexity of the matching algorithm remains O(n*m*s) because
 * we still fall back to scanning pantry items with `isIngredientMatch` when no direct index
 * hit is found. The index improves average-case performance but does not change the
 * theoretical worst-case bound.
 *
 * The index maps normalized pantry item names and all their synonyms to the pantry item,
 * enabling constant-time lookups for exact and synonym-based ingredient matching.
 */
const buildPantryIndex = (pantryItems: PantryItem[]): Map<string, PantryItem> => {
  const index = new Map<string, PantryItem>();

  for (const pantryItem of pantryItems) {
    const normalizedName = pantryItem.name.toLowerCase().trim();

    // Index the main name (preserve first-in-array match if duplicates exist)
    if (!index.has(normalizedName)) {
      index.set(normalizedName, pantryItem);
    }

    // Index all synonyms
    if (pantryItem.synonyms && pantryItem.synonyms.length > 0) {
      for (const synonymEntry of pantryItem.synonyms) {
        const normalizedSynonym = synonymEntry.synonym.toLowerCase().trim();

        // Preserve first-in-array match for duplicate synonyms as well
        if (!index.has(normalizedSynonym)) {
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
  const findMatch = useCallback(
    (ingredient: RecipeIngredient): PantryItem | null => {
      const normalizedName = ingredient.name.toLowerCase().trim();

      // Try direct index lookup first (fast path)
      const directMatch = pantryIndexRef.current.get(normalizedName);
      if (directMatch) {
        return directMatch;
      }

      // Fallback to checking all pantry items with isIngredientMatch for edge cases
      // This is slower but only runs when direct lookup fails
      for (const pantryItem of pantryItems) {
        const synonyms = pantryItem.synonyms?.map((s) => s.synonym) ?? [];
        if (isIngredientMatch(pantryItem.name, ingredient.name, synonyms)) {
          return pantryItem;
        }
      }

      return null;
    },
    [pantryItems]
  );

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
