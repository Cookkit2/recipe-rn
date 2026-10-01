/**
 * YouTube Service Factory
 * Creates the appropriate YouTube service instance based on configuration
 */

import type { IYouTubeService } from "./types";
import { NoAuthYouTubeService } from "./NoAuthYouTubeService";
import { AuthYouTubeService } from "./AuthYouTubeService";
import { supabase } from "../../supabase/supabase-client";

export type YouTubeServiceType = "noauth" | "auth";

/**
 * Create a YouTube service instance of the specified type
 */
function createYouTubeService(type: YouTubeServiceType = "noauth"): IYouTubeService {
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
 * Returns Auth service if supabase client is available (for Edge Functions proxy), otherwise falls back to NoAuth service
 */
export function getDefaultYouTubeService(): IYouTubeService {
  // Check if Supabase client is configured to use the proxy Edge Function
  const hasSupabaseProxy = !!supabase;

  return createYouTubeService(hasSupabaseProxy ? "auth" : "noauth");
}

/**
 * Singleton instance for convenience
 */
let defaultServiceInstance: IYouTubeService | null = null;

function getYouTubeServiceInstance(): IYouTubeService {
  if (!defaultServiceInstance) {
    defaultServiceInstance = getDefaultYouTubeService();
  }
  return defaultServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
function resetYouTubeServiceInstance(): void {
  defaultServiceInstance = null;
}
