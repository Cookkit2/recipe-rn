import { isAllowedVideoMediaUrl, normalizeVideoPostUrl } from "./video-source";

interface TikTokMetadata {
  title: string;
  caption: string;
  subtitles: { url: string; language: string }[];
}

/** Read the selected public post, including TikTok's mobile share-page payload. */
export function extractTikTokMetadata(html: string, sourceUrl: string): TikTokMetadata | undefined {
  const normalized = normalizeVideoPostUrl(sourceUrl);
  if (!normalized || !new URL(normalized).hostname.endsWith("tiktok.com")) return;
  const expectedId = new URL(normalized).pathname.match(/\/video\/(\d+)/)?.[1];
  for (const script of html
    .slice(0, 2_000_000)
    .matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/\bid\s*=\s*["']__UNIVERSAL_DATA_FOR_REHYDRATION__["']/i.test(script[1] ?? "")) continue;
    try {
      const data = JSON.parse(script[2] ?? "");
      const scope = data.__DEFAULT_SCOPE__;
      for (const key of ["webapp.video-detail", "webapp.reflow.video.detail"]) {
        const detail = scope?.[key];
        const item = detail?.itemInfo?.itemStruct;
        if (
          !item ||
          !/^\d{5,25}$/.test(String(item.id)) ||
          (expectedId && String(item.id) !== expectedId)
        )
          continue;
        const tracks: unknown[] = Array.isArray(item.video?.subtitleInfos)
          ? item.video.subtitleInfos.slice(0, 20)
          : [];
        const subtitles = tracks.flatMap((entry) => {
          if (!entry || typeof entry !== "object") return [];
          const track = entry as Record<string, unknown>;
          if (
            track.Format !== "webvtt" ||
            !isAllowedVideoMediaUrl(track.Url) ||
            (typeof track.Size === "number" && track.Size > 128_000)
          )
            return [];
          return [{ url: track.Url, language: String(track.LanguageCodeName ?? "").slice(0, 40) }];
        });
        subtitles.sort(
          (a, b) => Number(b.language.startsWith("eng")) - Number(a.language.startsWith("eng"))
        );
        return {
          title:
            typeof detail.shareMeta?.title === "string"
              ? detail.shareMeta.title.slice(0, 500)
              : "TikTok recipe",
          caption: typeof item.desc === "string" ? item.desc.slice(0, 32_000) : "",
          subtitles: [...new Map(subtitles.map((track) => [track.url, track])).values()].slice(
            0,
            2
          ),
        };
      }
    } catch {
      // Ignore missing or malformed public metadata and retain the video fallback.
    }
  }
}

/** Keep cue text as evidence; timestamps, cue IDs, styles and notes are not recipe steps. */
export function extractWebVttText(source: string): string {
  if (source.length > 128_000 || !/^\uFEFF?WEBVTT(?:\s|$)/.test(source)) return "";
  const cues: string[] = [];
  for (const block of source.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = block.split("\n");
    if (/^(?:NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0] ?? "")) continue;
    const timestamp = lines.findIndex((line) =>
      /^\s*(?:\d{2}:)?\d{2}:\d{2}\.\d{3}\s+-->\s+/.test(line)
    );
    if (timestamp < 0) continue;
    const text = lines
      .slice(timestamp + 1)
      .join(" ")
      .replace(/<[^>]*>/g, "")
      .replace(
        /&(amp|lt|gt|nbsp|quot);/g,
        (_, name: string) => ({ amp: "&", lt: "<", gt: ">", nbsp: " ", quot: '"' })[name] ?? ""
      )
      .trim();
    if (text && cues.at(-1) !== text) cues.push(text);
  }
  return cues.join("\n").slice(0, 12_000);
}
