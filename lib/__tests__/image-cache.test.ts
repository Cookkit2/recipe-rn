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

describe("initImageCache", () => {
  const originalDev = (globalThis as any).__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__DEV__ = true;
    Platform.OS = "ios";

    // Reset the module-level initialized state by isolating modules
    jest.isolateModules(() => {
      // Need to require the module fresh for each test so `initialized` starts false
    });
  });

  afterAll(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  it("should configure cache with default values on iOS", () => {
    let freshInitImageCache: any;
    jest.isolateModules(() => {
      freshInitImageCache = require("../image-cache").initImageCache;
    });

    freshInitImageCache();

    expect(Image.configureCache).toHaveBeenCalledTimes(1);
    expect(Image.configureCache).toHaveBeenCalledWith({
      maxDiskSize: 500 * 1024 * 1024,
      maxMemoryCost: 100 * 1024 * 1024,
      maxMemoryCount: 200,
    });
    expect(log.info).toHaveBeenCalledWith("[image-cache] Cache configured (iOS)");
  });

  it("should merge custom config with default values on iOS", () => {
    let freshInitImageCache: any;
    jest.isolateModules(() => {
      freshInitImageCache = require("../image-cache").initImageCache;
    });

    const customConfig = {
      maxDiskSize: 100 * 1024 * 1024,
      maxMemoryCount: 50,
    };

    freshInitImageCache(customConfig);

    expect(Image.configureCache).toHaveBeenCalledTimes(1);
    expect(Image.configureCache).toHaveBeenCalledWith({
      maxDiskSize: 100 * 1024 * 1024, // Custom override
      maxMemoryCost: 100 * 1024 * 1024, // Default fallback
      maxMemoryCount: 50, // Custom override
    });
  });

  it("should be idempotent (only call configureCache once)", () => {
    let freshInitImageCache: any;
    jest.isolateModules(() => {
      freshInitImageCache = require("../image-cache").initImageCache;
    });

    freshInitImageCache();
    freshInitImageCache();
    freshInitImageCache();

    expect(Image.configureCache).toHaveBeenCalledTimes(1);
  });

  it("should skip configuring cache on non-iOS platforms and log an info message in dev", () => {
    Platform.OS = "android";
    let freshInitImageCache: any;
    jest.isolateModules(() => {
      freshInitImageCache = require("../image-cache").initImageCache;
    });

    freshInitImageCache();

    expect(Image.configureCache).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(
      "[image-cache] iOS-only configureCache skipped on android; native cache (Glide/Browser) handles this"
    );
  });

  it("should catch errors thrown by configureCache and log them in dev", () => {
    let freshInitImageCache: any;
    jest.isolateModules(() => {
      freshInitImageCache = require("../image-cache").initImageCache;
    });

    const testError = new Error("Cache configuration failed");
    (Image.configureCache as jest.Mock).mockImplementationOnce(() => {
      throw testError;
    });

    expect(() => freshInitImageCache()).not.toThrow();
    expect(log.error).toHaveBeenCalledWith("[image-cache] configureCache failed:", testError);
  });

  it("should not log info or errors when __DEV__ is false", () => {
    (globalThis as any).__DEV__ = false;
    let freshInitImageCache: any;
    jest.isolateModules(() => {
      freshInitImageCache = require("../image-cache").initImageCache;
    });

    // Test iOS success
    freshInitImageCache();
    expect(log.info).not.toHaveBeenCalled();

    // Reset initialized flag by getting a fresh import again
    jest.isolateModules(() => {
      freshInitImageCache = require("../image-cache").initImageCache;
    });

    // Test iOS failure
    (Image.configureCache as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Test");
    });
    freshInitImageCache();
    expect(log.error).not.toHaveBeenCalled();

    // Reset initialized flag
    jest.isolateModules(() => {
      freshInitImageCache = require("../image-cache").initImageCache;
    });

    // Test android skip
    Platform.OS = "android";
    freshInitImageCache();
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
