export interface YouTubePageMetadata {
  title: string;
  description: string;
  channelName: string;
  duration?: number;
  captionTracks: { url: string; language: string }[];
}

/** Read one JSON object without letting braces inside a video description end it. */
function readObject(text: string, start: number): unknown {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < Math.min(text.length, start + 2_000_000); index++) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === "{") depth++;
    else if (character === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, index + 1));
      } catch {
        return;
      }
    }
  }
}

export function isYouTubeCaptionUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 12_000) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ["www.youtube.com", "youtube.com", "m.youtube.com"].includes(url.hostname) &&
      url.pathname === "/api/timedtext"
    );
  } catch {
    return false;
  }
}

/** Select the requested video, never a recommendation embedded elsewhere in the page. */
export function extractYouTubePageMetadata(
  html: string,
  videoId: string
): YouTubePageMetadata | undefined {
  const marker = /(?:var\s+)?ytInitialPlayerResponse\s*=\s*(?=\{)/g;
  for (const match of html.matchAll(marker)) {
    const value = readObject(html, match.index + match[0].length) as
      | {
          videoDetails?: {
            videoId?: string;
            title?: string;
            shortDescription?: string;
            author?: string;
            lengthSeconds?: string;
          };
          captions?: {
            playerCaptionsTracklistRenderer?: {
              captionTracks?: { baseUrl?: string; languageCode?: string }[];
            };
          };
        }
      | undefined;
    const details = value?.videoDetails;
    if (details?.videoId !== videoId) continue;
    const tracks = value?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    return {
      title:
        typeof details.title === "string" ? details.title.slice(0, 500) : "Shared YouTube video",
      description:
        typeof details.shortDescription === "string"
          ? details.shortDescription.slice(0, 32_000)
          : "",
      channelName: typeof details.author === "string" ? details.author.slice(0, 500) : "",
      duration: Number(details.lengthSeconds) || undefined,
      captionTracks: (Array.isArray(tracks) ? tracks : [])
        .filter((track) => track && isYouTubeCaptionUrl(track.baseUrl))
        .map((track) => ({
          url: track.baseUrl!,
          language: typeof track.languageCode === "string" ? track.languageCode : "",
        }))
        .sort((a, b) => Number(b.language.startsWith("en")) - Number(a.language.startsWith("en")))
        .slice(0, 2),
    };
  }
}

/** Runs in the selected public player after its own JavaScript resolves media signatures. */
export const YOUTUBE_VIDEO_RESOLVER = `((player, videoId) => {
  if (player?.videoDetails?.videoId !== videoId) return;
  const formats = Array.isArray(player.streamingData?.formats) ? player.streamingData.formats : [];
  const media = formats.filter(format => typeof format.url === 'string' &&
    String(format.mimeType || '').startsWith('video/mp4') && (format.audioQuality || format.audioChannels > 0))
    .sort((a,b) => (a.height || 0) - (b.height || 0))[0];
  if (media) return { mediaUrl: media.url, caption: player.videoDetails.shortDescription || '' };
})`;
