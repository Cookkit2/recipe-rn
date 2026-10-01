import type { Recipe } from "~/types/Recipe";
import type { RecipeFilters } from "~/hooks/queries/useRecipeQueries";

function totalMinutes(r: Recipe): number {
  return (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
}

function matchesTextQuery(r: Recipe, query: string): boolean {
  if (query.length === 0) return true;
  const title = r.title.toLowerCase();
  const desc = (r.description ?? "").toLowerCase();
  return title.includes(query) || desc.includes(query);
}

function matchesTags(r: Recipe, tags: string[] | undefined): boolean {
  if (!tags || tags.length === 0) return true;
  const recipeTags = r.tags ?? [];
  return tags.some((tag) => recipeTags.includes(tag));
}

function matchesDifficulty(r: Recipe, difficulty: number | undefined): boolean {
  if (difficulty === undefined) return true;
  return r.difficultyStars === difficulty;
}

function matchesTimeFilters(r: Recipe, filters: RecipeFilters): boolean {
  if (filters.maxPrepTime !== undefined && (r.prepMinutes ?? 0) > filters.maxPrepTime) {
    return false;
  }
  if (filters.maxCookTime !== undefined && (r.cookMinutes ?? 0) > filters.maxCookTime) {
    return false;
  }
  if (filters.maxTotalTime !== undefined) {
    const T = filters.maxTotalTime;
    const p = r.prepMinutes ?? 0;
    const c = r.cookMinutes ?? 0;
    if (p > T || c > T || p + c > T) return false;
  }
  if (filters.minTotalTime !== undefined && totalMinutes(r) < filters.minTotalTime) {
    return false;
  }
  return true;
}

function matchesRating(r: Recipe, minRating: number | undefined): boolean {
  if (minRating === undefined) return true;
  return (r.avgRating ?? 0) >= minRating;
}

/**
 * Client-side recipe search (title + description substring) and the same filter
 * dimensions as `RecipeRepository.searchRecipes` / `useSearchRecipes`.
 */
export function filterRecipesForSearch(
  recipes: readonly Recipe[],
  textQuery: string,
  filters?: RecipeFilters
): Recipe[] {
  const q = textQuery.trim().toLowerCase();

  // ⚡ Bolt Performance Optimization: Replaced O(N) array.filter with a standard for loop
  // to avoid closure allocation overhead on every keystroke during search.
  const result: Recipe[] = [];

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    if (r) {
      if (!matchesTextQuery(r, q)) continue;
      if (!matchesTags(r, filters?.tags)) continue;
      if (!matchesDifficulty(r, filters?.difficulty)) continue;
      if (filters && !matchesTimeFilters(r, filters)) continue;
      if (!matchesRating(r, filters?.minRating)) continue;

      result.push(r);
    }
  }

  return result;
}
