/**
 * YouTube Recipe Import - React Query Hooks
 *
 * Provides hooks for validating YouTube URLs and importing recipes
 * with proper caching, loading states, and cache invalidation.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { recipeImportApi, type RecipeImportStatus } from "~/data/api/recipeImportApi";
import { recipeQueryKeys } from "./recipeQueryKeys";
import type {
  YouTubeImportStatus,
  YouTubeImportResult,
  YouTubeValidationResult,
} from "~/types/ScrappedRecipe";

/**
 * Query keys for YouTube-related queries
 */
export const youtubeQueryKeys = {
  all: ["youtube"] as const,
  validate: (url: string) => [...youtubeQueryKeys.all, "validate", url] as const,
  import: () => [...youtubeQueryKeys.all, "import"] as const,
} as const;

/**
 * Hook to validate a YouTube URL for cooking content
 *
 * This is a lightweight check that:
 * 1. Validates the URL format
 * 2. Fetches basic video metadata
 * 3. Does keyword-based cooking detection
 *
 * Use this for quick validation before triggering full import.
 * Query is only enabled when URL looks valid (length > 10).
 *
 * @param url - YouTube URL to validate
 * @returns React Query result with validation data including:
 *   - isValid: Whether the video is cooking-related
 *   - videoTitle: Title of the video
 *   - thumbnail: Video thumbnail URL
 *   - confidence: Confidence score for cooking detection
 *
 * @example
 * ```tsx
 * const { data: validation, isLoading } = useValidateYouTubeUrl(url);
 *
 * {validation?.isValid && (
 *   <Image source={{ uri: validation.thumbnail }} />
 * )}
 * ```
 */
export function useValidateYouTubeUrl(url: string) {
  return useQuery({
    queryKey: youtubeQueryKeys.validate(url),
    queryFn: () => recipeImportApi.validateCookingVideo(url),
    enabled: !!url && url.length > 10, // Only run if URL looks valid
    staleTime: 5 * 60 * 1000, // 5 minutes - video info doesn't change often
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1, // Only retry once on failure
  });
}

/**
 * Hook to lazily validate a YouTube URL
 *
 * Returns a function to trigger validation manually. Checks cache first
 * before making network requests. Useful for validation on button press
 * or form submission rather than on URL change.
 *
 * @returns Object containing:
 *   - validate: Function to trigger validation with URL string
 *   - reset: Function to reset validation state
 *   - isValidating: Whether validation is in progress
 *   - result: Validation result if successful
 *   - error: Error if validation failed
 *
 * @example
 * ```tsx
 * const { validate, isValidating, result } = useLazyValidateYouTubeUrl();
 *
 * const handleCheck = async () => {
 *   const validation = await validate(url);
 *   if (validation?.isValid) {
 *     // Proceed with import
 *   }
 * };
 *
 * <Button onPress={handleCheck} disabled={isValidating}>
 *   Check URL
 * </Button>
 * ```
 */
export function useLazyValidateYouTubeUrl() {
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<YouTubeValidationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const validate = useCallback(
    async (url: string) => {
      setIsValidating(true);
      setError(null);

      try {
        // Check cache first
        const cached = queryClient.getQueryData<YouTubeValidationResult>(
          youtubeQueryKeys.validate(url)
        );

        if (cached) {
          setResult(cached);
          setIsValidating(false);
          return cached;
        }

        // Fetch and cache
        const data = await recipeImportApi.validateCookingVideo(url);
        queryClient.setQueryData(youtubeQueryKeys.validate(url), data);
        setResult(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Validation failed");
        setError(error);
        throw error;
      } finally {
        setIsValidating(false);
      }
    },
    [queryClient]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsValidating(false);
  }, []);

  return {
    validate,
    reset,
    isValidating,
    result,
    error,
  };
}

/**
 * Hook to import a recipe from YouTube
 *
 * This is the main import hook that:
 * 1. Validates the URL
 * 2. Fetches video metadata and transcript
 * 3. Analyzes with AI to extract recipe
 * 4. Saves to database
 * 5. Generates shopping list
 *
 * Includes status tracking for progress indication. Invalidates all
 * recipe queries on success to include the new recipe.
 *
 * @returns Object containing:
 *   - importRecipe: Function to trigger import (mutate)
 *   - importRecipeAsync: Function to trigger import with promise (mutateAsync)
 *   - importStatus: Current import status for progress indication
 *   - reset: Function to reset state
 *   - isPending: Whether import is in progress
 *   - error: Error if import failed
 *   - isSuccess: Whether import succeeded
 *   - data: Import result if successful
 *
 * @example
 * ```tsx
 * const { importRecipe, importStatus, isPending } = useImportYouTubeRecipe();
 *
 * const handleImport = () => {
 *   importRecipe("https://www.youtube.com/watch?v=example");
 * };
 *
 * <Text>Status: {importStatus}</Text>
 * <Button onPress={handleImport} disabled={isPending}>
 *   Import Recipe
 * </Button>
 * ```
 */
export function useImportYouTubeRecipe() {
  const queryClient = useQueryClient();
  const [importStatus, setImportStatus] = useState<RecipeImportStatus>("idle");

  const mutation = useMutation({
    mutationFn: async (url: string): Promise<YouTubeImportResult> => {
      return recipeImportApi.importRecipeFromUrl(url, setImportStatus);
    },

    onSuccess: (result) => {
      if (result.success && result.recipe) {
        // Invalidate recipe queries to include new recipe
        queryClient.invalidateQueries({
          queryKey: recipeQueryKeys.recipes(),
        });
        queryClient.invalidateQueries({
          queryKey: recipeQueryKeys.available(),
        });
        queryClient.invalidateQueries({
          queryKey: recipeQueryKeys.recommendations(),
        });
      }
    },

    onSettled: () => {
      // Reset status after a delay to allow UI to show completion state
      setTimeout(() => {
        setImportStatus("idle");
      }, 2000);
    },
  });

  const reset = useCallback(() => {
    setImportStatus("idle");
    mutation.reset();
  }, [mutation]);

  return {
    ...mutation,
    importStatus,
    reset,
    // Convenience methods
    importRecipe: mutation.mutate,
    importRecipeAsync: mutation.mutateAsync,
  };
}

/**
 * Hook to get shopping list for a YouTube-imported recipe
 *
 * Returns shopping list for a recipe, comparing required ingredients
 * with pantry items. Query is only enabled when a valid recipeId is provided.
 *
 * @param recipeId - ID of the recipe to get shopping list for (undefined to disable)
 * @returns React Query result with shopping list data
 *
 * @example
 * ```tsx
 * const { data: shoppingList, isLoading } = useYouTubeRecipeShoppingList(recipeId);
 *
 * {shoppingList?.map((item) => (
 *   <Text key={item.id}>{item.name} - {item.quantity}</Text>
 * ))}
 * ```
 */
export function useYouTubeRecipeShoppingList(recipeId: string | undefined) {
  return useQuery({
    queryKey: recipeQueryKeys.shoppingList(recipeId ?? ""),
    queryFn: () => recipeImportApi.getShoppingListForRecipe(recipeId!),
    enabled: !!recipeId,
    staleTime: 2 * 60 * 1000, // 2 minutes - depends on pantry state
  });
}

// Re-export status helpers from the unified API
export {
  getImportStatusMessage,
  getImportProgress,
  IMPORT_STATUS_MESSAGES,
} from "~/data/api/recipeImportApi";
