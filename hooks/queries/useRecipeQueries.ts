import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeQueryKeys } from "./recipeQueryKeys";
import type { Recipe } from "~/types/Recipe";
import { recipeApi } from "~/data/api/recipeApi";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import {
  type RecipeRankingStrategy,
  type RecipeFilterStrategy,
  createHistoryAwareRankingStrategy,
} from "~/hooks/recommendation";
import { useMemo } from "react";

/**
 * Hook to fetch all recipes
 */
export function useRecipes() {
  return useQuery({
    queryKey: recipeQueryKeys.recipes(),
    queryFn: recipeApi.fetchAllRecipes,
    staleTime: 5 * 60 * 1000, // 5 minutes - recipes don't change as frequently
  });
}

/**
 * Hook to fetch a single recipe by ID
 */
export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeQueryKeys.recipe(id),
    queryFn: () => recipeApi.getRecipeById(id),
    enabled: !!id, // Only run query if ID is provided
    staleTime: 10 * 60 * 1000, // 10 minutes for individual recipes
  });
}

/**
 * Hook to search recipes with filters
 */
export function useSearchRecipes(
  searchTerm: string,
  filters?: {
    tags?: string[];
    maxPrepTime?: number;
    maxCookTime?: number;
    maxDifficulty?: number;
  }
) {
  return useQuery({
    queryKey: recipeQueryKeys.search(searchTerm, filters),
    queryFn: () => recipeApi.searchRecipes(searchTerm, filters),
    enabled: searchTerm.length > 0, // Only run query if there's a search term
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });
}

/**
 * Hook to get available recipes based on pantry items
 */
export function useAvailableRecipes() {
  return useQuery({
    queryKey: recipeQueryKeys.available(),
    queryFn: recipeApi.getAvailableRecipes,
    staleTime: 1 * 60 * 1000, // 1 minute - depends on pantry which changes frequently
  });
}

/**
 * Hook to fetch recipe availability data from database
 *
 * Caches available recipes results separately for efficient reuse.
 * This data depends on pantry state and may change frequently.
 * Returns raw database format for efficient processing.
 *
 * Cache: 1 minute stale time, 5 minutes garbage collection.
 */
