/**
 * Auth YouTube Service Implementation
 *
 * Uses YouTube Data API v3 for full video metadata.
 * Requires API key - provides richer data than NoAuth service.
 *
 * Benefits over NoAuth:
 * - Full video description
 * - Video duration
 * - More reliable metadata
 * - Higher rate limits
 *
 * Note: Transcript still requires scraping as YouTube API doesn't expose captions
 */

import type {
  IYouTubeService,
  YouTubeVideoInfo,
  YouTubeTranscript,
  YouTubeDataResult,
} from "./types";
import { YouTubeServiceError } from "./types";
import { NoAuthYouTubeService } from "./NoAuthYouTubeService";
import { supabase } from "../../supabase/supabase-client";

export class AuthYouTubeService implements IYouTubeService {
  private readonly noAuthService: NoAuthYouTubeService;

  constructor() {
    // Use NoAuth service for transcript scraping
    this.noAuthService = new NoAuthYouTubeService();
  }

  /**
   * Fetch video info using YouTube Data API v3 proxy Edge Function
   */
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    if (!supabase) {
      throw new YouTubeServiceError(
        "Supabase client not configured. Cannot invoke youtube proxy.",
        "API_ERROR"
      );
    }

    try {
      const { data, error } = await supabase.functions.invoke("youtube-proxy", {
        body: { videoId },
      });

      if (error) {
        throw new YouTubeServiceError(`API error: HTTP ${error.status || 500}`, "API_ERROR");
      }

      if (data?.error) {
        if (data.status === 403) {
          throw new YouTubeServiceError(
            "YouTube API quota exceeded or API key invalid",
            "RATE_LIMITED"
          );
        }
        throw new YouTubeServiceError(`API error: ${data.error}`, "API_ERROR");
      }

      if (!data.items || data.items.length === 0) {
        throw new YouTubeServiceError("Video not found or is private", "VIDEO_NOT_FOUND");
      }

      const video = data.items[0];

      return {
        videoId,
        title: video.snippet.title,
        channelName: video.snippet.channelTitle,
        thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
        description: video.snippet.description,
        duration: video.contentDetails.duration, // ISO 8601 format
      };
    } catch (error) {
      if (error instanceof YouTubeServiceError) {
        throw error;
      }

      // Return a generic network error message instead of preserving standard error instances
      // to prevent accidental secret leakage
      throw new YouTubeServiceError(
        "Network error: Failed to connect to YouTube API",
        "NETWORK_ERROR"
      );
    }
  }

  /**
   * Fetch transcript - delegates to NoAuth service since API doesn't provide captions
   */
  async getTranscript(videoId: string): Promise<YouTubeTranscript> {
    // YouTube Data API doesn't expose captions content
    // We still need to scrape transcripts
    return await this.noAuthService.getTranscript(videoId);
  }

  /**
   * Fetch both video info and transcript
   */
  async getVideoData(videoId: string): Promise<YouTubeDataResult> {
    const [videoInfoResult, transcriptResult] = await Promise.allSettled([
      this.getVideoInfo(videoId),
      this.getTranscript(videoId),
    ]);

    if (videoInfoResult.status === "rejected") {
      throw videoInfoResult.reason;
    }

    return {
      videoInfo: videoInfoResult.value,
      transcript: transcriptResult.status === "fulfilled" ? transcriptResult.value : undefined,
      hasFullMetadata: true, // Auth service provides full metadata
    };
  }

  /**
   * This service provides full metadata
   */
  hasFullMetadata(): boolean {
    return true;
  }
}
