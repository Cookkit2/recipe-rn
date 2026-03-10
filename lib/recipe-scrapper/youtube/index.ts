/**
 * YouTube Module - Public API
 *
 * This module provides functionality for fetching YouTube video data
 * and analyzing videos for recipe content.
 */

// Types
export type {
  IYouTubeService,
  YouTubeVideoInfo,
  YouTubeTranscript,
  YouTubeDataResult,
} from "./types";
export { YouTubeServiceError } from "./types";

// Service Factory
export {
  createYouTubeService,
  getDefaultYouTubeService,
  getYouTubeServiceInstance,
  resetYouTubeServiceInstance,
} from "./YouTubeServiceFactory";
export type { YouTubeServiceType } from "./YouTubeServiceFactory";

// Service Implementations
export { NoAuthYouTubeService } from "./NoAuthYouTubeService";
export { AuthYouTubeService } from "./AuthYouTubeService";

// Recipe Analyzer
export { RecipeAnalyzer } from "./RecipeAnalyzer";
