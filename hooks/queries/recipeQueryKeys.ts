/**
 * Query keys for recipe-related queries
 * Centralized key management for React Query cache invalidation and organization
 */

export const recipeQueryKeys = {
  // Base key for all recipe queries
  all: ["recipes"] as const,

  // All recipes list
  recipes: () => [...recipeQueryKeys.all, "list"] as const,

  // Individual recipe by ID
  recipe: (id: string) => [...recipeQueryKeys.all, "detail", id] as const,

  // Search queries with different parameters
  search: (
    searchTerm: string,
    filters?: {
      tags?: string[];
      maxPrepTime?: number;
      maxCookTime?: number;
      maxDifficulty?: number;
    }
  ) => [...recipeQueryKeys.all, "search", { searchTerm, filters }] as const,

  // Available recipes (what can be made with current pantry)
  available: () => [...recipeQueryKeys.all, "available"] as const,

  // Shopping list for a specific recipe
  shoppingList: (recipeId: string) =>
    [...recipeQueryKeys.all, "shopping-list", recipeId] as const,

  // Recipe tags (for filtering)
  tags: () => [...recipeQueryKeys.all, "tags"] as const,
} as const;
