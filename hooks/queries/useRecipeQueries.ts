import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { recipeQueryKeys } from "./recipeQueryKeys";
import type { Recipe } from "~/types/Recipe";
import { recipeApi, rankRecipeRecommendations } from "~/data/api/recipeApi";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import {
  type RecipeRankingStrategy,
  type RecipeFilterStrategy,
  createHistoryAwareRankingStrategy,
  DietaryFilter,
  ExpiringIngredientsRankingStrategy,
  type RankingContext,
} from "~/hooks/recommendation";
import { useMemo } from "react";

/**
 * Hook to fetch all recipes (summary rows: title, times, tags, etc.; empty
 * `ingredients` / `instructions`). Use `useRecipe(id)` for full detail.
 */
export function useRecipes() {
  return useQuery({
    queryKey: recipeQueryKeys.recipes(),
    queryFn: async () => {
      const recipes = await recipeApi.fetchAllRecipes();
      // Fetch cooking history to compute avg ratings for all recipes
      const cookingHistory = await databaseFacade.getCookingHistory(500);
      const ratingsByRecipe = new Map<string, { sum: number; count: number }>();
      for (const record of cookingHistory) {
        if (record.rating !== undefined && record.rating >= 1 && record.rating <= 5) {
          const current = ratingsByRecipe.get(record.recipeId);
          if (current) {
            current.sum += record.rating;
            current.count += 1;
          } else {
            ratingsByRecipe.set(record.recipeId, { sum: record.rating, count: 1 });
          }
        }
      }
      const ratingsMap = new Map<string, number | null>();
      for (const [recipeId, data] of ratingsByRecipe) {
        ratingsMap.set(recipeId, data.sum / data.count);
      }
      // Attach avgRating to recipes
      return recipes.map((recipe) => ({
        ...recipe,
        avgRating: ratingsMap.get(recipe.id) ?? null,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - recipes don't change as frequently
  });
}

/**
 * Hook to fetch paginated recipes with infinite scroll support
 * @param pageSize - Number of recipes to fetch per page (default: 20)
 */
export function useRecipesPaginated(pageSize = 20) {
  return useInfiniteQuery({
    queryKey: [...recipeQueryKeys.recipes(), "paginated", pageSize],
    queryFn: ({ pageParam = 0 }) => recipeApi.fetchRecipesPaginated(pageParam, pageSize),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.nextPage;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
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
export interface RecipeFilters {
  tags?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  minTotalTime?: number;
  maxTotalTime?: number;
  difficulty?: number;
  minRating?: number;
}

function recipeFiltersApply(filters?: RecipeFilters): boolean {
  if (!filters) return false;
  if (filters.tags && filters.tags.length > 0) return true;
  if (filters.difficulty !== undefined) return true;
  if (filters.maxTotalTime !== undefined) return true;
  if (filters.minTotalTime !== undefined) return true;
  if (filters.maxPrepTime !== undefined) return true;
  if (filters.maxCookTime !== undefined) return true;
  if (filters.minRating !== undefined) return true;
  return false;
}

/**
 * Hook to search recipes
 */
function useSearchRecipes(searchTerm: string, filters?: RecipeFilters) {
  return useQuery({
    queryKey: recipeQueryKeys.search(searchTerm, filters),
    queryFn: () => recipeApi.searchRecipes(searchTerm, filters),
    enabled: searchTerm.length > 0 || recipeFiltersApply(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });
}

/**
 * Hook to get available recipes based on pantry items
 */
function useAvailableRecipes() {
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
function useRecipeAvailability() {
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
  enabled?: boolean;
  rankingContext?: RankingContext;
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
export function useRecipeRecommendations(options: UseRecipeRecommendationsOptions = {}) {
  const { enabled = true } = options;
  const catalog = useQuery({
    queryKey: recipeQueryKeys.catalog(),
    queryFn: recipeApi.fetchRecommendationCatalog,
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    enabled,
  });
  const availability = useQuery({
    queryKey: [...recipeQueryKeys.availability(), catalog.dataUpdatedAt],
    queryFn: () => databaseFacade.getRecipeAvailabilityForCatalog(catalog.data!),
    staleTime: 60 * 1000,
    networkMode: "always",
    enabled: enabled && !!catalog.data,
  });
  const mostCooked = useQuery({
    queryKey: ["cookingHistory", "mostCooked", 100],
    queryFn: () => databaseFacade.getMostCookedRecipes(100),
    staleTime: 2 * 60 * 1000,
    networkMode: "always",
    enabled,
  });
  const history = useQuery({
    queryKey: ["cookingHistory", "list", 500],
    queryFn: () => databaseFacade.getCookingHistory(500),
    staleTime: 60 * 1000,
    networkMode: "always",
    enabled,
  });
  const cookingHistory = useMemo(() => {
    const mostCookedMap = new Map((mostCooked.data ?? []).map((item) => [item.recipeId, item]));
    const ratings = new Map<string, number>();
    const totals = new Map<string, { sum: number; count: number }>();
    for (const record of history.data ?? []) {
      if (record.rating != null && record.rating >= 1 && record.rating <= 5) {
        const total = totals.get(record.recipeId) ?? { sum: 0, count: 0 };
        total.sum += record.rating;
        total.count++;
        totals.set(record.recipeId, total);
      }
    }
    for (const [id, total] of totals) ratings.set(id, total.sum / total.count);
    return { mostCooked: mostCookedMap, ratings };
  }, [mostCooked.data, history.data]);
  const { categories, maxRecommendations, filterStrategy, rankingStrategy, rankingContext } =
    options;
  const result = useMemo(() => {
    if (!catalog.data || !availability.data) return { recipes: [] };
    return rankRecipeRecommendations(catalog.data, availability.data, {
      categories,
      maxRecommendations,
      filterStrategy,
      rankingStrategy,
      rankingContext: { ...rankingContext, cookingHistory },
    });
  }, [
    catalog.data,
    availability.data,
    categories,
    maxRecommendations,
    filterStrategy,
    rankingStrategy,
    rankingContext,
    cookingHistory,
  ]);
  const client = useQueryClient();
  return {
    recipes: result.recipes,
    isLoading:
      enabled &&
      (catalog.isPending || availability.isPending || mostCooked.isPending || history.isPending),
    error: catalog.error ?? availability.error ?? mostCooked.error ?? history.error,
    refetch: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: recipeQueryKeys.all }),
        client.invalidateQueries({ queryKey: ["cookingHistory"] }),
      ]),
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
  daysBeforeExpiry?: number;
  maxRecommendations?: number;
  enabled?: boolean;
}) {
  const enabled = options?.enabled ?? true;
  const days = options?.daysBeforeExpiry ?? 3;
  const expiring = useQuery({
    queryKey: ["pantry", "expiringStocks", days],
    queryFn: () => databaseFacade.getExpiringStock(days),
    staleTime: 60 * 1000,
    networkMode: "always",
    enabled,
  });
  const expiringIngredientIds = useMemo(
    () => new Set(expiring.data?.map((stock) => stock.id)),
    [expiring.data]
  );
  const rankingContext = useMemo(
    () => ({ expiringIngredients: expiringIngredientIds }),
    [expiringIngredientIds]
  );
  const rankingStrategy = useMemo(
    () =>
      new ExpiringIngredientsRankingStrategy({
        baseBonus: 20,
        multipleIngredientMultiplier: 1.5,
        multiplierThreshold: 2,
      }),
    []
  );
  const filterStrategy = useMemo(() => new DietaryFilter(), []);
  const recommendations = useRecipeRecommendations({
    maxRecommendations: options?.maxRecommendations,
    rankingContext,
    rankingStrategy,
    filterStrategy,
    enabled: enabled && expiringIngredientIds.size > 0,
  });
  return {
    ...recommendations,
    recipes: expiringIngredientIds.size ? recommendations.recipes : [],
    expiringIngredientIds,
    isLoading:
      enabled &&
      (expiring.isPending || (expiringIngredientIds.size > 0 && recommendations.isLoading)),
    error: expiring.error ?? recommendations.error,
  };
}

/**
 * Hook to get shopping list for a recipe
 */
function useShoppingList(recipeId: string) {
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
function useAddRecipe() {
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
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.catalog() });
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.availability() });
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.available() });
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
function useUpdateRecipe() {
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
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.catalog() });
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.availability() });
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.available() });
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
function useDeleteRecipe() {
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
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.catalog() });
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.availability() });
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.available() });
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
