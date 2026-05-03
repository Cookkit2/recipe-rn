import type { Recipe } from "~/types/Recipe";
import type { RecipeFilters } from "~/hooks/queries/useRecipeQueries";

function totalMinutes(r: Recipe): number {
  return (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
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

  return recipes.filter((r) => {
    if (q.length > 0) {
      const title = r.title.toLowerCase();
      const desc = (r.description ?? "").toLowerCase();
      if (!title.includes(q) && !desc.includes(q)) return false;
    }

    if (filters?.tags && filters.tags.length > 0) {
      const tags = r.tags ?? [];
      const anyTag = filters.tags.some((tag) => tags.includes(tag));
      if (!anyTag) return false;
    }

    if (filters?.difficulty !== undefined) {
      if (r.difficultyStars !== filters.difficulty) return false;
    }

    if (filters?.maxPrepTime !== undefined) {
      if ((r.prepMinutes ?? 0) > filters.maxPrepTime) return false;
    }
    if (filters?.maxCookTime !== undefined) {
      if ((r.cookMinutes ?? 0) > filters.maxCookTime) return false;
    }

    if (filters?.maxTotalTime !== undefined) {
      const T = filters.maxTotalTime;
      const p = r.prepMinutes ?? 0;
      const c = r.cookMinutes ?? 0;
      const total = p + c;
      if (p > T || c > T || total > T) return false;
    }

    if (filters?.minTotalTime !== undefined) {
      if (totalMinutes(r) < filters.minTotalTime) return false;
    }

    return true;
  });
}
