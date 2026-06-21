/**
 * useFirstRunAha — gate for the dark-launched first-session "aha" surface
 * (issue #720).
 *
 * The aha surface is ADDITIVE: it never replaces the existing onboarding
 * tutorial (which stays the default, unflagged). This hook answers one
 * question — "should the aha surface show right now?" — by combining:
 *
 *   1. The `onboarding_aha` feature flag (default-off while loading, per the
 *      safe-by-default `useFeatureFlag` contract). When off, the surface is
 *      never shown and the existing onboarding behavior is untouched.
 *   2. The persisted `AHA_SCREEN_SEEN_KEY` bit so we never re-impress the same
 *      install (mirrors the `ONBOARDING_COMPLETED_KEY` pattern).
 *
 * It deliberately does NOT manage a multi-step first-run state machine — the
 * issue's full resumability spec is out of scope for this MVP and is tracked
 * for a later, design-refined iteration. This is the minimal,
 * dark-launch-safe hook.
 */

import { useCallback } from "react";
import { storage } from "~/data";
import { AHA_SCREEN_SEEN_KEY } from "~/constants/storage-keys";
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";

export interface FirstRunAhaState {
  /** True only when the flag is enabled AND the surface has not been seen. */
  shouldShow: boolean;
  /** Flag still resolving (treat as "do not show" while true — safe default). */
  isLoading: boolean;
  /** Mark the aha surface as seen for this install (idempotent). */
  markSeen: () => void;
}

/** Feature-flag key gating the first-session aha surface. */
export const AHA_FEATURE_FLAG_KEY = "onboarding_aha";

export function useFirstRunAha(): FirstRunAhaState {
  const { enabled, isLoading } = useFeatureFlag(AHA_FEATURE_FLAG_KEY);

  const seen = storage.get<boolean>(AHA_SCREEN_SEEN_KEY) ?? false;
  // Safe-by-default: while the flag is loading, `enabled` is false, so the
  // surface never flashes on a cold start.
  const shouldShow = enabled && !seen;

  const markSeen = useCallback(() => {
    storage.set(AHA_SCREEN_SEEN_KEY, true);
  }, []);

  return { shouldShow, isLoading, markSeen };
}
