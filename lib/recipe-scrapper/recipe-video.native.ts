import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import type {
  RecipeVideoEvidence,
  RecipeVideoInput,
  RecipeVideoOptions,
} from "~/types/RecipeVideo";
import {
  isAllowedVideoMediaUrl,
  normalizeVideoPostUrl,
  videoResolverScript,
} from "./shared/video-source";
import { transcribeVideoAudio } from "./video-speech";

interface PreparedVideo {
  duration: number;
  frames: RecipeVideoEvidence["frames"];
  audioChunks: { uri: string; start: number }[];
  warnings?: string[];
}
interface NativeVideoModule {
  resolveVideo(
    url: string,
    script: string
  ): Promise<{ mediaUrl: string; title: string; caption: string; userAgent: string }>;
  prepareVideo(uri: string, directory: string): Promise<PreparedVideo>;
}
const maxBytes = 40_000_000;

export async function readRecipeVideo(
  input: RecipeVideoInput,
  options: RecipeVideoOptions = {}
): Promise<RecipeVideoEvidence> {
  options.signal?.throwIfAborted();
  const native = requireOptionalNativeModule<NativeVideoModule>("CookkitVideo");
  if (!native)
    throw new Error("Update Cookkit to import video files, or paste the full recipe caption.");
  const files = await import("expo-file-system/legacy");
  if (!files.cacheDirectory) throw new Error("Couldn't create temporary space for this video.");
  const directory = `${files.cacheDirectory}recipe-video-${Date.now()}-${Math.random().toString(36).slice(2)}/`;
  await files.makeDirectoryAsync(directory, { intermediates: true });
  let title = "Shared video";
  let caption = "";
  const destination = `${directory}video.mp4`;
  options.onPhase?.("reading-video");
  try {
    if (input.videoUri) {
      const info = await files.getInfoAsync(input.videoUri);
      if (!info.exists || info.isDirectory || ("size" in info && info.size > maxBytes))
        throw new Error("Choose a video smaller than 40 MB.");
      await files.copyAsync({ from: input.videoUri, to: destination });
    } else {
      const url = input.url && normalizeVideoPostUrl(input.url);
      if (!url) throw new Error("Choose a video or share a valid TikTok or Instagram post.");
      const source = await native.resolveVideo(url, videoResolverScript());
      options.signal?.throwIfAborted();
      if (!isAllowedVideoMediaUrl(source.mediaUrl))
        throw new Error(
          "Couldn't access this video. Choose a saved video or paste the full caption."
        );
      title = source.title.slice(0, 500);
      caption = source.caption.slice(0, 32_000);
      const headers: Record<string, string> = { Referer: url };
      if (source.userAgent && source.userAgent.length < 500 && !/[\r\n]/.test(source.userAgent))
        headers["User-Agent"] = source.userAgent;
      let cancelled = false;
      const download = files.createDownloadResumable(
        source.mediaUrl,
        destination,
        { headers },
        (progress) => {
          if (
            progress.totalBytesWritten > maxBytes ||
            progress.totalBytesExpectedToWrite > maxBytes
          ) {
            cancelled = true;
            void download.cancelAsync().catch(() => {});
          }
        }
      );
      const abort = () => {
        cancelled = true;
        void download.cancelAsync().catch(() => {});
      };
      const timeout = setTimeout(abort, 45_000);
      options.signal?.addEventListener("abort", abort, { once: true });
      try {
        const result = await download.downloadAsync();
        if (cancelled || !result || result.status !== 200)
          throw new Error("Couldn't download this video. Choose the saved video instead.");
      } catch {
        options.signal?.throwIfAborted();
        throw new Error(
          "Couldn't download this video. Choose the saved video or paste the full caption."
        );
      } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", abort);
      }
    }
    options.signal?.throwIfAborted();
    const info = await files.getInfoAsync(destination);
    if (!info.exists || info.isDirectory || info.size > maxBytes)
      throw new Error("Choose a video smaller than 40 MB.");
    const prepared = await native.prepareVideo(destination, directory);
    options.signal?.throwIfAborted();
    const speech = await transcribeVideoAudio(
      prepared.audioChunks,
      input.language || "en-US",
      Platform.OS,
      options
    );
    return {
      title,
      caption,
      frames: prepared.frames,
      transcript: speech.transcript,
      warnings: [
        ...(prepared.warnings ?? []),
        ...speech.warnings,
        "Check the amounts and steps against the original video. Video frames are sampled.",
      ],
    };
  } finally {
    await files.deleteAsync(directory, { idempotent: true }).catch(() => {});
  }
}
