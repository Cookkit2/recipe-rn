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
import Constants from "expo-constants";

const API_KEY =
  process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_YOUTUBE_API_KEY;

export class AuthYouTubeService implements IYouTubeService {
  private readonly BASE_URL = "https://www.googleapis.com/youtube/v3";
  private readonly noAuthService: NoAuthYouTubeService;

  constructor() {
    // Use NoAuth service for transcript scraping
    this.noAuthService = new NoAuthYouTubeService();
  }

  /**
   * Fetch video info using YouTube Data API v3
   */
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    if (!API_KEY) {
      throw new YouTubeServiceError(
        "YouTube API key not configured. Set EXPO_PUBLIC_YOUTUBE_API_KEY.",
        "API_ERROR"
      );
    }

    const url = `${this.BASE_URL}/videos?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 403) {
          throw new YouTubeServiceError(
            "YouTube API quota exceeded or API key invalid",
            "RATE_LIMITED"
          );
        }

        throw new YouTubeServiceError(
          errorData.error?.message || `API error: HTTP ${response.status}`,
          "API_ERROR"
        );
      }

      const data = await response.json();

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
      throw new YouTubeServiceError(
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
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
