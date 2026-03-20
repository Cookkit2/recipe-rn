/**
 * YouTube Service Factory
 * Creates the appropriate YouTube service instance based on configuration
 */

import type { IYouTubeService } from "./types";
import { NoAuthYouTubeService } from "./NoAuthYouTubeService";
import Constants from "expo-constants";
import { AuthYouTubeService } from "./AuthYouTubeService";

export type YouTubeServiceType = "noauth" | "auth";

/**
 * Create a YouTube service instance of the specified type
 */
export function createYouTubeService(type: YouTubeServiceType = "noauth"): IYouTubeService {
  switch (type) {
    case "noauth":
      return new NoAuthYouTubeService();
    case "auth":
      return new AuthYouTubeService();
    default:
      return new NoAuthYouTubeService();
  }
}

/**
 * Get the default YouTube service based on environment configuration
 * Returns Auth service if API key is available, otherwise falls back to NoAuth service
 */
export function getDefaultYouTubeService(): IYouTubeService {
  // Check if YouTube Data API key is configured
  const hasApiKey = !!(
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_YOUTUBE_API_KEY
  );

  return createYouTubeService(hasApiKey ? "auth" : "noauth");
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
