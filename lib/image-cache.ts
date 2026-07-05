import { Platform } from "react-native";
import { Image } from "expo-image";
import type { ImageCacheConfig } from "expo-image";
import { log } from "~/utils/logger";

const DEFAULT_MAX_DISK_SIZE = 500 * 1024 * 1024; // 500 MB
const DEFAULT_MAX_MEMORY_COST = 100 * 1024 * 1024; // 100 MB
const DEFAULT_MAX_MEMORY_COUNT = 200;

let initialized = false;

/**
 * Configures the global image cache. Idempotent – safe to call multiple times;
 * only runs once per process. On iOS, sets disk/memory limits via expo-image's
 * configureCache. On Android and Web, no-op (Glide / browser handle cache).
 */
export function initImageCache(config?: Partial<ImageCacheConfig>): void {
  if (initialized) return;
  initialized = true;

  if (Platform.OS !== "ios") {
    if (__DEV__) {
      log.info(
        "[image-cache] iOS-only configureCache skipped on " +
          Platform.OS +
          "; native cache (Glide/Browser) handles this"
      );
    }
    return;
  }

  try {
    Image.configureCache({
      maxDiskSize: config?.maxDiskSize ?? DEFAULT_MAX_DISK_SIZE,
      maxMemoryCost: config?.maxMemoryCost ?? DEFAULT_MAX_MEMORY_COST,
      maxMemoryCount: config?.maxMemoryCount ?? DEFAULT_MAX_MEMORY_COUNT,
      ...config,
    });
    if (__DEV__) {
      log.info("[image-cache] Cache configured (iOS)");
    }
  } catch (err) {
    if (__DEV__) {
      log.error("[image-cache] configureCache failed:", err);
    }
  }
}
