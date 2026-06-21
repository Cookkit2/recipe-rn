/**
 * Day-0 subscription funnel event taxonomy + emission (issue #718).
 *
 * This is the MINIMAL typed analytics layer that lets every later
 * monetization experiment (#724/#725/#726/#731) be measured. It is NOT a
 * general analytics platform: it defines a closed set of funnel events,
 * stamps each with the install anchor, and fans out to two existing sinks
 * (Sentry + RevenueCat) in fire-and-forget try/catch wrappers so analytics
 * can never break a purchase path.
 *
 * Design constraints enforced here (per issue #718 risks):
 *  - Every sink is wrapped in try/catch — a throwing Sentry/RC call must not
 *    abort the other sink or the surrounding purchase flow.
 *  - Events carry only an anonymous `installId` (no email / user id) and
 *    respect the existing Sentry PII gate.
 *  - Pure helpers (`isDay0Cancel`, `paywallResultToEvent`, `diffCustomerInfo`)
 *    are exported separately so the Jest suite can assert behaviour without
 *    touching Sentry / RevenueCat.
 */

import * as Sentry from "@sentry/react-native";
import type { CustomerInfo, PurchasesEntitlementInfo } from "react-native-purchases";
import { PAYWALL_RESULT } from "react-native-purchases-ui";
import { getInstallAnchor, type InstallAnchor } from "~/lib/install-anchor";

/** Must match RevenueCat dashboard entitlement id + ENTITLEMENT_IDENTIFIER in subscription-utils. */
export const FUNNEL_ENTITLEMENT_ID = "Pro";

/** Single Sentry tag value so every funnel event can be sliced in one query. */
export const FUNNEL_TAG = "funnel";

/**
 * Day-0 window: a trial cancel within this many ms of install is classified
 * `day0_trial_cancelled`. 24h per issue #718 [F7].
 */
export const DAY0_WINDOW_MS = 24 * 60 * 60 * 1000;

// === Trigger sources (closed set, mirrors the 5 real call sites) ===

export type FunnelTriggerSource =
  /** components/Camera/CameraActionRow.tsx takePicture (gated behind isRecipeCooked). */
  | "camera_capture"
  /** components/Camera/CameraActionRow.tsx pickFromGallery (gated behind isRecipeCooked). */
  | "camera_gallery"
  /** components/Recipe/Details/BottomActionBar.tsx Cook button (gated behind isRecipeCooked). */
  | "recipe_start_cooking"
  /** app/ingredient/(create)/confirmation.tsx onSaveAllIngredients (unconditional). */
  | "ingredient_confirmation"
  /** components/Profile/SubscriptionCard.tsx Subscribe button (unconditional). */
  | "profile_subscription_card"
  /** Paywall presented outside the typed call sites (legacy / unattributed). */
  | "unknown";

// === Closed set of funnel event types ===

export type FunnelEventType =
  | "app_first_open"
  | "session_start"
  | "paywall_presented"
  | "paywall_dismissed"
  | "paywall_error"
  | "trial_started"
  | "paid_converted"
  | "day0_trial_cancelled"
  | "subscription_cancelled"
  | "subscription_refunded"
  | "entitlement_changed"
  // Retention / re-engagement surface — expiring-ingredient nudge (issue #726).
  // These close the loop between the in-app "Cook Now" section and the scheduled
  // re-engagement notification, so engagement is measurable against the Day-0
  // cohort (#718). All three are non-terminal breadcrumbs.
  | "expiring_nudge_shown"
  | "expiring_nudge_engaged"
  | "expiring_nudge_dismissed"
  /**
   * First-session "aha" moment (issue #720, dark-launched behind the
   * `onboarding_aha` feature flag). These close the loop between pantry
   * population and the first cook so the Day-0 lift ([F7]) is measurable:
   *   aha_shown          — the "You can cook N recipes tonight" surface rendered
   *   aha_recipe_opened  — the user tapped a cook-tonight recipe card
   *   first_cook_started — the user entered the cooking screen from the aha CTA
   * All three are non-terminal breadcrumbs (no dedup) so each occurrence is its
   * own data point, matching the expiring-nudge pattern above.
   */
  | "aha_shown"
  | "aha_recipe_opened"
  | "first_cook_started"
  /**
   * A/B experiment exposure — fired the first time a user is bucketed into a
   * variant for a gating decision (see lib/experiments/useExperiment.ts). Lets
   * #718 slice per-variant conversion for the #724/#725/#731 experiments.
   * Carries `experimentKey` + `variant` in the event detail.
   */
  | "experiment_exposed";

/**
 * Surface that surfaced an expiring-ingredient nudge. Lets us attribute
 * engagement to the in-app section vs. the scheduled notification.
 */
export type ExpiringNudgeSurface = "in_app_section" | "reengagement_notification";