export function useRecipeAvailability() {
  return useQuery({
    queryKey: recipeQueryKeys.available(),
    queryFn: () => databaseFacade.getAvailableRecipes(),
    staleTime: 1 * 60 * 1000, // 1 minute - depends on pantry which changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  });
}

/**
 * Recipe with its completion percentage
 */
export interface RecipeWithCompletion {
  recipe: Recipe;
  completionPercentage: number;
  matchCategory?: "can_make_now" | "missing_1_2" | "missing_3_plus";
}

/**
 * Options for useRecipeRecommendations hook
 */
export interface UseRecipeRecommendationsOptions {
  /** Maximum recommendations to return */
  maxRecommendations?: number;
  /** Filter by recipe tags/categories */
  categories?: string[];
  /** Custom filter strategy (e.g., DietaryFilter for dietary preferences) */
  filterStrategy?: RecipeFilterStrategy;
  /** Custom ranking strategy (defaults to createHistoryAwareRankingStrategy) */
  rankingStrategy?: RecipeRankingStrategy;
}

/**
 * Hook to get smart recipe recommendations
 *
 * Uses cached data from availability and cooking history queries,
 * passing it to getRecipeRecommendations to avoid redundant database calls.
 */
export function useRecipeRecommendations(options?: UseRecipeRecommendationsOptions) {
  const {
    maxRecommendations,
    categories,
    filterStrategy,
    rankingStrategy = createHistoryAwareRankingStrategy(),
  } = options || {};

  // Get cached data from separate queries
  const availabilityQuery = useRecipeAvailability();

  const mostCookedQuery = useQuery({
    queryKey: ["cookingHistory", "mostCooked", 100],
    queryFn: () => databaseFacade.getMostCookedRecipes(100),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const cookingHistoryQuery = useQuery({
    queryKey: ["cookingHistory", "list", 500],
    queryFn: () => databaseFacade.getCookingHistory(500),
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Query to compute recommendations from cached data
  const recommendationsQuery = useQuery({
    queryKey: [
      "recipes",
      "recommendations",
      categories,
      // Use constructor names for stable cache keys (Object.prototype.toString returns [object Object] for objects)
      filterStrategy?.constructor?.name ?? "default",
      rankingStrategy?.constructor?.name ?? "default",
      maxRecommendations,
    ],
    queryFn: async () => {
      const mostCookedData = mostCookedQuery.data ?? [];
      const cookingHistoryDataRaw = cookingHistoryQuery.data ?? [];

      // Build cooking history data from cached queries
      const mostCookedMap = new Map(
        mostCookedData.map((d) => [
          d.recipeId,
          { cookCount: d.cookCount, lastCookedAt: d.lastCookedAt },
        ])
      );

      const ratingsByRecipe = new Map<string, number[]>();
      for (const record of cookingHistoryDataRaw) {
        if (record.rating !== undefined && record.rating >= 1 && record.rating <= 5) {
          const existing = ratingsByRecipe.get(record.recipeId) || [];
          existing.push(record.rating);
          ratingsByRecipe.set(record.recipeId, existing);
        }
      }

      const ratingsMap = new Map<string, number>();
      for (const [recipeId, ratings] of ratingsByRecipe) {
        const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        ratingsMap.set(recipeId, avgRating);
      }

      const cookingHistoryData = {
        mostCooked: mostCookedMap,
        ratings: ratingsMap,
      };

      return recipeApi.getRecipeRecommendations({
        maxRecommendations,
        categories,
        filterStrategy,
        rankingStrategy,
        preFetchedAvailability: availabilityQuery.data,
        preFetchedCookingHistory: cookingHistoryData,
      });
    },
    enabled: !!availabilityQuery.data && !!mostCookedQuery.data && !!cookingHistoryQuery.data,
    staleTime: 30 * 1000, // 30 seconds - recommendations depend on other cached data
  });

  const recipes = recommendationsQuery.data?.recipes ?? [];

  // Combine loading states
  const isLoading =
    availabilityQuery.isLoading ||
    mostCookedQuery.isLoading ||
    cookingHistoryQuery.isLoading ||
    recommendationsQuery.isLoading;

  // Combine errors
  const error =
    availabilityQuery.error ||
    mostCookedQuery.error ||
    cookingHistoryQuery.error ||
    recommendationsQuery.error;

  return {
    recipes,
    isLoading,
    error,
    refetch: () => {
      return Promise.all([
        availabilityQuery.refetch(),
        mostCookedQuery.refetch(),
        cookingHistoryQuery.refetch(),
        recommendationsQuery.refetch(),
      ]);
    },
  };
}

/**
 * Hook to get a random recipe recommendation ("Choose for me" functionality)
 */
export function useRandomRecipeRecommendation(options?: {
  maxRecommendations?: number;
  categories?: string[];
}) {
  const { recipes, isLoading, error, refetch } = useRecipeRecommendations({
    ...options,
    maxRecommendations: options?.maxRecommendations || 20, // Get more recipes for better randomness
  });

  const getRandomRecipe = () => {
    if (recipes.length === 0) return null;

    // Return a random recipe
    const randomIndex = Math.floor(Math.random() * recipes.length);
    return recipes[randomIndex]?.recipe ?? null;
  };

  return {
    recipes,
    isLoading,
    error,
    refetch,
    getRandomRecipe,
    hasRecipes: recipes.length > 0,
  };
}

/**
 * Hook to get recipes based on ingredients expiring soon
 *
 * Fetches recipes ranked by how many expiring ingredients they use,
 * helping to reduce food waste. Also returns the list of expiring
 * ingredient IDs for UI display.
 *
 * @param options.daysBeforeExpiry - Days threshold for expiring ingredients (default: 3)
 * @param options.maxRecommendations - Maximum recommendations to return
 */
export function useExpiringRecipes(options?: {
  /** Number of days to look ahead for expiring ingredients (default: 3) */
  daysBeforeExpiry?: number;
  /** Maximum recommendations to return */
  maxRecommendations?: number;
}) {
  const queryKey = recipeQueryKeys.expiringRecipes(options);

  const query = useQuery({
    queryKey,
    queryFn: () => recipeApi.getRecipeRecommendationsForExpiring(options),
    staleTime: 1 * 60 * 1000, // 1 minute - depends on pantry which changes frequently
  });

  return {
    recipes: query.data?.recipes ?? [],
    expiringIngredientIds: query.data?.expiringIngredientIds ?? new Set<string>(),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to get shopping list for a recipe
 */
export function useShoppingList(recipeId: string) {
  return useQuery({
    queryKey: recipeQueryKeys.shoppingList(recipeId),
    queryFn: () => recipeApi.getShoppingListForRecipe(recipeId),
    enabled: !!recipeId, // Only run query if recipe ID is provided
    staleTime: 2 * 60 * 1000, // 2 minutes - depends on pantry state
  });
}

/**
 * Mutation hook to add a new recipe
 */
export function useAddRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recipeApi.addRecipe,
    onSuccess: (newRecipe) => {
      // Add the new recipe to the recipes list cache
      queryClient.setQueryData<Recipe[]>(recipeQueryKeys.recipes(), (oldData) => {
        if (!oldData) return [newRecipe];
        return [...oldData, newRecipe];
      });

      // Invalidate related queries that might be affected
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.available(),
      });
    },
    onError: () => {
      // On error, invalidate the recipes list to ensure consistency
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recipes(),
      });
    },
  });
}

/**
 * Mutation hook to update an existing recipe
 */
export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Recipe> }) =>
      recipeApi.updateRecipe(id, updates),
    onSuccess: (updatedRecipe) => {
      // Update the specific recipe in cache
      queryClient.setQueryData(recipeQueryKeys.recipe(updatedRecipe.id), updatedRecipe);

      // Update the recipe in the recipes list cache
      queryClient.setQueryData<Recipe[]>(recipeQueryKeys.recipes(), (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((recipe) => (recipe.id === updatedRecipe.id ? updatedRecipe : recipe));
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.available(),
      });
    },
    onError: (_, { id }) => {
      // On error, invalidate the specific recipe and list to ensure consistency
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recipe(id),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recipes(),
      });
    },
  });
}

