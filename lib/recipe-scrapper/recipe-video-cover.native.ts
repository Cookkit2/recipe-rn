import { requireOptionalNativeModule } from "expo";
import { log } from "~/utils/logger";
import type { RecipeVideoEvidence, RecipeVideoOptions } from "~/types/RecipeVideo";
import { normalizeVideoPostUrl } from "./shared/video-source";
import { videoCoverFramesScript } from "./shared/video-cover";
/** Sample decoded public-player frames without downloading its blocked MP4 or recording audio. */
export async function readRecipeVideoCoverFrames(
  url: string,
  options: RecipeVideoOptions = {}
): Promise<RecipeVideoEvidence["frames"]> {
  options.signal?.throwIfAborted();
  const native = requireOptionalNativeModule<{
    sampleVideoCoverFrames?: (
      url: string,
      script: string
    ) => Promise<{ frames: string; reason?: string }>;
  }>("CookkitVideo");
  const normalized = normalizeVideoPostUrl(url);
  if (!normalized || !native?.sampleVideoCoverFrames) return [];
  const address = new URL(normalized);
  const postId = address.hostname.endsWith("tiktok.com")
    ? address.pathname.match(/\/video\/(\d+)/)?.[1]
    : undefined;
  if (postId) {
    address.hostname = "www.tiktok.com";
    address.pathname = `/player/v1/${postId}`;
    address.search = "autoplay=1&muted=1&controls=0";
  }
  const result = await native.sampleVideoCoverFrames(address.toString(), videoCoverFramesScript());
  options.signal?.throwIfAborted();
  if (typeof result.frames !== "string" || result.frames.length > 1_500_000) return [];
  const frames: unknown = JSON.parse(result.frames);
  if (!Array.isArray(frames)) return [];
  log.debug?.("Recipe cover player sampled", {
    frames: frames.length,
    reason: result.reason?.slice(0, 60),
  });
  return frames
    .slice(0, 8)
    .filter(
      (frame): frame is RecipeVideoEvidence["frames"][number] =>
        !!frame &&
        typeof frame === "object" &&
        Number.isFinite(frame.timestamp) &&
        frame.timestamp >= 0 &&
        frame.mimeType === "image/jpeg" &&
        typeof frame.data === "string" &&
        frame.data.length > 0 &&
        frame.data.length <= 180000 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(frame.data)
    );
}