/**
 * Shared fields stamped on every funnel event. `installId` / `installAnchorTs`
 * come from the install anchor; `eventTs` is normalized to ms-since-epoch so
 * downstream consumers can compute `eventTs - installAnchorTs` (Day-0 cohort
 * math) without timezone ambiguity.
 */
export interface FunnelEventBase {
  type: FunnelEventType;
  installId: string;
  installAnchorTs: number;
  eventTs: number;
  /** Where the funnel signal originated (paywall surface, etc.), when applicable. */
  triggerSource?: FunnelTriggerSource;
  /** Optional structured detail (product id, period type, etc.). */
  [detail: string]: unknown;
}

export interface FunnelEvent extends FunnelEventBase {
  /** Discriminator-friendly alias of `type`. */
  event: FunnelEventType;
}

/** Terminal funnel steps — `paid_converted` should only fire once per install. */
const TERMINAL_EVENT_TYPES: ReadonlySet<FunnelEventType> = new Set([
  "paid_converted",
  "subscription_refunded",
]);

// ============================================================================
// Pure helpers (the testable core)
// ============================================================================

/**
 * A trial cancel is "Day-0" if it occurs within DAY0_WINDOW_MS of install.
 * Pure — takes the anchor + cancel timestamps explicitly so the Jest suite can
 * fixture both 2h (Day-0) and 26h (not Day-0) scenarios deterministically.
 */
export function isDay0Cancel(installAnchorTs: number, cancelTs: number): boolean {
  return cancelTs - installAnchorTs <= DAY0_WINDOW_MS;
}

/**
 * Maps a RevenueCat `PAYWALL_RESULT` to exactly one funnel event type.
 * `PURCHASED` becomes `trial_started` (intro/trial offerings are Cookkit's only
 * path) — the customerInfoUpdateListener later promotes it to `paid_converted`
 * once the entitlement actually goes active.
 */
export function paywallResultToEvent(
  result: PAYWALL_RESULT,
  triggerSource: FunnelTriggerSource,
  opts?: { now?: number; anchor?: InstallAnchor }
): { type: FunnelEventType; triggerSource: FunnelTriggerSource } | null {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return { type: "trial_started", triggerSource };
    case PAYWALL_RESULT.RESTORED:
      return { type: "paid_converted", triggerSource };
    case PAYWALL_RESULT.NOT_PRESENTED:
      return { type: "paywall_dismissed", triggerSource };
    case PAYWALL_RESULT.CANCELLED:
      return { type: "paywall_dismissed", triggerSource };
    case PAYWALL_RESULT.ERROR:
      return { type: "paywall_error", triggerSource };
    default:
      return null;
  }
}

/** True when an active Pro entitlement exists on this CustomerInfo. */
function hasActiveEntitlement(info: CustomerInfo | null | undefined): boolean {
  return !!info?.entitlements?.active?.[FUNNEL_ENTITLEMENT_ID];
}

/**
 * Derive funnel events by diffing a new CustomerInfo against the previous one.
 *
 * Heuristic signals (documented per issue #718 risks — treat Day-0-cancel as
 * approximate until validated against the RC dashboard):
 *  - entitlement gone inactive, or `unsubscribeDetectedAt` newly set
 *    → `subscription_cancelled` (Day-0 variant when within DAY0_WINDOW_MS)
 *  - a subscription's `refundedAt` newly set → `subscription_refunded`
 *  - entitlement newly active → `entitlement_changed` + `paid_converted`
 *
 * Pure: takes both CustomerInfos + an explicit anchor so the suite can fixture
 * transitions without touching storage or RevenueCat.
 */
export function diffCustomerInfo(
  prev: CustomerInfo | null | undefined,
  next: CustomerInfo | null | undefined,
  anchor: InstallAnchor,
  opts?: { now?: number }
): Array<{ type: FunnelEventType; triggerSource?: FunnelTriggerSource }> {
  const now = opts?.now ?? Date.now();
  const events: Array<{ type: FunnelEventType; triggerSource?: FunnelTriggerSource }> = [];

  const wasActive = hasActiveEntitlement(prev);
  const isActive = hasActiveEntitlement(next);

  // Entitlement newly active → conversion / change.
  if (!wasActive && isActive) {
    events.push({ type: "entitlement_changed" });
    events.push({ type: "paid_converted" });
  } else if (wasActive && !isActive) {
    // Entitlement went inactive.
    events.push({ type: "subscription_cancelled" });
    if (isDay0Cancel(anchor.installAnchorTs, now)) {
      events.push({ type: "day0_trial_cancelled" });
    }
  }

  // Unsubscribe detected (entitlement may still be active during the period).
  const prevUnsub = unsubDetectedAt(prev);
  const nextUnsub = unsubDetectedAt(next);
  if (!prevUnsub && nextUnsub) {
    events.push({ type: "subscription_cancelled" });
    if (isDay0Cancel(anchor.installAnchorTs, now)) {
      events.push({ type: "day0_trial_cancelled" });
    }
  }

  // Refund detected on any subscription.
  if (hasNewRefund(prev, next)) {
    events.push({ type: "subscription_refunded" });
  }

  return events;
}

