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
import { YoutubeTranscript } from "youtube-transcript";

/**
 * Interface for transcript fetching strategies
 */
interface ITranscriptFetcher {
  name: string;
  fetch: (videoId: string) => Promise<YouTubeTranscript | null>;
}

export class NoAuthYouTubeService implements IYouTubeService {
  private readonly NOEMBED_URL = "https://noembed.com/embed";
  
  // InnerTube API configuration (mimics Android YouTube app)
  private readonly INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player";
  private readonly INNERTUBE_CONTEXT = {
    client: {
      clientName: "ANDROID",
      clientVersion: "19.09.37",
      androidSdkVersion: 30,
      hl: "en",
      gl: "US",
      utcOffsetMinutes: 0,
    },
  };
  
  /**
   * Array of transcript fetchers to try in order
   */
  private readonly transcriptFetchers: ITranscriptFetcher[] = [
    {
      name: "InnerTube API (Android)",
      fetch: (videoId) => this.fetchTranscriptViaInnerTube(videoId),
    },
    // {
    //   name: "youtube-transcript package",
    //   fetch: (videoId) => this.fetchTranscriptViaPackage(videoId),
    // },
    // {
    //   name: "proxy API",
    //   fetch: (videoId) => this.fetchTranscriptViaProxy(videoId),
    // },
    // {
    //   name: "direct scraping",
    //   fetch: (videoId) => this.fetchTranscriptDirect(videoId),
    // },
  ];

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
   * Scrape transcript from YouTube video
   * Tries multiple methods in order of reliability, exits early on success
   */
  private async scrapeTranscript(videoId: string): Promise<YouTubeTranscript> {
    for (const fetcher of this.transcriptFetchers) {
      try {
        log.debug(`Transcript: Trying ${fetcher.name}...`);
        const transcript = await fetcher.fetch(videoId);
        
        if (transcript) {
          log.debug(`Transcript: Successfully fetched via ${fetcher.name}`);
          return transcript;
        }
        
        log.debug(`Transcript: ${fetcher.name} returned no results`);
      } catch (e) {
        log.debug(`Transcript: ${fetcher.name} failed: ${e}`);
      }
    }

    throw new YouTubeServiceError(
      "Could not fetch transcript using any method",
      "NO_CAPTIONS"
    );
  }

  /**
   * Fetch transcript via YouTube's InnerTube API (mimics Android app)
   * This is the same approach used by the Python youtube-transcript-api library
   */
  private async fetchTranscriptViaInnerTube(videoId: string): Promise<YouTubeTranscript | null> {
    try {
      log.debug(`Transcript: Trying InnerTube API for ${videoId}`);
      
      // Step 1: Call InnerTube Player API to get caption track URLs
      const playerResponse = await fetch(this.INNERTUBE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "X-YouTube-Client-Name": "3", // ANDROID
          "X-YouTube-Client-Version": "19.09.37",
        },
        body: JSON.stringify({
          context: this.INNERTUBE_CONTEXT,
          videoId: videoId,
          contentCheckOk: true,
          racyCheckOk: true,
        }),
      });

      if (!playerResponse.ok) {
        log.debug(`Transcript: InnerTube API returned ${playerResponse.status}`);
        return null;
      }

      const playerData = await playerResponse.json();
      
