import { useEffect, useState } from "react";
import allModel from "./allModel";
import { log } from '~/utils/logger';

function scheduleIdleTask(task: () => void, delayMs?: number) {
  const idleCallback = (globalThis as any).requestIdleCallback as
    | ((cb: () => void) => number)
    | undefined;

  const runTask = () => {
    if (delayMs && delayMs > 0) {
      setTimeout(task, delayMs);
    } else {
      task();
    }
  };

  if (typeof idleCallback === "function") {
    idleCallback(runTask);
  } else {
    setTimeout(runTask, delayMs ?? 0);
  }
}

/**
 * Configuration options for model preloading behavior.
 *
 * The preloader uses React Native's InteractionManager to defer loading
 * until after animations and gestures complete, ensuring smooth UI performance.
 */
interface ModelPreloaderOptions {
  /**
   * Delay in milliseconds before loading begins (default: 100ms).
   * Only applies when priority is "low" or "normal".
   */
  delay?: number;

  /**
   * Loading priority that determines when models are loaded (default: "low").
   * - "high": Loads immediately after interactions complete (no delay)
   * - "normal": Loads after interactions with optional delay
   * - "low": Loads after interactions with longer delay (ideal for background preloading)
   */
  priority?: "low" | "normal" | "high";

  /**
   * Callback invoked when model loading begins.
   */
  onLoadStart?: () => void;

  /**
   * Callback invoked when model loading completes successfully.
   */
  onLoadComplete?: () => void;

  /**
   * Callback invoked when model loading fails.
   * @param error The error that occurred during loading
   */
  onLoadError?: (error: Error) => void;
}

/**
 * Custom hook for preloading ML models with configurable priority and timing.
 *
 * This hook manages the asynchronous loading of machine learning models using
 * InteractionManager to ensure smooth UI performance. Models are loaded after
 * animations and gestures complete to prevent frame drops.
 *
 * @example
 * // Basic low-priority preload for background loading
 * const { isLoaded, error } = useModelPreloader();
 *
 * @example
 * // High-priority preload for immediate use with callbacks
 * const { isLoaded, isLoading, error } = useModelPreloader({
 *   priority: "high",
 *   onLoadStart: () => console.log("Loading..."),
 *   onLoadComplete: () => console.log("Ready!"),
 *   onLoadError: (err) => console.error(err),
 * });
 *
 * @example
 * // Delayed low-priority preload for background preparation
 * const { isLoaded, forceReload } = useModelPreloader({
 *   priority: "low",
 *   delay: 500,
 * });
 *
 * @param options Configuration options for preloading behavior
 * @returns Object containing:
 *   - `isLoading`: Boolean indicating if model is currently loading
 *   - `isLoaded`: Boolean indicating if model has finished loading
 *   - `error`: Error object if loading failed, null otherwise
 *   - `forceReload`: Function to force reload the model
 */
export const useModelPreloader = (options: ModelPreloaderOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    delay = 100,
    priority = "low",
    onLoadStart,
    onLoadComplete,
    onLoadError,
  } = options;

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (__DEV__) {
          log.info(`Starting model preload with ${priority} priority...`);
        }

        onLoadStart?.();

        // Wait for models to load
        await allModel.get();

        setIsLoaded(true);
        onLoadComplete?.();

        if (__DEV__) {
          log.info("Model preload completed successfully");
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Model loading failed");
        setError(error);
        onLoadError?.(error);

        if (__DEV__) {
          log.error("Model preload failed:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const scheduleModelLoading = () => {
      if (priority === "high") {
        // Load as soon as the JS thread is idle
        scheduleIdleTask(loadModel);
      } else {
        // Add delay for lower priority loading
        scheduleIdleTask(loadModel, delay);
      }
    };

    // Check if already loaded
    if (allModel.isLoaded()) {
      setIsLoaded(true);
      return;
    }

    scheduleModelLoading();
  }, [delay, priority, onLoadStart, onLoadComplete, onLoadError]);

  return {
    isLoading,
    isLoaded,
    error,
    forceReload: () => {
      if (!isLoading) {
        setIsLoaded(false);
        setError(null);
        allModel.preload();
      }
    },
  };
};
