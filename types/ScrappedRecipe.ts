/**
 * YouTube Recipe Import - Type Definitions
 * Types for importing recipes from YouTube videos using AI analysis
 */

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description?: string;
  channelName: string;
  thumbnailUrl: string;
  duration?: string; // ISO 8601 duration (only with auth)
  publishedAt?: string;
}

export interface YouTubeTranscript {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  language: string;
}

export interface RecipeAnalysisResult {
  isCookingVideo: boolean;
  confidence: number; // 0-1
  recipe?: GeneratedRecipe;
  errorMessage?: string;
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficultyStars: number; // 1-5
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  steps: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  tags: string[];
  sourceUrl: string; // Original YouTube URL
  calories?: number;
}

export type YouTubeImportStatus =
  | "idle"
  | "validating-url"
  | "fetching-metadata"
  | "fetching-transcript"
  | "analyzing"
  | "generating-recipe"
  | "comparing-pantry"
  | "complete"
  | "error";

export interface YouTubeImportState {
  status: YouTubeImportStatus;
  videoInfo?: YouTubeVideoInfo;
  analysisResult?: RecipeAnalysisResult;
  shoppingList?: ShoppingListResultYT;
  error?: string;
}

/**
 * Shopping list result from pantry comparison
 */
export interface ShoppingListResultYT {
  missingIngredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  availableIngredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    stockQuantity: number;
    stockUnit: string;
  }>;
}

/**
 * Import result returned from the YouTube Recipe API
 */
export interface YouTubeImportResult {
  success: boolean;
  recipe?: {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    prepMinutes: number;
    cookMinutes: number;
    difficultyStars: number;
    servings: number;
    sourceUrl?: string;
    calories?: number;
    tags?: string[];
  };
  shoppingList?: ShoppingListResultYT;
  error?: string;
}

/**
 * Validation result for quick URL checking
 */
export interface YouTubeValidationResult {
  isValid: boolean;
  isCooking: boolean;
  confidence: number;
  title?: string;
  thumbnailUrl?: string;
}