function proEntitlement(info: CustomerInfo | null | undefined): PurchasesEntitlementInfo | null {
  return info?.entitlements?.active?.[FUNNEL_ENTITLEMENT_ID] ?? null;
}

function unsubDetectedAt(info: CustomerInfo | null | undefined): string | null {
  return proEntitlement(info)?.unsubscribeDetectedAt ?? null;
}

/** True if any subscription's `refundedAt` is newly present on `next`. */
function hasNewRefund(
  prev: CustomerInfo | null | undefined,
  next: CustomerInfo | null | undefined
): boolean {
  const prevRefunds = refundSet(prev);
  const nextRefunds = refundSet(next);
  for (const key of nextRefunds) {
    if (!prevRefunds.has(key)) return true;
  }
  return false;
}

function refundSet(info: CustomerInfo | null | undefined): Set<string> {
  const set = new Set<string>();
  const subs = info?.subscriptionsByProductIdentifier;
  if (!subs) return set;
  for (const key of Object.keys(subs)) {
    const sub = subs[key];
    if (sub && sub.refundedAt) set.add(`${key}:${sub.refundedAt}`);
  }
  return set;
}

// ============================================================================
// Emission (fan-out to Sentry + RevenueCat, fire-and-forget)
// ============================================================================

/**
 * Build a fully-stamped funnel event from a partial payload, filling the
 * install anchor + event timestamp. Pure: does not emit.
 */
export function buildFunnelEvent(
  type: FunnelEventType,
  partial?: {
    triggerSource?: FunnelTriggerSource;
    detail?: Record<string, unknown>;
    anchor?: InstallAnchor;
    now?: number;
  }
): FunnelEvent {
  const anchor = partial?.anchor ?? getInstallAnchor();
  const now = partial?.now ?? Date.now();
  const event: FunnelEvent = {
    type,
    event: type,
    installId: anchor.installId,
    installAnchorTs: anchor.installAnchorTs,
    eventTs: now,
  };
  if (partial?.triggerSource) event.triggerSource = partial.triggerSource;
  if (partial?.detail) Object.assign(event, partial.detail);
  return event;
}

/**
 * Track which terminal events have already fired for this install so
 * `paid_converted` / `subscription_refunded` are idempotent across listener
 * invocations (the customerInfoUpdateListener fires repeatedly).
 */
const firedTerminal = new Set<FunnelEventType>();

/** Reset terminal-event dedup state. TEST ONLY. */
export function resetFunnelEventStateForTesting(): void {
  firedTerminal.clear();
}

/**
 * Emit a funnel event to BOTH sinks (Sentry + RevenueCat) in parallel.
 *
 * Each sink is wrapped in its own try/catch so a failure in one cannot abort
 * the other or propagate to the caller — analytics must never break a purchase
 * path (issue #718 risk #2). Terminal events (`paid_converted`,
 * `subscription_refunded`) are deduped so repeat listener callbacks don't
 * double-count conversions.
 *
 * Returns the emitted event (or `null` if deduped / no anchor).
 */
export function emitFunnelEvent(
  type: FunnelEventType,
  partial?: {
    triggerSource?: FunnelTriggerSource;
    detail?: Record<string, unknown>;
    anchor?: InstallAnchor;
    now?: number;
  }
): FunnelEvent | null {
  if (TERMINAL_EVENT_TYPES.has(type)) {
    if (firedTerminal.has(type)) return null;
    firedTerminal.add(type);
  }

  let event: FunnelEvent;
  try {
    event = buildFunnelEvent(type, partial);
  } catch {
    // Anchor unavailable (e.g. storage threw) — never crash the caller.
    return null;
  }

  // (a) Sentry: lightweight signals as breadcrumbs, terminal steps as messages.
  try {
    sendToSentry(event);
  } catch {
    /* swallow */
  }

  // (b) RevenueCat attributes — gives the RC dashboard RLTV / refund charts
  // natively. Self-contained try/catch so the fire-and-forget promise can
  // never produce an unhandled rejection (issue #718 risk #2).
  void sendToRevenueCat(event).catch(() => {
    /* swallow — analytics must never break a purchase path */
  });

  return event;
}

function sendToSentry(event: FunnelEvent): void {
  const payload = serializeForSentry(event);
  if (TERMINAL_EVENT_TYPES.has(event.type)) {
    Sentry.captureMessage(`funnel:${event.type}`, {
      level: "info",
      tags: { [FUNNEL_TAG]: event.type },
      extra: payload,
    });
  } else {
    Sentry.addBreadcrumb({
      category: FUNNEL_TAG,
      message: `funnel:${event.type}`,
      level: "info",
      data: payload,
    });
  }
}

