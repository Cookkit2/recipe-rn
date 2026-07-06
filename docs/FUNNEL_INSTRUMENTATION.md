# Day-0 Subscription Funnel Instrumentation

Instrumentation for measuring the install → trial → Day-0 cancel → paid → refund funnel so every later monetization experiment (paywall redesign, trial-length test, retention) has a measurable baseline. Implements [issue #718](https://github.com/Cookkit2/recipe-rn/issues/718).

This is **instrumentation only** — it emits measurable signals, it does not change conversion behavior or build a product-analytics backend.

## Event taxonomy

The closed set of funnel events lives in `lib/analytics/funnel-events.ts` (`FunnelEventType`). Every event carries the shared fields:

| Field | Type | Source |
|---|---|---|
| `installId` | string (UUID) | `lib/install-anchor.ts` — anonymous, persisted on first launch |
| `installAnchorTs` | number (ms) | install wall-clock time; the Day-0 cohort anchor |
| `eventTs` | number (ms) | event wall-clock time |
| `triggerSource` | string? | which gating surface fired the paywall (when applicable) |

| `type` | When emitted | Where |
|---|---|---|
| `app_first_open` | Once, on the install that creates the anchor | `app/_layout.tsx` |
| `session_start` | Every cold launch | `app/_layout.tsx` |
| `paywall_presented` | `presentPaywallIfNeeded()` decides to show the paywall | `utils/subscription-utils.ts` |
| `paywall_dismissed` | Paywall `CANCELLED` / `NOT_PRESENTED` | `presentPaywallIfNeeded()` PAYWALL_RESULT switch |
| `paywall_error` | Paywall `ERROR` | `presentPaywallIfNeeded()` PAYWALL_RESULT switch |
| `trial_started` | Paywall `PURCHASED` (intro/trial offering) | `presentPaywallIfNeeded()` PAYWALL_RESULT switch |
| `paid_converted` | Paywall `RESTORED`, OR entitlement goes active | paywall switch + `customerInfoUpdateListener` |
| `subscription_cancelled` | Pro entitlement goes inactive, OR `unsubscribeDetectedAt` newly set | `customerInfoUpdateListener` |
| `day0_trial_cancelled` | A cancel within 24h of `installAnchorTs` | `customerInfoUpdateListener` (heuristic — see Caveats) |
| `subscription_refunded` | A subscription's `refundedAt` newly appears | `customerInfoUpdateListener` |
| `entitlement_changed` | Pro entitlement newly active | `customerInfoUpdateListener` |

### Trigger sources (the 5 real paywall call sites)

| `triggerSource` | File | Gating |
|---|---|---|
| `camera_capture` | `components/Camera/CameraActionRow.tsx` (takePicture) | gated behind `RECIPE_COOKED_KEY` (one free cook) |
| `camera_gallery` | `components/Camera/CameraActionRow.tsx` (pickFromGallery) | gated behind `RECIPE_COOKED_KEY` |
| `recipe_start_cooking` | `components/Recipe/Details/BottomActionBar.tsx` (Cook button) | gated behind `RECIPE_COOKED_KEY` |
| `ingredient_confirmation` | `app/ingredient/(create)/confirmation.tsx` (save ingredients) | unconditional |
| `profile_subscription_card` | `components/Profile/SubscriptionCard.tsx` (Subscribe button) | unconditional |

> **Freemium-gate note:** the camera and recipe-cook paywalls only fire once the user has cooked once (`RECIPE_COOKED_KEY`). Until then `paywall_presented` counts for `camera_capture` / `camera_gallery` / `recipe_start_cooking` will be 0 — this is expected, not a bug. `ingredient_confirmation` and `profile_subscription_card` are unconditional.

## Install-anchor scheme (Day-0 cohort key)

`lib/install-anchor.ts` lazily materializes an anonymous `installId` (UUID via `expo-crypto`) and `installAnchorTs` (`Date.now()`) on first launch, persisting both to the existing synchronous storage facade (`storage` from `~/data`, wrapping MMKV) under `analytics:install_id` / `analytics:install_anchor_ts`. Subsequent reads — including across cold restarts — return the persisted values untouched.

Day-0 is defined as **within 24h of `installAnchorTs`** (`DAY0_WINDOW_MS`). This is what classifies `day0_trial_cancelled` and what every cohort metric (Day-0 cancel %, trial-to-paid) is computed against.

## Where each metric is read

| Metric | Source |
|---|---|
| Day-0 trial cancel % | `day0_trial_cancelled` count / `trial_started` count, sliced by cohort = `installAnchorTs` day. Read in **Sentry** (sliced by `triggerSource`) and cross-checked against the RevenueCat cancellation report. |
| Trial → paid conversion | `paid_converted` / `trial_started`, sliced by cohort. RevenueCat's built-in **Conversion** chart reads `paid_converted` natively via the `funnel_paid_converted_ts` customer attribute. |
| Refund rate | `subscription_refunded` / `paid_converted`. RevenueCat's **Refunds** report is the source of truth; the Sentry event lets us slice refunds by the trigger surface that started the trial. |
| RLTV (retention/lifetime value) | Read from the **RevenueCat dashboard** (Revenue / Retention charts), keyed on the same `installId`. Sentry carries the funnel signals; RC carries the revenue math. |

### Sentry + RevenueCat fan-out

`emitFunnelEvent()` forwards every event to **both** sinks in parallel:

- **Sentry** — non-terminal events as breadcrumbs (cheap, sampled), terminal events (`paid_converted`, `subscription_refunded`) as `captureMessage` with the `funnel` tag and level `info`. This is what lets us slice by `triggerSource` (which gating surface drives trials vs cancels), which RevenueCat cannot do.
- **RevenueCat** — `Purchases.setAttributes({ funnel_<type>_ts, funnel_last_event, funnel_last_event_ts })` so the RC dashboard's native conversion/retention/refund charts read the same funnel as the app.

Both sinks are wrapped in try/catch (the RC path is fire-and-forget with a `.catch()` swallow) so analytics can **never** break a purchase path. Events carry only the anonymous `installId` (no email / user id) and respect the existing `EXPO_PUBLIC_SENTRY_SEND_PII` gate.

## Caveats

- **Diffing `CustomerInfo` is heuristic.** Cancel/refund detection relies on `unsubscribeDetectedAt` / `refundedAt` / entitlement-active transitions. Billing-retry grace periods may misclassify. Treat Day-0-cancel % as approximate until validated against the RevenueCat cancellation report.
- **`paid_converted` / `subscription_refunded` are deduped** per install (terminal events fire once). The `customerInfoUpdateListener` fires repeatedly; without dedup, repeat callbacks would double-count conversions.

## Testing

`lib/analytics/__tests__/funnel-events.test.ts` (pure helpers + fan-out + safety) and `lib/__tests__/install-anchor.test.ts` (idempotent materialization / persistence) cover:
- Day-0 classification at 2h vs 26h vs the exact 24h boundary
- Each `PAYWALL_RESULT` → exactly one funnel event
- `triggerSource` propagation
- `diffCustomerInfo` transitions (activation, cancel, unsubscribe-detected, refund, no-op, null-safe)
- `emit()` is idempotent for terminal events
- `emit()` throws nothing when `Sentry.addBreadcrumb` / `Purchases.setAttributes` are stubbed to throw
- fan-out to both sinks in a single call

`bun run typecheck` and `bun run test -- lib/analytics lib/__tests__/install-anchor utils/__tests__/subscription-utils` must stay green.
