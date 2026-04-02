/**
 * YouTube URL Parsing & Validation Utilities
 * Handles various YouTube URL formats and extracts video IDs
 */

/**
 * Extract video ID from various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID (mobile)
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  // Clean the URL
  const cleanUrl = url.trim();

  // Pattern covers all common YouTube URL formats
  // Video IDs are always 11 characters containing alphanumeric, dashes, and underscores
  const patterns = [
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
    // Short URL: youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
    // Old embed URL: youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
    // Shorts URL: youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
    // Live URL: youtube.com/live/VIDEO_ID
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate if a string is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Build a standard YouTube watch URL from a video ID
 */
export function buildYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Build a YouTube thumbnail URL from a video ID
 * Quality options: default, mqdefault, hqdefault, sddefault, maxresdefault
 */
export function buildYouTubeThumbnailUrl(
  videoId: string,
  quality: "default" | "mq" | "hq" | "sd" | "maxres" = "hq"
): string {
  const qualityMap = {
    default: "default",
    mq: "mqdefault",
    hq: "hqdefault",
    sd: "sddefault",
    maxres: "maxresdefault",
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Build a YouTube embed URL from a video ID
 */
export function buildYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

const COOKING_KEYWORDS = [
  "recipe",
  "cook",
  "cooking",
  "bake",
  "baking",
  "chef",
  "kitchen",
  "food",
  "meal",
  "dish",
  "ingredient",
  "how to make",
  "how to cook",
  "homemade",
  "preparation",
  "cuisine",
  "dinner",
  "lunch",
  "breakfast",
  "dessert",
  "snack",
  "appetizer",
  "sauce",
  "soup",
  "salad",
  "pasta",
  "rice",
  "chicken",
  "beef",
  "fish",
  "vegetarian",
  "vegan",
  "grilled",
  "fried",
  "roasted",
  "steamed",
  "boiled",
];

const COOKING_KEYWORDS_REGEX = new RegExp(`\\b(${COOKING_KEYWORDS.join("|")})\\b`, "gi");

/**
 * Quick keyword-based check to determine if a video might be cooking-related
 * based on the title. This is a lightweight pre-check before full AI analysis.
 */
export function quickCookingCheck(title: string): {
  isCooking: boolean;
  confidence: number;
} {
  const matches = title.match(COOKING_KEYWORDS_REGEX);
  const uniqueMatches = matches ? new Set(matches.map((m) => m.toLowerCase())).size : 0;
  const confidence = Math.min(uniqueMatches / 3, 1);

  return {
    isCooking: confidence > 0.3,
    confidence,
  };
}

/**
 * Normalize a YouTube URL to standard watch format
 */
export function normalizeYouTubeUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return buildYouTubeWatchUrl(videoId);
}
