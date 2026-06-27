import { StorageFactory } from "~/data/storage/storage-factory";
import { log } from "~/utils/logger";
import { withRetryBackoff } from "~/utils/withRetryBackoff";
import * as Crypto from "expo-crypto";

/**
 * Persisted write queue for the household sync push path.
 *
 * Background (issue #734): `HouseholdSyncService.pushLocalChanges` had no
 * backstop — a failed push on a flaky network was logged and swallowed, losing
 * the mutation. This queue retains failed push payloads across app restarts
 * (MMKV-backed via `StorageFactory`) and retries them with exponential backoff
 * + jitter (`withRetryBackoff`), so a transient failure no longer drops data.
 *
 * Scope (deliberately thin): this is *not* a new sync engine. It only serializes
 * the payloads `pushLocalChanges` already builds and replays them through the
 * existing `householdApi.upsertSharedStock` path. Drain is triggered by the
 * existing `syncHousehold()` call (which already runs on app foreground /
 * household open) rather than a separate connectivity listener — adding
 * `@react-native-community/netinfo` (a new native dep) was flagged as risky in
 * the issue's Risks section and is left for a follow-up; the queue still drains
 * the next time any sync runs.
 *
 * Conflict resolution policy: the queue replays *pushes* (local -> remote), so
 * it never silently overwrites remote data — the pull path's last-writer-wins
 * guard (`shouldApplyRemoteUpdate`) handles the remote->local direction. If a
 * queued push loses a race (remote is newer), the next pull reconciles it.
 */

const QUEUE_STORAGE_KEY = "household_sync_write_queue_v1";
const MAX_RETRIES_PER_DRAIN = 4;
/** After this many cumulative failures, dead-letter (drop + log) the payload. */
const MAX_DEAD_LETTER_FAILURES = 12;

export interface QueuedPush {
  /** Surrogate id (timestamp-based) for dedupe/counting within the queue. */
  id: string;
  householdId: string;
  rows: unknown[];
  /** Cumulative failure count across drains; drives dead-lettering. */
  failures: number;
  /** Epoch ms when first enqueued, for diagnostics. */
  enqueuedAt: number;
}

interface QueueStorage {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
}

/**
 * Minimal storage adapter around `StorageFactory` (the same MMKV facade
 * `HouseholdSyncService` already uses). Kept as a method so tests can inject a
 * plain object without mocking the factory's static initializer chain.
 */
function defaultStorage(): QueueStorage {
  const instance = StorageFactory.getInstance();
  return {
    getString: (key) => instance.getString(key),
    setString: (key, value) => instance.setString(key, value),
  };
}

export class SyncWriteQueue {
  private storage: QueueStorage;

  constructor(storage: QueueStorage = defaultStorage()) {
    this.storage = storage;
  }

  /** Add a failed push payload to the queue, persisted immediately. */
  enqueue(householdId: string, rows: unknown[]): void {
    if (rows.length === 0) return;
    const queue = this.readQueue();
    queue.push({
      id: `${Date.now()}-${Crypto.randomUUID().slice(0, 8)}`,
      householdId,
      rows,
      failures: 0,
      enqueuedAt: Date.now(),
    });
    this.writeQueue(queue);
    if (__DEV__) {
      log.info(`[sync-write-queue] enqueued ${rows.length} rows for ${householdId}`);
    }
  }

  /** Number of pending payloads (across all households). */
  size(): number {
    return this.readQueue().length;
  }

  /** Pending payloads for a specific household (used by tests/diagnostics). */
  pendingFor(householdId: string): QueuedPush[] {
    return this.readQueue().filter((p) => p.householdId === householdId);
  }

  /**
   * Replay all queued payloads for `householdId` through `push`, retrying each
   * with exponential backoff. Payloads that exhaust retries are re-queued with
   * an incremented failure count; once a payload exceeds
   * `MAX_DEAD_LETTER_FAILURES` it is dropped and logged (dead-lettered) so a
   * permanently-failing payload cannot block the rest of the queue.
   *
   * `options.sleep` is injectable so tests can drive the backoff schedule with
   * a no-op sleep instead of real wall-clock waits.
   *
   * Returns the number of payloads successfully drained.
   */
  async drain(
    householdId: string,
    push: (rows: unknown[]) => Promise<void>,
    options: { sleep?: (ms: number) => Promise<void> } = {}
  ): Promise<number> {
    const queue = this.readQueue();
    const mine = queue.filter((p) => p.householdId === householdId);
    if (mine.length === 0) return 0;

    let drained = 0;
    const remaining: QueuedPush[] = [];

    for (const payload of mine) {
      try {
        await withRetryBackoff(() => push(payload.rows), {
          maxAttempts: MAX_RETRIES_PER_DRAIN,
          ...(options.sleep ? { sleep: options.sleep } : {}),
        });
        drained++;
      } catch (error) {
        const failures = payload.failures + 1;
        if (failures >= MAX_DEAD_LETTER_FAILURES) {
          // Dead-letter: drop the payload, log observably. Do NOT throw — the
          // caller surfaces sync errors non-blocking per the issue spec.
          if (__DEV__) {
            log.error(
              `[sync-write-queue] dead-lettered payload ${payload.id} for ` +
                `${householdId} after ${failures} failures:`,
              error
            );
          }
        } else {
          remaining.push({ ...payload, failures });
        }
      }
    }

    // Keep payloads belonging to OTHER households untouched, plus any
    // not-yet-dead-lettered payloads for this household that failed this drain.
    const others = queue.filter((p) => p.householdId !== householdId);
    this.writeQueue([...others, ...remaining]);

    return drained;
  }

  // ----- persistence helpers (JSON over a single MMKV string) -----

  private readQueue(): QueuedPush[] {
    try {
      const raw = this.storage.getString(QUEUE_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as QueuedPush[]) : [];
    } catch {
      return [];
    }
  }

  private writeQueue(queue: QueuedPush[]): void {
    try {
      this.storage.setString(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      if (__DEV__) {
        log.error("[sync-write-queue] failed to persist queue:", error);
      }
    }
  }
}

/**
 * Process-level singleton, lazily constructed so it does not touch MMKV at
 * import time (which would break before `StorageFactory.initialize` runs).
 */
let queueInstance: SyncWriteQueue | null = null;
export function getSyncWriteQueue(): SyncWriteQueue {
  if (!queueInstance) queueInstance = new SyncWriteQueue();
  return queueInstance;
}

/** Test-only: reset the process singleton. */
export function __resetSyncWriteQueueForTests(): void {
  queueInstance = null;
}