/**
 * Mutation hook to delete a recipe
 */
export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recipeApi.deleteRecipe,
    onSuccess: (_, deletedId) => {
      // Remove the recipe from the recipes list cache
      queryClient.setQueryData<Recipe[]>(recipeQueryKeys.recipes(), (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((recipe) => recipe.id !== deletedId);
      });

      // Remove the individual recipe from cache
      queryClient.removeQueries({
        queryKey: recipeQueryKeys.recipe(deletedId),
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.available(),
      });
    },
    onError: () => {
      // On error, invalidate the recipes list to ensure consistency
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recipes(),
      });
    },
  });
}

/**
 * Mutation hook to toggle favorite status of a recipe
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipeId: string) => databaseFacade.toggleFavorite(recipeId),
    onSuccess: (updatedRecipe) => {
      if (updatedRecipe) {
        // Update the specific recipe in cache
        queryClient.setQueryData(recipeQueryKeys.recipe(updatedRecipe.id), updatedRecipe);

        // Update the recipe in the recipes list cache
        queryClient.setQueryData<Recipe[]>(recipeQueryKeys.recipes(), (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((recipe) => (recipe.id === updatedRecipe.id ? updatedRecipe : recipe));
        });
      }
    },
  });
}

/**
 * Hook to manually refresh recipe data
 */
export function useRefreshRecipes() {
  const queryClient = useQueryClient();

  const refresh = () => {
    return queryClient.invalidateQueries({
      queryKey: recipeQueryKeys.all,
    });
  };

  return { refresh };
}
