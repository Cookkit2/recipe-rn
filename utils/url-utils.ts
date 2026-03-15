/**
 * URL Parsing & Detection Utilities
 * Handles detection of URL types (YouTube, website, etc.)
 */

import { isValidYouTubeUrl, extractYouTubeVideoId } from "./youtube-utils";

/**
 * TikTok URL patterns
 * Supports: tiktok.com/@user/video/123, vm.tiktok.com/abc, vt.tiktok.com/abc
 */
const TIKTOK_PATTERNS = [
  /^https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
  /^https?:\/\/(?:vm|vt)\.tiktok\.com\/[\w-]+/i,
  /^https?:\/\/(?:www\.)?tiktok\.com\/t\/[\w-]+/i,
];

/**
 * Instagram URL patterns
 * Supports: instagram.com/p/abc, instagram.com/reel/abc, instagram.com/reels/abc
 */
const INSTAGRAM_PATTERNS = [
  /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels)\/([\w-]+)/i,
  /^https?:\/\/(?:www\.)?instagr\.am\/(?:p|reel|reels)\/([\w-]+)/i,
];

/**
 * Check if a URL is a valid TikTok video URL
 */
export function isValidTikTokUrl(url: string): boolean {
  return TIKTOK_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Check if a URL is a valid Instagram post/reel URL
 */
export function isValidInstagramUrl(url: string): boolean {
  return INSTAGRAM_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Extract TikTok video ID from URL (if available)
 */
export function extractTikTokVideoId(url: string): string | null {
  const match = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/i);
  // @ts-expect-error
  return match ? match[1] : null;
}

/**
 * Extract Instagram post/reel ID from URL
 */
export function extractInstagramPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|reels)\/([\w-]+)/i);
  // @ts-expect-error
  return match ? match[1] : null;
}

/**
 * Supported URL types for recipe import
 */
export type RecipeUrlType = "youtube" | "tiktok" | "instagram" | "website" | "unknown";

/**
 * Result of URL analysis
 */
export interface UrlAnalysisResult {
  type: RecipeUrlType;
  isValid: boolean;
  url: string;
  normalizedUrl: string;
  videoId?: string; // For YouTube URLs
  postId?: string; // For TikTok/Instagram URLs
  domain?: string; // For website URLs
}

/**
 * Extract domain from a URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch (error) {
    // Invalid URL format - return null for graceful handling
    return null;
  }
}

/**
 * Check if a URL is a valid HTTP/HTTPS URL
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.protocol === "http:" || urlObj.protocol === "https:") && urlObj.hostname.length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Analyze a URL and determine its type
 */
export function analyzeUrl(url: string): UrlAnalysisResult {
  const trimmedUrl = url.trim();

  // Attempt to extract a YouTube video ID once and branch on the result
  const videoId = extractYouTubeVideoId(trimmedUrl);
  if (videoId) {
    return {
      type: "youtube",
      isValid: true,
      url: trimmedUrl,
      normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
    };
  }

  // Check if it's a TikTok URL
  if (isValidTikTokUrl(trimmedUrl)) {
    const videoId = extractTikTokVideoId(trimmedUrl);
    return {
      type: "tiktok",
      isValid: true,
      url: trimmedUrl,
      normalizedUrl: trimmedUrl,
      postId: videoId || undefined,
    };
  }

  // Check if it's an Instagram URL
  if (isValidInstagramUrl(trimmedUrl)) {
    const postId = extractInstagramPostId(trimmedUrl);
    return {
      type: "instagram",
      isValid: true,
      url: trimmedUrl,
      normalizedUrl: trimmedUrl,
      postId: postId || undefined,
    };
  }

  // Check if it's a valid HTTP URL (website)
  if (isValidHttpUrl(trimmedUrl)) {
    const domain = extractDomain(trimmedUrl);
    return {
      type: "website",
      isValid: true,
      url: trimmedUrl,
      normalizedUrl: trimmedUrl,
      domain: domain || undefined,
    };
  }

  // Unknown or invalid URL
  return {
    type: "unknown",
    isValid: false,
    url: trimmedUrl,
    normalizedUrl: trimmedUrl,
  };
}

/**
 * Check if URL is likely a recipe website based on domain
 * Known recipe sites get higher confidence
 */
export const KNOWN_RECIPE_DOMAINS = [
  "allrecipes.com",
  "foodnetwork.com",
  "epicurious.com",
  "bonappetit.com",
  "seriouseats.com",
  "food52.com",
  "tasty.co",
  "delish.com",
  "simplyrecipes.com",
  "cookinglight.com",
  "eatingwell.com",
  "myrecipes.com",
  "thekitchn.com",
  "budgetbytes.com",
  "skinnytaste.com",
  "minimalistbaker.com",
  "halfbakedharvest.com",
  "pinchofyum.com",
  "sallysbakingaddiction.com",
  "damndelicious.net",
  "recipetineats.com",
  "cafedelites.com",
  "gimmesomeoven.com",
  "hostthetoast.com",
  "cookieandkate.com",
  "loveandlemons.com",
  "smittenkitchen.com",
  "101cookbooks.com",
  "bbcgoodfood.com",
  "jamieoliver.com",
  "nigella.com",
  "marmiton.org",
  "chefkoch.de",
  "cookpad.com",
];

/**
 * Check if a domain is a known recipe website
 */
export function isKnownRecipeDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
  return KNOWN_RECIPE_DOMAINS.some(
    (known) => normalizedDomain === known || normalizedDomain.endsWith("." + known)
  );
}

/**
 * Get a user-friendly name for the URL source
 */
export function getUrlSourceName(urlAnalysis: UrlAnalysisResult): string {
  switch (urlAnalysis.type) {
    case "youtube":
      return "YouTube";
    case "tiktok":
      return "TikTok";
    case "instagram":
      return "Instagram";
    case "website":
      return urlAnalysis.domain || "Website";
    default:
      return "Unknown";
  }
}
