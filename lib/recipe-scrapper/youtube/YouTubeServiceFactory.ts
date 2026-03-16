/**
 * YouTube Service Factory
 * Creates the appropriate YouTube service instance based on configuration
 */

import type { IYouTubeService } from "./types";
import { NoAuthYouTubeService } from "./NoAuthYouTubeService";
// import { AuthYouTubeService } from './AuthYouTubeService'; // Future implementation

export type YouTubeServiceType = "noauth" | "auth";

/**
 * Create a YouTube service instance of the specified type
 */
export function createYouTubeService(type: YouTubeServiceType = "noauth"): IYouTubeService {
  switch (type) {
    case "noauth":
      return new NoAuthYouTubeService();
    case "auth":
      throw new Error("AuthYouTubeService not yet implemented. Use 'noauth' for MVP.");
    default:
      return new NoAuthYouTubeService();
  }
}

/**
 * Get the default YouTube service based on environment configuration
 * For MVP, always returns NoAuth service
 * Future: Will check for API key and return Auth service if available
 */
export function getDefaultYouTubeService(): IYouTubeService {
  // Check if YouTube Data API key is configured
  // const hasApiKey = !!process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

  // For MVP, always use noauth implementation
  // This uses noembed for metadata and scraping for transcripts
  return createYouTubeService("noauth");
}

/**
 * Singleton instance for convenience
 */
let defaultServiceInstance: IYouTubeService | null = null;

export function getYouTubeServiceInstance(): IYouTubeService {
  if (!defaultServiceInstance) {
    defaultServiceInstance = getDefaultYouTubeService();
  }
  return defaultServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetYouTubeServiceInstance(): void {
  defaultServiceInstance = null;
}
