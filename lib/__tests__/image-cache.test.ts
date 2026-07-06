import { Platform } from "react-native";
import { Image } from "expo-image";
import { log } from "~/utils/logger";

// Mock the dependencies
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("expo-image", () => ({
  Image: {
    configureCache: jest.fn(),
  },
}));

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("resolveImageCacheTier", () => {
  it("resolves to 'low' for devices with < 3 GB memory", () => {
    const { resolveImageCacheTier } = require("../image-cache");
    expect(resolveImageCacheTier({ totalMemoryBytes: 2 * 1024 * 1024 * 1024 })).toBe("low");
  });

  it("resolves to 'high' for devices with >= 6 GB memory", () => {
    const { resolveImageCacheTier } = require("../image-cache");
    expect(resolveImageCacheTier({ totalMemoryBytes: 8 * 1024 * 1024 * 1024 })).toBe("high");
  });

  it("resolves to 'mid' for median devices (3-6 GB)", () => {
    const { resolveImageCacheTier } = require("../image-cache");
    expect(resolveImageCacheTier({ totalMemoryBytes: 4 * 1024 * 1024 * 1024 })).toBe("mid");
  });

  it("falls back to 'mid' when no capability signal is available (default)", () => {
    const { resolveImageCacheTier } = require("../image-cache");
    expect(resolveImageCacheTier()).toBe("mid");
    expect(resolveImageCacheTier({})).toBe("mid");
  });

  it("treats non-finite memory values as 'no signal' (safe fallback to mid)", () => {
    const { resolveImageCacheTier } = require("../image-cache");
    expect(resolveImageCacheTier({ totalMemoryBytes: NaN })).toBe("mid");
    expect(resolveImageCacheTier({ totalMemoryBytes: Infinity })).toBe("mid");
  });

  it("low tier limits are strictly smaller than high tier limits", () => {
    const { IMAGE_CACHE_TIER_LIMITS } = require("../image-cache");
    const low = IMAGE_CACHE_TIER_LIMITS.low;
    const high = IMAGE_CACHE_TIER_LIMITS.high;
    expect(low.maxDiskSize).toBeLessThan(high.maxDiskSize);
    expect(low.maxMemoryCost).toBeLessThan(high.maxMemoryCost);
    expect(low.maxMemoryCount).toBeLessThan(high.maxMemoryCount);
  });

  it("high tier preserves the historical defaults (500MB / 100MB / 200)", () => {
    const { IMAGE_CACHE_TIER_LIMITS } = require("../image-cache");
    expect(IMAGE_CACHE_TIER_LIMITS.high).toEqual({
      maxDiskSize: 500 * 1024 * 1024,
      maxMemoryCost: 100 * 1024 * 1024,
      maxMemoryCount: 200,
    });
  });
});

describe("resolveImageCacheConfig", () => {
  it("returns the tier map entry for the resolved tier", () => {
    const { resolveImageCacheConfig, IMAGE_CACHE_TIER_LIMITS } = require("../image-cache");
    expect(resolveImageCacheConfig({ totalMemoryBytes: 2 * 1024 * 1024 * 1024 })).toEqual(
      IMAGE_CACHE_TIER_LIMITS.low
    );
  });

  it("defaults to the mid tier config when no signal is provided", () => {
    const { resolveImageCacheConfig, IMAGE_CACHE_TIER_LIMITS } = require("../image-cache");
    expect(resolveImageCacheConfig()).toEqual(IMAGE_CACHE_TIER_LIMITS.mid);
  });
});

