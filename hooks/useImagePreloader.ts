import { useCallback, useEffect, useRef, useState } from "react";
import { prefetchImages } from "~/lib/image-prefetch";
import { log } from "~/utils/logger";

const DEFAULT_PREFETCH_BATCH_SIZE = 8;
const DEFAULT_DELAY_MS = 100;

function scheduleIdleTask(task: () => void, delayMs?: number) {
  const idleCallback = (globalThis as any).requestIdleCallback as
    ((cb: () => void) => number) | undefined;

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

function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return trimmed.startsWith("https://");
}

function dedupe(urls: string[]): string[] {
  return Array.from(new Set(urls.filter(isValidUrl)));
}

export interface UseImagePreloaderOptions {
  /** Delay before starting prefetch (ms). Used when priority is not "high". */
  delay?: number;
  /** When "high", prefetch runs immediately after interactions; otherwise delayed. */
  priority?: "low" | "normal" | "high";
  /** Cache policy for prefetched images. */
  cachePolicy?: "disk" | "memory-disk";
  /**
   * Max concurrent `Image.prefetch` calls per batch. Lower this on low-tier
   * devices to avoid saturating the JS thread / network. Defaults to 8 (the
   * historical module-level value).
   */
  concurrency?: number;
  /**
   * Gate prefetch on connectivity. When `false`, prefetch is skipped entirely
   * (no network round-trips) — callers wire this from a connectivity hook so
   * offline sessions do not queue doomed prefetches. Defaults to `true`.
   */
  enabled?: boolean;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useImagePreloader(options: UseImagePreloaderOptions = {}) {
  const {
    delay = DEFAULT_DELAY_MS,
    priority = "low",
    cachePolicy = "memory-disk",
    concurrency = DEFAULT_PREFETCH_BATCH_SIZE,
    enabled = true,
    onComplete,
    onError,
  } = options;

  const [isPreloading, setIsPreloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const controllerRef = useRef(new AbortController());

  useEffect(() => {
    mountedRef.current = true;
    controllerRef.current = new AbortController();
    return () => {
      mountedRef.current = false;
      controllerRef.current.abort();
    };
  }, []);

  const prefetch = useCallback(
    (urls: string | string[]) => {
      // Skip prefetch entirely when the caller reports offline (or otherwise
      // disabled). Avoids queueing prefetches that will fail on a dead network.
      if (!enabled) return Promise.resolve(true);

      const list = Array.isArray(urls) ? urls : [urls];
      const valid = dedupe(list);
      if (valid.length === 0) return Promise.resolve(true);

      setIsPreloading(true);
      const signal = controllerRef.current.signal;
      return new Promise<boolean>((resolve) => {
        const runPrefetch = async () => {
          let ok = false;
          try {
            ok = await prefetchImages(valid, cachePolicy, concurrency, signal);
            if (mountedRef.current && !signal.aborted) {
              if (ok) {
                setError(null);
                onComplete?.();
              } else {
                const failure = new Error("Image prefetch failed for one or more URLs");
                setError(failure);
                onError?.(failure);
              }
            }
          } catch (cause) {
            log.warn("Image prefetch completion failed", cause);
          } finally {
            if (mountedRef.current && !signal.aborted) setIsPreloading(false);
            resolve(ok);
          }
        };
        scheduleIdleTask(
          () => {
            void runPrefetch();
          },
          priority === "high" ? 0 : delay
        );
      });
    },
    [delay, priority, cachePolicy, concurrency, enabled, onComplete, onError]
  );

  return { prefetch, isPreloading, error };
}
