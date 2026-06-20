/**
 * useExperiment — thin, reusable A/B experiment layer.
 *
 * Consumed by the monetization experiments #724 (trial length), #725 (paywall
 * hardness) and #731 (retention). This module provides BUCKETING +
 * MEASUREMENT only — the actual variant PAYLOADS live elsewhere:
 *   - #724 trial length is a property of the RevenueCat offering / App Store
 *     subscription product (configured in RC + App Store Connect, NOT here).
 *   - #725 paywall hardness is a property of which RC paywall/offering is
 *     presented via presentPaywallIfNeeded().
 *   - #723 (lifetime pricing) is the owner's hands in the RC dashboard.
 * This hook hands the caller a stable variant string; the caller maps it to
 * the appropriate RevenueCat offering / paywall config in subscription-utils.
 *
 * Contract:
 *  - DETERMINISTIC per install: hash(installId + key) → stable variant index
 *    (see assignExperiment.ts). The assignment is also PERSISTED to MMKV so a
 *    user stays in their bucket across cold restarts even if the install id
 *    were ever regenerated (#724 acceptance criterion #2).
 *  - EXPOSURE TRACKING: the first mount that reads the bucket for a gating
 *    decision emits a single `experiment_exposed` funnel event (experiment key
 *    + variant) so #718 can measure per-variant conversion. Re-mounts and
 *    re-renders do NOT re-emit. Use the `trackExposure` option (default true)
 *    to suppress exposure for non-gating reads (e.g. diagnostics screens).
 *
 * Intentionally NOT a remote flag (unlike hooks/queries/useFeatureFlags.ts,
 * which is a remote boolean with no per-install variant bucketing or exposure
 * tracking). Assignment is local + synchronous so the Day-0 paywall path never
 * blocks on a network fetch ([F7]).
 */

import { useEffect, useRef, useState } from "react";
import { emitFunnelEvent } from "~/lib/analytics/funnel-events";
import { getInstallAnchor } from "~/lib/install-anchor";
import { storage } from "~/data";
import { assignExperiment } from "./assignExperiment";

// Raw MMKV namespace for persisted assignments. Kept local (not in
// constants/storage-keys.ts) — these are analytics-only, like the install id.
const ASSIGNMENT_KEY_PREFIX = "experiment:assignment:";

export interface UseExperimentOptions {
  /**
   * Whether to emit an `experiment_exposed` funnel event on the mount that
   * resolves the bucket. Defaults to `true`. Set to `false` for non-gating
   * reads (diagnostics, debug overlays) so they don't pollute conversion math.
   */
  trackExposure?: boolean;
}

export interface UseExperimentResult {
  /** The variant this install is bucketed into for the given experiment key. */
  variant: string;
  /** True once the exposure event has been emitted for this mount. */
  isExposureLogged: boolean;
}

/**
 * Resolve + persist a variant synchronously, without React. Exported so
 * non-hook call sites (e.g. resolving the bucket before the first paywall
 * surface, per #724 acceptance criterion #2) can read the bucket outside the
 * render path. Does NOT emit exposure — exposure is the hook's responsibility.
 */
export function getExperimentAssignment(key: string, variants: readonly string[]): string {
  const storageKey = `${ASSIGNMENT_KEY_PREFIX}${key}`;
  const persisted = storage.get<string>(storageKey);
  if (persisted && variants.includes(persisted)) {
    return persisted;
  }
  const { installId } = getInstallAnchor();
  const variant = assignExperiment(installId, key, variants);
  storage.set(storageKey, variant);
  return variant;
}

/**
 * Overwrite the persisted assignment. TEST ONLY — lets the suite fixture a
 * specific bucket without recomputing the hash.
 */
export function setExperimentAssignmentForTesting(key: string, variant: string): void {
  storage.set(`${ASSIGNMENT_KEY_PREFIX}${key}`, variant);
}

/** Clear a persisted assignment. TEST ONLY. */
export function resetExperimentAssignmentForTesting(key: string): void {
  storage.delete(`${ASSIGNMENT_KEY_PREFIX}${key}`);
}

/**
 * A/B experiment hook.
 *
 * @param key          Stable experiment identifier (e.g. "trial_length_724").
 * @param variants     Ordered variant labels (e.g. ["control", "long_trial"]).
 *                     The order is part of the bucketing contract — do not
 *                     reorder mid-experiment or buckets will shift.
 * @param options      See UseExperimentOptions.
 */
export function useExperiment(
  key: string,
  variants: readonly string[],
  options?: UseExperimentOptions
): UseExperimentResult {
  const trackExposure = options?.trackExposure ?? true;

  // Resolve once (memoized via useState initializer) — the bucket is stable for
  // the install, so we never need to recompute during the component's life.
  const [variant] = useState<string>(() => getExperimentAssignment(key, variants));

  // useRef gate guarantees a single exposure emission per mount, even under
  // React 19 strict-mode double-invocation of effects in dev.
  const loggedRef = useRef(false);
  const [isExposureLogged, setIsExposureLogged] = useState(false);

  useEffect(() => {
    if (!trackExposure) return;
    if (loggedRef.current) return;
    loggedRef.current = true;
    try {
      emitFunnelEvent("experiment_exposed", {
        detail: { experimentKey: key, variant },
      });
      setIsExposureLogged(true);
    } catch {
      // Analytics must never break the surrounding flow (issue #718 risk #2).
      // Exposure logging is best-effort; swallow.
    }
  }, [trackExposure, key, variant]);

  return { variant, isExposureLogged };
}
