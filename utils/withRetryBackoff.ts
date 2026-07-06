import * as Crypto from "expo-crypto";

/**
 * Reusable exponential-backoff-with-jitter retry helper for *writes*.
 *
 * Background (issue #734): the household sync push path had a single try/catch
 * that logged and swallowed failures — a dropped push on a flaky network was
 * silently lost. This helper provides the retry/backoff primitive the write
 * queue needs, mirroring the don't-retry-certain-errors shape already used for
 * *reads* in `store/QueryProvider.tsx` (its TanStack `retry` callbacks) but
 * adapted for the write/sync path: deterministic schedule, capped attempts,
 * and a pluggable predicate that marks an error as terminal (non-retryable).
 *
 * Design notes:
 *   - Exponential base delay with full jitter (random within [base*2^(n-1), ...]
 *     is intentionally avoided in favor of "equal jitter": half deterministic,
 *     half random — the same shape Supabase/Stripe clients use, which avoids
 *     both thundering-herd sync retries and excessive spread).
 *   - Sleep is injected (defaults to `setTimeout`) so the schedule is fully
 *     unit-testable with fake timers and never touches real wall-clock in tests.
 *   - Pure: no Sentry / storage side effects. The caller (SyncWriteQueue)
 *     decides what to do on final exhaustion (e.g. dead-letter + Sentry).
 */

export interface WithRetryBackoffOptions {
  /** Max retry attempts (not counting the initial try). Default 4. */
  maxAttempts?: number;
  /** Base delay in ms for the first retry. Default 500ms. */
  baseDelayMs?: number;
  /** Max delay cap in ms. Default 30s. */
  maxDelayMs?: number;
  /**
   * Predicate that marks an error as terminal (non-retryable). When it returns
   * `true`, the helper rejects immediately without consuming further attempts —
   * e.g. a 401/403 or a validation error should not be retried. Default: only
   * network/timeout-style errors are retried.
   */
  isTerminalError?: (error: unknown) => boolean;
  /**
   * Injected sleep function. Defaults to a `setTimeout`-based promise. Tests
   * pass a jest-controlled sleep to drive the schedule with fake timers.
   */
  sleep?: (ms: number) => Promise<void>;
}

/** Compute the (equal-jittered) backoff delay for a given 1-based attempt. */
export function computeBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Deterministic exponential component, capped.
  const exponential = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
  // Equal jitter: half deterministic + half random in [0, exponential/2].
  const randomRatio = Crypto.getRandomBytes(1)[0]! / 256;
  const jitter = Math.floor(randomRatio * (exponential / 2));
  const delay = Math.floor(exponential / 2) + jitter;
  return Math.min(Math.max(delay, 0), maxDelayMs);
}

const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 30_000;

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Default terminal-error predicate. Retries are only worthwhile for transient
 * failures (network/timeout/supabase 5xx-style); anything that looks like an
 * auth, validation, or "not found" error is treated as terminal so we don't
 * burn attempts on a request that will never succeed.
 */
export function defaultIsTerminalError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  // Auth/validation/conflict-style errors are not transient.
  return (
    msg.includes("not found") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden") ||
    msg.includes("invalid") ||
    msg.includes("validation") ||
    msg.includes("409") ||
    msg.includes("422")
  );
}

/**
 * Run `fn`, retrying on failure with exponential backoff + jitter. Rejects with
 * the last error when attempts are exhausted or when `isTerminalError` returns
 * true for an error. Resolves with `fn`'s return value on success.
 *
 * @returns a tuple-free promise — see usage in `SyncWriteQueue`.
 */
export async function withRetryBackoff<T>(
  fn: () => Promise<T>,
  options: WithRetryBackoffOptions = {}
): Promise<T> {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    isTerminalError = defaultIsTerminalError,
    sleep = defaultSleep,
  } = options;

  let lastError: unknown;
  // Initial try + up to `maxAttempts` retries.
  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Terminal error: do not retry.
      if (isTerminalError(error)) {
        throw error;
      }
      // Exhausted attempts: reject with the last error.
      if (attempt >= maxAttempts) {
        throw error;
      }

      const delay = computeBackoffDelay(attempt + 1, baseDelayMs, maxDelayMs);
      await sleep(delay);
    }
  }
  // Defensive — the loop above always returns or throws.
  throw lastError;
}
