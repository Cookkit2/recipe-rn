/**
 * Query invalidation utilities
 *
 * Shared helpers for TanStack Query cache invalidation patterns
 * used across mutation hooks. Reduces duplicated invalidation boilerplate.
 */
import type { QueryClient } from "@tanstack/react-query";
import { recipeQueryKeys } from "./recipeQueryKeys";
import { reviewQueryKeys } from "./reviewQueryKeys";

/**
 * Invalidate the standard set of recipe list caches after a mutation
 * that creates or imports a recipe (e.g. recipe import from URL/YouTube).
 */
export function invalidateRecipeLists(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: recipeQueryKeys.recipes() });
  queryClient.invalidateQueries({ queryKey: recipeQueryKeys.available() });
  queryClient.invalidateQueries({ queryKey: recipeQueryKeys.recommendations() });
}

/**
 * Invalidate the core review query caches for a given recipe.
 * Covers list, summary, and userReview — the three keys mutated by
 * create/update/delete review operations.
 */
export function invalidateReviewCaches(queryClient: QueryClient, recipeId: string) {
  queryClient.invalidateQueries({ queryKey: reviewQueryKeys.list(recipeId, "newest", 0) });
  queryClient.invalidateQueries({ queryKey: reviewQueryKeys.summary(recipeId) });
  queryClient.invalidateQueries({ queryKey: reviewQueryKeys.userReview(recipeId) });
}
