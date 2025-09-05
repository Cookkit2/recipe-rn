import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeApi } from "~/hooks/api/recipeApi";
import { recipeQueryKeys } from "./recipeQueryKeys";
import type { Recipe } from "~/types/Recipe";

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
      queryClient.setQueryData<Recipe[]>(
        recipeQueryKeys.recipes(),
        (oldData) => {
          if (!oldData) return [newRecipe];
          return [...oldData, newRecipe];
        }
      );

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
      queryClient.setQueryData(
        recipeQueryKeys.recipe(updatedRecipe.id),
        updatedRecipe
      );

      // Update the recipe in the recipes list cache
      queryClient.setQueryData<Recipe[]>(
        recipeQueryKeys.recipes(),
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((recipe) =>
            recipe.id === updatedRecipe.id ? updatedRecipe : recipe
          );
        }
      );

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
      queryClient.setQueryData<Recipe[]>(
        recipeQueryKeys.recipes(),
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.filter((recipe) => recipe.id !== deletedId);
        }
      );

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