      // Step 2: Extract caption tracks from response
      const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captions || captions.length === 0) {
        log.debug("Transcript: No caption tracks found in InnerTube response");
        return null;
      }

      log.debug(`Transcript: Found ${captions.length} caption tracks`);
      
      // Find English or auto-generated caption
      let captionTrack = captions.find(
        (track: { languageCode: string; kind?: string }) => 
          track.languageCode === "en" || track.languageCode === "en-US"
      );
      
      // Fallback to first available or auto-generated
      if (!captionTrack) {
        captionTrack = captions.find(
          (track: { kind?: string }) => track.kind === "asr" // Auto-generated
        ) || captions[0];
      }

      if (!captionTrack?.baseUrl) {
        log.debug("Transcript: No valid caption URL found");
        return null;
      }

      log.debug(`Transcript: Using caption track: ${captionTrack.languageCode} (${captionTrack.kind || 'manual'})`);

      // Step 3: Fetch the transcript - try JSON first, fall back to XML
      const segments = await this.fetchAndParseCaptions(captionTrack.baseUrl);
      
      if (!segments || segments.length === 0) {
        log.debug("Transcript: No valid segments from InnerTube");
        return null;
      }

      const fullText = segments.map((s) => s.text).join(" ");
      log.debug(`Transcript: InnerTube parsed ${segments.length} segments, ${fullText.length} chars`);

      return {
        text: fullText,
        segments,
        language: captionTrack.languageCode || "en",
      };
    } catch (error) {
      log.warn(`Transcript: InnerTube API error: ${error}`);
      if (error instanceof Error) {
        log.debug(`Transcript: Error details: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Fetch and parse captions from a YouTube caption URL
   * Handles both JSON (json3) and XML formats
   */
  private async fetchAndParseCaptions(
    baseUrl: string
  ): Promise<YouTubeTranscript["segments"] | null> {
    const headers = {
      "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
    };

    // Try JSON format first (json3) - easier to parse
    try {
      const jsonUrl = baseUrl + "&fmt=json3";
      log.debug("Transcript: Trying JSON format (json3)");
      
      const response = await fetch(jsonUrl, { headers });
      if (response.ok) {
        const text = await response.text();
        log.debug(`Transcript: Got ${text.length} chars, starts with: ${text.substring(0, 50)}`);
        log.debug(`Transcript: JSON format text: ${text}`);
        
        // Use existing parser which handles both JSON and XML
        const result = this.parseTranscriptXml(text);
        if (result.segments && result.segments.length > 0) {
          return result.segments;
        }
      }
    } catch (e) {
      log.debug(`Transcript: JSON format failed: ${e}`);
    }

    // Fall back to plain XML format (no fmt parameter)
    try {
      log.debug("Transcript: Trying plain XML format");
      const response = await fetch(baseUrl, { headers });
      
      if (!response.ok) {
        log.debug(`Transcript: XML fetch returned ${response.status}`);
        return null;
      }

      const text = await response.text();
      log.debug(`Transcript: Got ${text.length} chars, starts with: ${text.substring(0, 50)}`);
      
      const result = this.parseTranscriptXml(text);
      if (result.segments && result.segments.length > 0) {
        return result.segments;
      }
    } catch (e) {
      log.debug(`Transcript: XML format failed: ${e}`);
    }

    return null;
  }

  /**
   * Fetch transcript using the youtube-transcript npm package
   */
  private async fetchTranscriptViaPackage(videoId: string): Promise<YouTubeTranscript | null> {
    try {
      log.debug(`Transcript: Trying youtube-transcript package for ${videoId}`);
      
      // First try with English
      let transcriptItems;
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: "en",
        });
        log.debug(`Transcript: youtube-transcript (en) returned ${transcriptItems?.length || 0} items`);
      } catch (enError) {
        log.debug(`Transcript: youtube-transcript (en) failed: ${enError}`);
        // Try without language specification (gets default/auto-generated)
        try {
          transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
          log.debug(`Transcript: youtube-transcript (default) returned ${transcriptItems?.length || 0} items`);
        } catch (defaultError) {
          log.debug(`Transcript: youtube-transcript (default) failed: ${defaultError}`);
          throw defaultError;
        }
      }

      if (!transcriptItems || transcriptItems.length === 0) {
        log.debug("Transcript: youtube-transcript returned no items");
        return null;
      }

      log.debug(`Transcript: youtube-transcript returned ${transcriptItems.length} items`);
      log.debug(`Transcript: First item sample: ${JSON.stringify(transcriptItems[0])}`);

      const segments: YouTubeTranscript["segments"] = transcriptItems.map((item) => ({
        start: item.offset / 1000, // Convert ms to seconds
        duration: item.duration / 1000,
        text: item.text,
      }));

      const fullText = segments.map((s) => s.text).join(" ");
      log.debug(`Transcript: Total text length: ${fullText.length} chars`);

      return {
        text: fullText,
        segments,
        language: "en",
      };
    } catch (error) {
      // Log full error details
      log.warn(`Transcript: youtube-transcript package error: ${error}`);
      if (error instanceof Error) {
        log.debug(`Transcript: Error name: ${error.name}, message: ${error.message}`);
        if (error.stack) {
          log.debug(`Transcript: Stack: ${error.stack.substring(0, 500)}`);
        }
      }
      return null;
    }
  }

  /**
   * Fetch transcript via a public transcript API
   */
  private async fetchTranscriptViaProxy(videoId: string): Promise<YouTubeTranscript | null> {
    // Use a public transcript API
    const apiUrl = `https://yt.lemnoslife.com/noKey/captions?videoId=${videoId}&lang=en`;
    
    try {
      log.debug(`Transcript: Trying proxy API for ${videoId}`);
      const response = await fetch(apiUrl, {
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        log.debug(`Transcript: Proxy API returned ${response.status}`);
        return null;
      }

      const data = await response.json();
      log.debug(`Transcript: Proxy API response keys: ${Object.keys(data).join(', ')}`);
      
      // Handle the lemnoslife API response format
      if (data.captions && Array.isArray(data.captions)) {
        const segments: YouTubeTranscript["segments"] = [];
        
        for (const caption of data.captions) {
          if (caption.text) {
            segments.push({
              start: caption.start || 0,
              duration: caption.dur || caption.duration || 0,
              text: caption.text,
            });
          }
        }
        
        if (segments.length > 0) {
          log.debug(`Transcript: Parsed ${segments.length} segments from proxy`);
          return {
            text: segments.map(s => s.text).join(" "),
            segments,
            language: "en",
          };
        }
      }
      
      // Alternative response format
      if (data.subtitles || data.transcript) {
        const items = data.subtitles || data.transcript;
        if (Array.isArray(items)) {
          const segments = items.map((item: { text?: string; start?: number; dur?: number }) => ({
            start: item.start || 0,
            duration: item.dur || 0,
            text: item.text || "",
          })).filter((s: { text: string }) => s.text);
          
          if (segments.length > 0) {
            return {
              text: segments.map((s: { text: string }) => s.text).join(" "),
              segments,
              language: "en",
            };
          }
        }
      }

      return null;
    } catch (error) {
      log.debug(`Transcript: Proxy API error: ${error}`);
      return null;
    }
  }

  /**
   * Direct YouTube page scraping method (original approach)
   */
  private async fetchTranscriptDirect(videoId: string): Promise<YouTubeTranscript | null> {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      const pageResponse = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!pageResponse.ok) {
        return null;
      }

      const pageHtml = await pageResponse.text();
      log.debug(`Transcript: Fetched page HTML, length: ${pageHtml.length}`);

      const captionUrl = this.extractCaptionUrl(pageHtml);

      if (!captionUrl) {
        const hasPlayerResponse = pageHtml.includes("ytInitialPlayerResponse");
        const hasCaptions = pageHtml.includes("captionTracks");
        log.warn(`Transcript debug: hasPlayerResponse=${hasPlayerResponse}, hasCaptions=${hasCaptions}`);
        return null;
      }

      log.debug(`Transcript: Found caption URL: ${captionUrl.substring(0, 100)}...`);

      const captionResponse = await fetch(captionUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "*/*",
          "Referer": pageUrl,
          "Origin": "https://www.youtube.com",
        },
      });

      if (!captionResponse.ok) {
        return null;
      }

      const captionData = await captionResponse.text();
      log.debug(`Transcript: Fetched caption data, length: ${captionData.length}`);
      
      if (!captionData || captionData.length === 0) {
        return null;
      }

      log.debug(`Transcript: Caption data preview: ${captionData.substring(0, 500)}`);
      return this.parseTranscriptXml(captionData);
    } catch (error) {
      log.debug(`Transcript: Direct fetch error: ${error}`);
      return null;
    }
  }

  /**
   * Extract caption track URL from YouTube page HTML
   * Looks for ytInitialPlayerResponse JSON object and extracts caption tracks
   */
  private extractCaptionUrl(html: string): string | null {
    // Try multiple patterns to find ytInitialPlayerResponse
    // Pattern 1: Standard format with semicolon
    // Pattern 2: Format that might end differently
    const patterns = [
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var|const|let|<\/script>)/s,
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});/s,
      /var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s,
    ];

    let playerResponseJson: string | null = null;
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        playerResponseJson = match[1];
        log.debug(`Transcript: Found player response with pattern ${patterns.indexOf(pattern) + 1}`);
        break;
      }
    }

    if (!playerResponseJson) {
      log.warn("Could not find ytInitialPlayerResponse in page");
      
      // Try to extract JSON directly between markers
      const startMarker = 'ytInitialPlayerResponse = ';
      const startIdx = html.indexOf(startMarker);
      if (startIdx !== -1) {
        const jsonStart = startIdx + startMarker.length;
        // Find matching closing brace
        let braceCount = 0;
        let jsonEnd = jsonStart;
        for (let i = jsonStart; i < html.length && i < jsonStart + 500000; i++) {
          if (html[i] === '{') braceCount++;
          else if (html[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }
        if (jsonEnd > jsonStart) {
          playerResponseJson = html.substring(jsonStart, jsonEnd);
          log.debug(`Transcript: Extracted player response via brace matching, length: ${playerResponseJson.length}`);
        }
      }
    }

    if (!playerResponseJson) {
      return null;
    }

    try {
      const playerResponse = JSON.parse(playerResponseJson);

      const captions =
        playerResponse?.captions?.playerCaptionsTracklistRenderer
          ?.captionTracks;

      if (!captions || captions.length === 0) {
        log.warn("No caption tracks found in player response");
        log.debug(`Transcript: Player response keys: ${Object.keys(playerResponse || {}).join(', ')}`);
        if (playerResponse?.captions) {
          log.debug(`Transcript: Captions keys: ${Object.keys(playerResponse.captions).join(', ')}`);
        }
        return null;
      }

      log.debug(`Transcript: Found ${captions.length} caption tracks`);
      captions.forEach((track: { languageCode: string; name?: { simpleText?: string } }, i: number) => {
        log.debug(`Transcript: Track ${i}: ${track.languageCode} - ${track.name?.simpleText || 'unknown'}`);
      });

      // Prefer English captions
      const englishTrack = captions.find(
        (track: { languageCode: string }) =>
          track.languageCode === "en" || track.languageCode?.startsWith("en-")
      );

      // Fall back to first available track
      const selectedTrack = englishTrack || captions[0];
      const baseUrl = selectedTrack?.baseUrl;
      
      if (baseUrl) {
        // Ensure we get the full transcript (add fmt=srv3 for JSON format or leave for XML)
        log.debug(`Transcript: Selected track language: ${selectedTrack.languageCode}`);
      }

      return baseUrl || null;
    } catch (error) {
      log.error("Error parsing player response:", error);
      log.debug(`Transcript: JSON parse failed, first 500 chars: ${playerResponseJson.substring(0, 500)}`);
      return null;
    }
  }

  /**
   * Parse YouTube caption data into transcript format
   * Handles both XML format and JSON (srv3) format
   */
  private parseTranscriptXml(data: string): YouTubeTranscript {
    const segments: YouTubeTranscript["segments"] = [];
    
    // Check if it's JSON format (srv3)
    if (data.trim().startsWith('{')) {
      try {
        const json = JSON.parse(data);
        // srv3 format has events array
        if (json.events) {
          for (const event of json.events) {
            if (event.segs) {
              const text = event.segs.map((s: { utf8?: string }) => s.utf8 || '').join('');
              if (text.trim()) {
                segments.push({
                  start: (event.tStartMs || 0) / 1000,
                  duration: (event.dDurationMs || 0) / 1000,
                  text: text.trim(),
                });
              }
            }
          }
        }
        log.debug(`Transcript: Parsed JSON format, found ${segments.length} segments`);
      } catch (e) {
        log.warn("Transcript: Failed to parse as JSON, trying XML");
      }
    }
    
    // Try XML parsing if no segments found yet
    if (segments.length === 0) {
      // Pattern 1: <text start="X" dur="Y">content</text>
      const xmlPattern1 = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
      let matches = data.matchAll(xmlPattern1);
      
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
      
      // Pattern 2: Handle CDATA or nested content for <text> elements
      if (segments.length === 0) {
        const xmlPattern2 = /<text[^>]*start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
        matches = data.matchAll(xmlPattern2);
        
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
      }
      
      // Pattern 3: <timedtext> format with nested <s> elements
      // Format: <p t="0" d="1000"><s>Hello</s><s> world</s></p>
      if (segments.length === 0 && data.includes('<timedtext')) {
        const timedtextPattern = /<p\s+([^>]*)>([\s\S]*?)<\/p>/g;
        matches = data.matchAll(timedtextPattern);
        
        for (const match of matches) {
          const attrs = match[1] || '';
          const innerContent = match[2] || '';
          
          // Extract t and d from attributes
          const tMatch = attrs.match(/\bt="(\d+)"/);
          const dMatch = attrs.match(/\bd="(\d+)"/);
          
          if (!tMatch?.[1] || !dMatch?.[1]) continue;
          
          // Extract text from nested <s> elements, or use direct content
          let textStr = '';
          if (innerContent.includes('<s')) {
            // Extract text from all <s> elements
            const sMatches = innerContent.matchAll(/<s[^>]*>([^<]*)<\/s>/g);
            const texts: string[] = [];
            for (const sMatch of sMatches) {
              if (sMatch[1]) texts.push(sMatch[1]);
            }
            textStr = texts.join('');
          } else {
            // No <s> elements, use direct content
            textStr = innerContent.replace(/<[^>]*>/g, ''); // Strip any tags
          }
          
          if (textStr.trim()) {
            segments.push({
              start: parseInt(tMatch[1], 10) / 1000,
              duration: parseInt(dMatch[1], 10) / 1000,
              text: this.decodeHtmlEntities(textStr),
            });
          }
        }
        
        if (segments.length > 0) {
          log.debug(`Transcript: Parsed timedtext <p><s> format, found ${segments.length} segments`);
        }
      }
      
      log.debug(`Transcript: Parsed XML format, found ${segments.length} segments`);
    }

    if (segments.length === 0) {
      // Log sample of data for debugging
      const hasText = data.includes('<text');
      const hasP = data.includes('<p ');
      const hasTimedtext = data.includes('<timedtext');
      log.warn(`Transcript: No segments found. Format detection: JSON=${data.trim().startsWith('{')}, <text>=${hasText}, <p>=${hasP}, <timedtext>=${hasTimedtext}`);
      log.debug(`Transcript: Sample (200 chars after <body> or start): ${data.includes('<body>') ? data.substring(data.indexOf('<body>'), data.indexOf('<body>') + 200) : data.substring(0, 200)}`);
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
