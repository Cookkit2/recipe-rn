/**
 * YouTube Service Types
 * Interface definitions for the YouTube service abstraction layer
 */

/**
 * Core video information fetched from YouTube
 */
export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  description?: string; // Only available with auth (YouTube Data API)
  duration?: string; // ISO 8601 duration, only available with auth
}

/**
 * Transcript data extracted from YouTube captions
 */
export interface YouTubeTranscript {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  language: string;
}

/**
 * Combined result from YouTube service
 */
export interface YouTubeDataResult {
  videoInfo: YouTubeVideoInfo;
  transcript?: YouTubeTranscript;
  hasFullMetadata: boolean;
}

/**
 * Abstract interface - both NoAuth and Auth services implement this
 * This allows easy swapping between implementations
 */
export interface IYouTubeService {
  /**
   * Fetch basic video information
   */
  getVideoInfo(videoId: string): Promise<YouTubeVideoInfo>;

  /**
   * Fetch video transcript/captions
   */
  getTranscript(videoId: string): Promise<YouTubeTranscript>;

  /**
   * Fetch both video info and transcript together
   */
  getVideoData(videoId: string): Promise<YouTubeDataResult>;

  /**
   * Check if this service provides full metadata (description, duration, etc.)
   */
  hasFullMetadata(): boolean;
}

/**
 * Error types specific to YouTube operations
 */
export class YouTubeServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "VIDEO_NOT_FOUND"
      | "NO_CAPTIONS"
      | "NETWORK_ERROR"
      | "RATE_LIMITED"
      | "API_ERROR"
      | "PARSE_ERROR"
  ) {
    super(message);
    this.name = "YouTubeServiceError";
  }
}
