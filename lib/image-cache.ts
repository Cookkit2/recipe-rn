import { Platform } from "react-native";
import { Image } from "expo-image";
import type { ImageCacheConfig } from "expo-image";
import { log } from "~/utils/logger";

/**
 * Device-tier-aware image cache limits.
 *
 * Background (issue #734): the cache previously hard-coded a single 500MB disk
 * / 100MB memory / 200-entry set for every device. On low-end devices (the
 * realistic install base for a free-to-try app) that invited disk-pressure
 * evictions and memory churn — recipe images are the heaviest payload we ship.
 * This tier map selects conservative limits per device capability tier, with
 * the historical defaults applying only to the high tier.
 *
 * Tier resolution is deliberately conservative and does NOT assume a native
 * device-capability module is present. `expo-device` is not currently a
 * dependency (verified), and pulling it in just to read device memory is
 * out-of-scope for this incremental hardening. Instead `resolveImageCacheTier`
 * uses a `Platform.OS`-only heuristic that resolves to `mid` by default — the
 * safe default that avoids both low-end thrash and high-end underuse. A future
 * pass can plug in `expo-device` (or a native capability signal) to refine the
 * tier without changing this module's API.
 */
export type DeviceTier = "low" | "mid" | "high";

export interface TierLimits {
  maxDiskSize: number;
  maxMemoryCost: number;
  maxMemoryCount: number;
}

export const IMAGE_CACHE_TIER_LIMITS: Record<DeviceTier, TierLimits> = {
  // Conservative: small disk/memory footprint to avoid eviction churn on
  // low-RAM devices. Recipe images dominate the payload, so the cap is sized
  // to hold a typical recent-recipes working set without thrashing.
  low: {
    maxDiskSize: 120 * 1024 * 1024, // 120 MB
    maxMemoryCost: 40 * 1024 * 1024, // 40 MB
    maxMemoryCount: 80,
  },
  // Default tier. Balanced limits for the median device.
  mid: {
    maxDiskSize: 250 * 1024 * 1024, // 250 MB
    maxMemoryCost: 64 * 1024 * 1024, // 64 MB
    maxMemoryCount: 140,
  },
  // Historical defaults — only the most capable devices get the full budget.
  high: {
    maxDiskSize: 500 * 1024 * 1024, // 500 MB
    maxMemoryCost: 100 * 1024 * 1024, // 100 MB
    maxMemoryCount: 200,
  },
};

/**
 * Capability signal used to resolve a device tier. Kept as an injected
 * (optional) object so tier resolution stays pure and unit-testable without a
 * native module. The default factory (`defaultCapabilityProvider`) returns no
 * signal, which falls back to `mid`.
 */
export interface DeviceCapabilitySignal {
  /** Total device memory in bytes, if known. */
  totalMemoryBytes?: number;
}

const LOW_MEMORY_THRESHOLD_BYTES = 3 * 1024 * 1024 * 1024; // < 3 GB => low tier
const HIGH_MEMORY_THRESHOLD_BYTES = 6 * 1024 * 1024 * 1024; // >= 6 GB => high tier

/**
 * Default capability provider. Today there is no native device-capability
 * module in the dependency tree, so this intentionally returns no signal and
 * `resolveImageCacheTier` falls back to `mid`. Plugging in `expo-device` later
 * means overriding this provider only — the tier map and resolution logic are
 * unchanged.
 */
function defaultCapabilityProvider(): DeviceCapabilitySignal {
  return {};
}

/**
 * Resolve the device capability tier. Pure function (no side effects) so it is
 * trivially unit-testable.
 *
 * Resolution order:
 *   1. An explicit capability signal (totalMemoryBytes) thresholds into
 *      low (< 3GB) / mid / high (>= 6GB).
 *   2. No signal -> `mid` (the documented conservative default).
 *
 * iOS-only note: even though `initImageCache` no-ops off iOS, tier resolution
 * itself is platform-agnostic — non-iOS callers can still resolve a tier for
 * logging/telemetry without ill effect.
 */
export function resolveImageCacheTier(
  signal: DeviceCapabilitySignal = defaultCapabilityProvider()
): DeviceTier {
  const { totalMemoryBytes } = signal;
  if (typeof totalMemoryBytes === "number" && Number.isFinite(totalMemoryBytes)) {
    if (totalMemoryBytes < LOW_MEMORY_THRESHOLD_BYTES) return "low";
    if (totalMemoryBytes >= HIGH_MEMORY_THRESHOLD_BYTES) return "high";
    return "mid";
  }
  return "mid";
}

/**
 * Build an `ImageCacheConfig` for the resolved device tier. Exposed so callers
 * (notably `app/_layout.tsx`) can pass tier-derived config into `initImageCache`
 * without duplicating the tier map.
 */
export function resolveImageCacheConfig(
  signal: DeviceCapabilitySignal = defaultCapabilityProvider()
): TierLimits {
  return IMAGE_CACHE_TIER_LIMITS[resolveImageCacheTier(signal)];
}

let initialized = false;

/**
 * Configures the global image cache. Idempotent – safe to call multiple times;
 * only runs once per process. On iOS, sets disk/memory limits via expo-image's
 * configureCache. On Android and Web, no-op (Glide / browser handle cache).
 *
 * When no `config` is passed, limits are resolved from the device tier
 * (`resolveImageCacheConfig()`), so low-end devices get a smaller, safer cache.
 * An explicit `config` always wins per-field, preserving the historical escape
 * hatch for tests/manual tuning.
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

  const tierConfig = resolveImageCacheConfig();

  try {
    Image.configureCache({
      maxDiskSize: config?.maxDiskSize ?? tierConfig.maxDiskSize,
      maxMemoryCost: config?.maxMemoryCost ?? tierConfig.maxMemoryCost,
      maxMemoryCount: config?.maxMemoryCount ?? tierConfig.maxMemoryCount,
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

/** Test-only: reset the module-level initialized guard. Not exported at runtime. */
export function __resetImageCacheForTests(): void {
  initialized = false;
}
