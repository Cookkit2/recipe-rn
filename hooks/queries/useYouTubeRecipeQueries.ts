/**
 * YouTube Recipe Import - React Query Hooks
 *
 * Provides hooks for validating YouTube URLs and importing recipes
 * with proper caching, loading states, and cache invalidation.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { youtubeRecipeApi } from "~/data/api/youtubeRecipeApi";
import { recipeQueryKeys } from "./recipeQueryKeys";
import type {
  YouTubeImportStatus,
  YouTubeImportResult,
  YouTubeValidationResult,
} from "~/types/YouTubeRecipe";

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
 */
export function useValidateYouTubeUrl(url: string) {
  return useQuery({
    queryKey: youtubeQueryKeys.validate(url),
    queryFn: () => youtubeRecipeApi.validateCookingVideo(url),
    enabled: !!url && url.length > 10, // Only run if URL looks valid
    staleTime: 5 * 60 * 1000, // 5 minutes - video info doesn't change often
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1, // Only retry once on failure
  });
}

/**
 * Hook to lazily validate a YouTube URL
 * Returns a function to trigger validation manually
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
        const data = await youtubeRecipeApi.validateCookingVideo(url);
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
 * Includes status tracking for progress indication.
 */
export function useImportYouTubeRecipe() {
  const queryClient = useQueryClient();
  const [importStatus, setImportStatus] = useState<YouTubeImportStatus>("idle");

  const mutation = useMutation({
    mutationFn: async (url: string): Promise<YouTubeImportResult> => {
      return youtubeRecipeApi.importRecipeFromYouTube(url, setImportStatus);
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
 * Hook to get shopping list for a recipe
 *
 * @param recipeId - ID of the recipe to get shopping list for
 */
export function useYouTubeRecipeShoppingList(recipeId: string | undefined) {
  return useQuery({
    queryKey: recipeQueryKeys.shoppingList(recipeId ?? ""),
    queryFn: () => youtubeRecipeApi.getShoppingListForRecipe(recipeId!),
    enabled: !!recipeId,
    staleTime: 2 * 60 * 1000, // 2 minutes - depends on pantry state
  });
}

/**
 * Status display helpers
 */
export const IMPORT_STATUS_MESSAGES: Record<YouTubeImportStatus, string> = {
  idle: "Ready to import",
  "validating-url": "Validating YouTube URL...",
  "fetching-metadata": "Fetching video information...",
  "fetching-transcript": "Extracting video transcript...",
  analyzing: "Analyzing video with AI...",
  "generating-recipe": "Generating recipe...",
  "comparing-pantry": "Checking your pantry...",
  complete: "Import complete!",
  error: "Import failed",
};

export function getImportStatusMessage(status: YouTubeImportStatus): string {
  return IMPORT_STATUS_MESSAGES[status];
}

/**
 * Progress percentage helper
 */
export function getImportProgress(status: YouTubeImportStatus): number {
  const progressMap: Record<YouTubeImportStatus, number> = {
    idle: 0,
    "validating-url": 10,
    "fetching-metadata": 25,
    "fetching-transcript": 40,
    analyzing: 60,
    "generating-recipe": 80,
    "comparing-pantry": 90,
    complete: 100,
    error: 0,
  };
  return progressMap[status];
}
