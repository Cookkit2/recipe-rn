import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeQueryKeys } from "./recipeQueryKeys";
import { recipeApi } from "~/data/api/recipeApi";
import type { Recipe } from "~/types/Recipe";
import { toast } from "sonner-native";

/**
 * Hook to fetch all favorite recipes
 */
export function useFavorites() {
  return useQuery({
    queryKey: recipeQueryKeys.favorites(),
    queryFn: () => recipeApi.getFavoriteRecipes(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to toggle a recipe's favorite status
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipeId: string) => recipeApi.toggleFavorite(recipeId),
    onMutate: async (recipeId: string) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: recipeQueryKeys.favorites() });
      await queryClient.cancelQueries({ queryKey: recipeQueryKeys.recipe(recipeId) });
      await queryClient.cancelQueries({ queryKey: recipeQueryKeys.recipes() });

      // Snapshot the previous values
      const previousFavorites = queryClient.getQueryData<Recipe[]>(recipeQueryKeys.favorites());
      const previousRecipe = queryClient.getQueryData<Recipe>(recipeQueryKeys.recipe(recipeId));
      const previousRecipes = queryClient.getQueryData<Recipe[]>(recipeQueryKeys.recipes());

      // Optimistically update favorites list
      if (previousFavorites) {
        // Find if it's already a favorite
        const isCurrentlyFavorite = previousFavorites.some((r) => r.id === recipeId);

        let updatedFavorites = [...previousFavorites];

        if (isCurrentlyFavorite) {
          // Remove from favorites
          updatedFavorites = updatedFavorites.filter((r) => r.id !== recipeId);
        } else {
          // Add to favorites (try to find it in other caches)
          const recipeToAdd = previousRecipe || previousRecipes?.find(r => r.id === recipeId);
          if (recipeToAdd) {
            updatedFavorites.push({ ...recipeToAdd, isFavorite: true });
          }
        }

        queryClient.setQueryData<Recipe[]>(recipeQueryKeys.favorites(), updatedFavorites);
      }

      // Optimistically update individual recipe
      if (previousRecipe) {
        queryClient.setQueryData<Recipe>(recipeQueryKeys.recipe(recipeId), {
          ...previousRecipe,
          isFavorite: !previousRecipe.isFavorite,
        });
      }

      // Optimistically update recipes list
      if (previousRecipes) {
        queryClient.setQueryData<Recipe[]>(recipeQueryKeys.recipes(),
          previousRecipes.map(r => r.id === recipeId ? { ...r, isFavorite: !r.isFavorite } : r)
        );
      }

      // Return context for rollback
      return { previousFavorites, previousRecipe, previousRecipes, recipeId };
    },
    onSuccess: (data, recipeId, context) => {
        if (data.isFavorite) {
            toast.success("Added to favorites");
        } else {
            toast.success("Removed from favorites");
        }
    },
    onError: (err, recipeId, context) => {
      toast.error("Failed to update favorite status");
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(recipeQueryKeys.favorites(), context.previousFavorites);
      }
      if (context?.previousRecipe) {
        queryClient.setQueryData(recipeQueryKeys.recipe(context.recipeId), context.previousRecipe);
      }
      if (context?.previousRecipes) {
        queryClient.setQueryData(recipeQueryKeys.recipes(), context.previousRecipes);
      }
    },
    onSettled: (data, error, recipeId) => {
      // Always refetch after error or success to ensure server sync
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.favorites() });
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.recipe(recipeId) });
      queryClient.invalidateQueries({ queryKey: recipeQueryKeys.recipes() });
    },
  });
}
