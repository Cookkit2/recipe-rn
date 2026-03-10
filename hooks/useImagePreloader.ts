import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";

const PREFETCH_BATCH_SIZE = 8;
const DEFAULT_DELAY_MS = 100;

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

function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
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
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useImagePreloader(options: UseImagePreloaderOptions = {}) {
  const {
    delay = DEFAULT_DELAY_MS,
    priority = "low",
    cachePolicy = "memory-disk",
    onComplete,
    onError,
  } = options;

  const [isPreloading, setIsPreloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const prefetch = useCallback(
    (urls: string | string[]) => {
      const list = Array.isArray(urls) ? urls : [urls];
      const valid = dedupe(list);
      if (valid.length === 0) return Promise.resolve(true);

      const doPrefetch = async () => {
        let allOk = true;
        for (let i = 0; i < valid.length && mountedRef.current; i += PREFETCH_BATCH_SIZE) {
          const batch = valid.slice(i, i + PREFETCH_BATCH_SIZE);
          const ok = await Image.prefetch(batch, { cachePolicy });
          if (!ok) allOk = false;
        }
        if (!mountedRef.current) return;
        if (!allOk) {
          const err = new Error("Image prefetch failed for one or more URLs");
          setError(err);
          onError?.(err);
        } else {
          setError(null);
          onComplete?.();
        }
        setIsPreloading(false);
      };

      const runPrefetch = () => {
        doPrefetch().catch((err) => {
          if (!mountedRef.current) {
            return;
          }
          const normalizedError =
            err instanceof Error ? err : new Error(String(err));
          setError(normalizedError);
          setIsPreloading(false);
          onError?.(normalizedError);
        });
      };

      if (priority === "high") {
        scheduleIdleTask(runPrefetch);
      } else {
        scheduleIdleTask(runPrefetch, delay);
      }

      return Promise.resolve();
    },
    [delay, priority, cachePolicy, onComplete, onError]
  );

  return { prefetch, isPreloading, error };
}
