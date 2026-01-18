/**
 * NoAuth YouTube Service Implementation (MVP)
 *
 * Uses noembed.com for basic video metadata and web scraping for transcripts.
 * No API key required - suitable for MVP and low-volume usage.
 *
 * Limitations:
 * - No video description
 * - No video duration
 * - Transcript scraping may fail on some videos
 * - Subject to YouTube's web page changes
 */

import type {
  IYouTubeService,
  YouTubeVideoInfo,
  YouTubeTranscript,
  YouTubeDataResult,
} from "./types";
import { YouTubeServiceError } from "./types";
import { log } from "~/utils/logger";

export class NoAuthYouTubeService implements IYouTubeService {
  private readonly NOEMBED_URL = "https://noembed.com/embed";

  /**
   * Fetch video metadata using noembed.com (oEmbed proxy)
   */
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    const url = `${this.NOEMBED_URL}?url=https://www.youtube.com/watch?v=${videoId}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new YouTubeServiceError(
          `Failed to fetch video info: HTTP ${response.status}`,
          "NETWORK_ERROR"
        );
      }

      const data = await response.json();

      if (data.error) {
        throw new YouTubeServiceError(
          data.error || "Video not found",
          "VIDEO_NOT_FOUND"
        );
      }

      return {
        videoId,
        title: data.title || "Untitled Video",
        channelName: data.author_name || "Unknown Channel",
        thumbnailUrl: data.thumbnail_url || "",
        // Note: description and duration are NOT available via noembed
      };
    } catch (error) {
      if (error instanceof YouTubeServiceError) {
        throw error;
      }
      throw new YouTubeServiceError(
        `Network error fetching video info: ${error instanceof Error ? error.message : "Unknown error"}`,
        "NETWORK_ERROR"
      );
    }
  }

  /**
   * Fetch video transcript by scraping YouTube's caption system
   */
  async getTranscript(videoId: string): Promise<YouTubeTranscript> {
    return await this.scrapeTranscript(videoId);
  }

  /**
   * Fetch both video info and transcript together
   * Uses Promise.allSettled to handle partial failures gracefully
   */
  async getVideoData(videoId: string): Promise<YouTubeDataResult> {
    const [videoInfoResult, transcriptResult] = await Promise.allSettled([
      this.getVideoInfo(videoId),
      this.getTranscript(videoId),
    ]);

    // Video info is required - throw if it failed
    if (videoInfoResult.status === "rejected") {
      throw new YouTubeServiceError(
        `Failed to fetch video: ${videoInfoResult.reason}`,
        "VIDEO_NOT_FOUND"
      );
    }

    // Transcript is optional - log warning if it failed
    const transcript =
      transcriptResult.status === "fulfilled"
        ? transcriptResult.value
        : undefined;

    if (transcriptResult.status === "rejected") {
      log.warn(
        `Could not fetch transcript for ${videoId}:`,
        transcriptResult.reason
      );
    }

    return {
      videoInfo: videoInfoResult.value,
      transcript,
      hasFullMetadata: false, // NoAuth service doesn't provide full metadata
    };
  }

  /**
   * This service does not provide full metadata
   */
  hasFullMetadata(): boolean {
    return false;
  }

  /**
   * Scrape transcript from YouTube video page
   * This extracts captions from the ytInitialPlayerResponse object
   */
  private async scrapeTranscript(videoId: string): Promise<YouTubeTranscript> {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      // Fetch the video page
      const pageResponse = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!pageResponse.ok) {
        throw new YouTubeServiceError(
          `Failed to fetch video page: HTTP ${pageResponse.status}`,
          "NETWORK_ERROR"
        );
      }

      const pageHtml = await pageResponse.text();

      // Extract caption URL from ytInitialPlayerResponse
      const captionUrl = this.extractCaptionUrl(pageHtml);

      if (!captionUrl) {
        throw new YouTubeServiceError(
          "No captions available for this video",
          "NO_CAPTIONS"
        );
      }

      // Fetch the caption XML
      const captionResponse = await fetch(captionUrl);

      if (!captionResponse.ok) {
        throw new YouTubeServiceError(
          `Failed to fetch captions: HTTP ${captionResponse.status}`,
          "NETWORK_ERROR"
        );
      }

      const captionXml = await captionResponse.text();

      return this.parseTranscriptXml(captionXml);
    } catch (error) {
      if (error instanceof YouTubeServiceError) {
        throw error;
      }
      throw new YouTubeServiceError(
        `Error scraping transcript: ${error instanceof Error ? error.message : "Unknown error"}`,
        "PARSE_ERROR"
      );
    }
  }

  /**
   * Extract caption track URL from YouTube page HTML
   * Looks for ytInitialPlayerResponse JSON object and extracts caption tracks
   */
  private extractCaptionUrl(html: string): string | null {
    // Find ytInitialPlayerResponse in the page
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);

    if (!match) {
      log.warn("Could not find ytInitialPlayerResponse in page");
      return null;
    }

    try {
      const jsonStr = match[1];
      if (!jsonStr) {
        return null;
      }
      const playerResponse = JSON.parse(jsonStr);

      const captions =
        playerResponse?.captions?.playerCaptionsTracklistRenderer
          ?.captionTracks;

      if (!captions || captions.length === 0) {
        log.warn("No caption tracks found in player response");
        return null;
      }

      // Prefer English captions
      const englishTrack = captions.find(
        (track: { languageCode: string }) =>
          track.languageCode === "en" || track.languageCode?.startsWith("en-")
      );

      // Fall back to first available track
      const selectedTrack = englishTrack || captions[0];

      return selectedTrack?.baseUrl || null;
    } catch (error) {
      log.error("Error parsing player response:", error);
      return null;
    }
  }

  /**
   * Parse YouTube caption XML into transcript format
   */
  private parseTranscriptXml(xml: string): YouTubeTranscript {
    const segments: YouTubeTranscript["segments"] = [];

    // Match <text start="X" dur="Y">content</text> elements
    const matches = xml.matchAll(
      /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g
    );

    for (const match of matches) {
      const startStr = match[1];
      const durationStr = match[2];
      const textStr = match[3];
      
      if (startStr && durationStr && textStr) {
        segments.push({
          start: parseFloat(startStr),
          duration: parseFloat(durationStr),
          text: this.decodeHtmlEntities(textStr),
        });
      }
    }

    if (segments.length === 0) {
      throw new YouTubeServiceError(
        "Could not parse any transcript segments",
        "PARSE_ERROR"
      );
    }

    // Combine all segments into full text
    const fullText = segments.map((s) => s.text).join(" ");

    return {
      text: fullText,
      segments,
      language: "en", // Default to English
    };
  }

  /**
   * Decode HTML entities commonly found in YouTube captions
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
