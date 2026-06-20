/**
 * Install anchor — the Day-0 cohort key for subscription-funnel analytics.
 *
 * On first launch Cookkit generates a stable anonymous `installId` and records
 * `installAnchorTs` (install wall-clock time). Both are persisted to the
 * existing synchronous storage facade (MMKV) so every funnel event can stamp
 * `installId` / `installAnchorTs` without re-reading storage on the hot path.
 *
 * The install anchor is what defines "Day-0": a trial cancel within 24h of
 * `installAnchorTs` is classified as `day0_trial_cancelled`, which is the
 * decisive cohort for subscription apps (see issue #718 [F7]).
 *
 * Pure / side-effect-free in test: `getInstallAnchor()` reads lazily and
 * `resetInstallAnchorForTesting()` restores a pristine state between tests.
 */

import * as Crypto from "expo-crypto";
import { storage } from "~/data";

// Raw MMKV keys. Kept out of constants/storage-keys.ts intentionally — these are
// analytics-only and do not need to be discoverable by the rest of the app.
const INSTALL_ID_KEY = "analytics:install_id";
const INSTALL_ANCHOR_TS_KEY = "analytics:install_anchor_ts";

export interface InstallAnchor {
  /** Stable anonymous install identifier (UUID). Null before first launch is recorded. */
  installId: string;
  /** Install wall-clock time (ms since epoch). Used as the Day-0 cohort anchor. */
  installAnchorTs: number;
}

let cached: InstallAnchor | null = null;

function generateId(): string {
  return Crypto.randomUUID();
}

/**
 * Read (and lazily materialize on first call) the install anchor.
 *
 * On the very first call after install, this writes a fresh `installId` and
 * `installAnchorTs` to storage. Subsequent calls — including across cold
 * restarts — return the persisted values untouched. Idempotent.
 */
export function getInstallAnchor(): InstallAnchor {
  if (cached) return cached;

  let installId = storage.get<string>(INSTALL_ID_KEY);
  let anchorTs = storage.get<number>(INSTALL_ANCHOR_TS_KEY);

  if (!installId || typeof anchorTs !== "number") {
    installId = generateId();
    anchorTs = Date.now();
    storage.set(INSTALL_ID_KEY, installId);
    storage.set(INSTALL_ANCHOR_TS_KEY, anchorTs);
  }

  cached = { installId, installAnchorTs: anchorTs };
  return cached;
}

/** Reset the in-memory cache + persisted anchor. TEST ONLY. */
export function resetInstallAnchorForTesting(): void {
  cached = null;
  storage.delete(INSTALL_ID_KEY);
  storage.delete(INSTALL_ANCHOR_TS_KEY);
}

/**
 * Overwrite the persisted anchor (and cache) with explicit values.
 * TEST ONLY — used to fixture install-time Day-0 classification scenarios.
 */
export function setInstallAnchorForTesting(anchor: InstallAnchor): void {
  storage.set(INSTALL_ID_KEY, anchor.installId);
  storage.set(INSTALL_ANCHOR_TS_KEY, anchor.installAnchorTs);
  cached = { ...anchor };
}