describe("initImageCache", () => {
  const originalDev = (globalThis as any).__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__DEV__ = true;
    Platform.OS = "ios";

    // Reset the module-level `initialized` guard before each test so each
    // assertion observes a fresh first-call. isolateModules alone does not
    // reset the in-memory flag because the module is already cached.
    const mod = require("../image-cache");
    mod.__resetImageCacheForTests();
  });

  afterAll(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  it("configures cache with mid-tier defaults when no signal is available (default)", () => {
    const { initImageCache } = require("../image-cache");
    initImageCache();

    expect(Image.configureCache).toHaveBeenCalledTimes(1);
    expect(Image.configureCache).toHaveBeenCalledWith({
      maxDiskSize: 250 * 1024 * 1024,
      maxMemoryCost: 64 * 1024 * 1024,
      maxMemoryCount: 140,
    });
    expect(log.info).toHaveBeenCalledWith("[image-cache] Cache configured (iOS)");
  });

  it("applies low-tier limits when a low-memory capability signal resolves the tier", () => {
    const { initImageCache, IMAGE_CACHE_TIER_LIMITS } = require("../image-cache");
    // initImageCache() resolves the default (no-signal) tier internally; to
    // exercise a non-default tier we pass explicit config derived from the
    // tier map, mirroring how _layout.tsx would compose them.
    initImageCache(IMAGE_CACHE_TIER_LIMITS.low);

    expect(Image.configureCache).toHaveBeenCalledWith(
      expect.objectContaining(IMAGE_CACHE_TIER_LIMITS.low)
    );
  });

  it("merges custom config with the resolved-tier defaults", () => {
    const { initImageCache } = require("../image-cache");
    initImageCache({
      maxDiskSize: 100 * 1024 * 1024,
      maxMemoryCount: 50,
    });

    expect(Image.configureCache).toHaveBeenCalledTimes(1);
    expect(Image.configureCache).toHaveBeenCalledWith({
      maxDiskSize: 100 * 1024 * 1024, // explicit override
      maxMemoryCost: 64 * 1024 * 1024, // resolved-tier default (mid)
      maxMemoryCount: 50, // explicit override
    });
  });

  it("is idempotent (only calls configureCache once)", () => {
    const { initImageCache } = require("../image-cache");
    initImageCache();
    initImageCache();
    initImageCache();

    expect(Image.configureCache).toHaveBeenCalledTimes(1);
  });

  it("skips configuring cache on non-iOS platforms and logs an info message in dev", () => {
    Platform.OS = "android";
    const { initImageCache } = require("../image-cache");

    initImageCache();

    expect(Image.configureCache).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(
      "[image-cache] iOS-only configureCache skipped on android; native cache (Glide/Browser) handles this"
    );
  });

  it("catches errors thrown by configureCache and logs them in dev", () => {
    const { initImageCache } = require("../image-cache");
    const testError = new Error("Cache configuration failed");
    (Image.configureCache as jest.Mock).mockImplementationOnce(() => {
      throw testError;
    });

    expect(() => initImageCache()).not.toThrow();
    expect(log.error).toHaveBeenCalledWith("[image-cache] configureCache failed:", testError);
  });

  it("does not log info or errors when __DEV__ is false", () => {
    (globalThis as any).__DEV__ = false;
    const mod = require("../image-cache");
    mod.__resetImageCacheForTests();
    const { initImageCache } = mod;

    // iOS success
    initImageCache();
    expect(log.info).not.toHaveBeenCalled();

    // iOS failure
    mod.__resetImageCacheForTests();
    (Image.configureCache as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Test");
    });
    initImageCache();
    expect(log.error).not.toHaveBeenCalled();

    // android skip
    mod.__resetImageCacheForTests();
    Platform.OS = "android";
    initImageCache();
    expect(log.info).not.toHaveBeenCalled();
  });

  // --- Issue #733: initImageCache is now deferred behind requestIdleCallback ---
  // Assert it is safe to call from a deferred (idle) context and remains
  // idempotent there, mirroring the RevenueCat deferral pattern in _layout.tsx.
  it("is safe to call from a deferred (requestIdleCallback-style) context", () => {
    let freshInitImageCache: any;
    jest.isolateModules(() => {
      freshInitImageCache = require("../image-cache").initImageCache;
    });

    // Simulate the deferred-call shape used in app/_layout.tsx: the init runs
    // later, after first paint. It must configure the cache exactly once and
    // not throw when invoked out of the synchronous mount path.
    const deferred = jest.fn(() => freshInitImageCache());
    expect(() => deferred()).not.toThrow();
    expect(deferred).toHaveBeenCalledTimes(1);
    expect(Image.configureCache).toHaveBeenCalledTimes(1);

    // A second deferred invocation is still a no-op (idempotency holds when
    // called repeatedly from deferred contexts).
    deferred();
    expect(Image.configureCache).toHaveBeenCalledTimes(1);
  });
});
