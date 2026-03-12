/**
 * Recipe Import - React Query Hooks
 *
 * Unified hooks for importing recipes from any URL (YouTube or websites).
 * Provides loading states, progress tracking, and cache invalidation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import {
  recipeImportApi,
  type RecipeImportStatus,
  getImportProgress as getProgress,
  getImportStatusMessage as getStatusMessage,
} from "~/data/api/recipeImportApi";
import { recipeQueryKeys } from "./recipeQueryKeys";
import { analyzeUrl, type UrlAnalysisResult } from "~/utils/url-utils";
import type { YouTubeImportResult } from "~/types/ScrappedRecipe";

// Re-export for convenience
export { getProgress as getImportProgress, getStatusMessage as getImportStatusMessage };
export type { RecipeImportStatus };

/**
 * Hook to import a recipe from any supported URL
 *
 * This is the main unified import hook that:
 * 1. Detects URL type (YouTube or website)
 * 2. Routes to appropriate handler
 * 3. Extracts recipe with AI if needed
 * 4. Saves to database
 * 5. Generates shopping list
 *
 * @returns Object containing:
 *   - importRecipe: Function to trigger import (mutate)
 *   - importRecipeAsync: Function to trigger import with promise (mutateAsync)
 *   - importStatus: Current import status (idle, analyzing, fetching, processing, saving, done, error)
 *   - urlAnalysis: URL type analysis result
 *   - reset: Function to reset state
 *   - isPending: Whether import is in progress
 *   - error: Error if import failed
 *   - isSuccess: Whether import succeeded
 *
 * @example
 * ```tsx
 * const { importRecipe, importStatus, isPending } = useImportRecipe();
 *
 * const handleImport = () => {
 *   importRecipe("https://www.youtube.com/watch?v=example");
 * };
 *
 * console.log(importStatus); // "analyzing", "fetching", "processing", etc.
 * ```
 */
export function useImportRecipe() {
  const queryClient = useQueryClient();
  const [importStatus, setImportStatus] = useState<RecipeImportStatus>("idle");
  const [urlAnalysis, setUrlAnalysis] = useState<UrlAnalysisResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (url: string): Promise<YouTubeImportResult> => {
      // Analyze URL first
      const analysis = analyzeUrl(url);
      setUrlAnalysis(analysis);

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
    setUrlAnalysis(null);
    mutation.reset();
  }, [mutation]);

  return {
    ...mutation,
    importStatus,
    urlAnalysis,
    reset,
    // Convenience methods
    importRecipe: mutation.mutate,
    importRecipeAsync: mutation.mutateAsync,
  };
}

/**
 * Hook to analyze a URL without importing
 *
 * Provides URL type detection for user feedback without triggering the full
 * import process. Useful for showing URL type (YouTube vs website) in UI.
 *
 * @returns Object containing:
 *   - analyze: Function to analyze a URL
 *   - reset: Function to reset analysis state
 *   - analysis: Current URL analysis result
 *   - isYouTube: Whether the URL is a YouTube URL
 *   - isWebsite: Whether the URL is a website URL
 *   - isValid: Whether the URL is valid and supported
 *
 * @example
 * ```tsx
 * const { analyze, isYouTube, isValid } = useAnalyzeUrl();
 *
 * <TextInput
 *   onChangeText={(text) => analyze(text)}
 *   placeholder="Paste recipe URL..."
 * />
 * {isValid && isYouTube && <Text>YouTube URL detected!</Text>}
 * ```
 */
export function useAnalyzeUrl() {
  const [analysis, setAnalysis] = useState<UrlAnalysisResult | null>(null);

  const analyze = useCallback((url: string) => {
    if (!url.trim()) {
      setAnalysis(null);
      return null;
    }
    const result = analyzeUrl(url);
    setAnalysis(result);
    return result;
  }, []);

  const reset = useCallback(() => {
    setAnalysis(null);
  }, []);

  return {
    analyze,
    reset,
    analysis,
    isYouTube: analysis?.type === "youtube",
    isWebsite: analysis?.type === "website",
    isValid: analysis?.isValid ?? false,
  };
}

/**
 * Validation helper for URL input
 *
 * Validates a recipe URL and returns detailed validation results.
 * Use this for form validation before triggering import.
 *
 * @param url - The URL string to validate
 * @returns Object containing:
 *   - isValid: Whether the URL is valid and supported
 *   - error: Error message if validation fails
 *   - type: URL type ("youtube" or "website") if valid
 *
 * @example
 * ```tsx
 * const { isValid, error, type } = validateRecipeUrl(url);
 *
 * if (!isValid) {
 *   return <Text style={{ color: "red" }}>{error}</Text>;
 * }
 *
 * return <Text>Importing from {type}...</Text>;
 * ```
 */
export function validateRecipeUrl(url: string): {
  isValid: boolean;
  error?: string;
  type?: "youtube" | "website";
} {
  if (!url.trim()) {
    return { isValid: false, error: "Please enter a URL" };
  }

  const analysis = analyzeUrl(url);

  if (!analysis.isValid) {
    return { isValid: false, error: "Please enter a valid URL" };
  }

  // Only YouTube and generic websites are currently supported for import.
  if (analysis.type !== "youtube" && analysis.type !== "website") {
    return { isValid: false, error: "Unsupported URL type" };
  }

  return { isValid: true, type: analysis.type };
}