/** Strip the discriminator alias + non-serializable fields for Sentry payload. */
function serializeForSentry(event: FunnelEvent): Record<string, unknown> {
  const { event: _alias, type, ...rest } = event;
  return { type, ...rest };
}

/**
 * Lazy import of react-native-purchases so the event module does not hard-bind
 * to Purchases (keeps it importable in tests that don't mock Purchases, and
 * matches the dynamic-import-for-circular-deps pattern used elsewhere).
 */
async function sendToRevenueCat(event: FunnelEvent): Promise<void> {
  const Purchases = (await import("react-native-purchases")).default;
  // setAttributes may be absent when RevenueCat is unconfigured (E2E / dev) —
  // treat a missing method as a no-op rather than throwing.
  if (typeof Purchases.setAttributes !== "function") return;
  Purchases.setAttributes({
    [`funnel_last_event`]: event.type,
    [`funnel_last_event_ts`]: String(event.eventTs),
    [`funnel_${event.type}_ts`]: String(event.eventTs),
  });
}

// Convenience wrappers used at instrumented call sites.

export function emitPaywallPresented(triggerSource: FunnelTriggerSource): void {
  emitFunnelEvent("paywall_presented", { triggerSource });
}

export function emitAppFirstOpen(): void {
  emitFunnelEvent("app_first_open");
}

export function emitSessionStart(): void {
  emitFunnelEvent("session_start");
}

// ---------------------------------------------------------------------------
// Expiring-ingredient re-engagement nudge (issue #726).
//
// Three lifecycle events close the engagement loop for the existing in-app
// "Cook Now" section and the new scheduled re-engagement notification. All are
// non-terminal breadcrumbs, so they are NOT in TERMINAL_EVENT_TYPES and need no
// dedup — each shown/engaged/dismissed occurrence is its own data point.
// ---------------------------------------------------------------------------

/**
 * Fire when an expiring-ingredient nudge becomes visible to the user.
 *
 * @param surface  in-app section vs. scheduled notification
 * @param expiringCount number of pantry items driving the nudge
 */
export function emitExpiringNudgeShown(surface: ExpiringNudgeSurface, expiringCount: number): void {
  emitFunnelEvent("expiring_nudge_shown", {
    detail: { surface, expiringCount },
  });
}

/**
 * Fire when the user acts on an expiring-ingredient nudge — taps a recipe
 * (in-app) or opens the notification deep link.
 */
export function emitExpiringNudgeEngaged(
  surface: ExpiringNudgeSurface,
  detail?: { recipeId?: string; recipeIds?: string[] }
): void {
  emitFunnelEvent("expiring_nudge_engaged", {
    detail: { surface, ...detail },
  });
}

/**
 * Fire when the user dismisses an expiring-ingredient nudge (in-app X button,
 * or the notification is cleared). Dismissals are the leading churn signal —
 * instrument them so opt-out rates are visible per surface (#726 risk: push
 * fatigue / opt-out spiral).
 */
export function emitExpiringNudgeDismissed(surface: ExpiringNudgeSurface): void {
  emitFunnelEvent("expiring_nudge_dismissed", {
    detail: { surface },
  });
}

// ---------------------------------------------------------------------------
// First-session "aha" moment (issue #720, dark-launched behind onboarding_aha).
//
// Three non-terminal breadcrumbs measuring the Day-0 aha funnel: pantry
// populated -> cook-tonight surface shown -> recipe opened -> first cook
// started. The whole point of #720 is that this lift is measurable per [F7].
// ---------------------------------------------------------------------------

/**
 * Fire when the "You can cook N recipes tonight" aha surface becomes visible.
 *
 * @param cookableCount number of cook-tonight recipes surfaced (matchCategory
 *   `can_make_now`). Carried in the event detail so funnel drop-off is visible
 *   per cohort (empty vs. non-empty climax surface).
 */
export function emitAhaShown(cookableCount: number): void {
  emitFunnelEvent("aha_shown", {
    detail: { cookableCount },
  });
}

/**
 * Fire when the user taps a cook-tonight recipe card on the aha surface.
 */
export function emitAhaRecipeOpened(recipeId: string): void {
  emitFunnelEvent("aha_recipe_opened", {
    detail: { recipeId },
  });
}

/**
 * Fire when the user enters the cooking screen from the aha surface's primary
 * CTA (the deep-link into /recipes/[recipeId]/steps). This is the conversion
 * that places the next-cook paywall touchpoint on a user who has felt value.
 */
export function emitFirstCookStarted(recipeId: string): void {
  emitFunnelEvent("first_cook_started", {
    detail: { recipeId },
  });
}
