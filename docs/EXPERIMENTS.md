# A/B Experiments

Cookkit ships a thin, reusable A/B experiment layer in `lib/experiments/`. It
exists to let the monetization experiments **#724** (trial length), **#725**
(paywall hardness) and **#731** (retention) be bucketed and measured without
each re-implementing assignment + exposure tracking.

This framework provides **bucketing + measurement only**. It does NOT carry
variant payloads — see [What this framework does NOT do](#what-this-framework-does-not-do).

---

## Why not `useFeatureFlag`?

`hooks/queries/useFeatureFlags.ts` is a **remote boolean flag** (a Supabase-backed
on/off switch). It is NOT an experiment framework:

| Capability                          | `useFeatureFlag` | `useExperiment` |
| ----------------------------------- | :--------------: | :-------------: |
| Per-install variant bucketing       |        ❌        |       ✅        |
| Stable bucket across sessions       |        ❌        |       ✅        |
| Multi-variant (>2) support          |        ❌        |       ✅        |
| Exposure tracking (funnel event)    |        ❌        |       ✅        |
| Synchronous (no network fetch)      |        ❌        |       ✅        |

The two are complementary: `useFeatureFlag` gates a feature on/off globally from
the server; `useExperiment` splits installs into deterministic local buckets.

---

## Quick start

```tsx
import { useExperiment } from "~/lib/experiments";

function PaywallGating({ children }: { children: ReactNode }) {
  // Bucket this install into "control" or "long_trial". The bucket is stable
  // for the install and persisted across cold restarts.
  const { variant, isExposureLogged } = useExperiment(
    "trial_length_724",
    ["control", "long_trial"] as const
  );

  // Map the variant to the RevenueCat offering / paywall config yourself.
  const offeringId =
    variant === "long_trial"
      ? "cookkit_pro_long_trial"
      : "cookkit_pro_default";

  // The exposure event has already been emitted by the hook on first mount
  // (isExposureLogged === true), so #718 can slice per-variant conversion.
  return <PaywallSurface offering={offeringId}>{children}</PaywallSurface>;
}
```

### Reading the bucket outside React

The Day-0 paywall path must resolve the bucket **before** the first paywall
surface without blocking on a hook mount or network fetch (see issue #718 [F7]).
Use the non-hook resolver:

```ts
import { getExperimentAssignment } from "~/lib/experiments";

// Synchronous. Reads the persisted bucket, or hashes(installId + key) and
// persists it on first call. Does NOT emit exposure.
const variant = getExperimentAssignment("trial_length_724", [
  "control",
  "long_trial",
]);
```

### Suppressing exposure for non-gating reads

Diagnostics / debug overlays that read a bucket for **display only** (not a
gating decision) must NOT emit an exposure event — otherwise the conversion
denominator gets polluted:

```ts
const { variant } = useExperiment("trial_length_724", VARIANTS, {
  trackExposure: false,
});
```

---

## How assignment works

1. `getInstallAnchor()` (from `lib/install-anchor.ts`) yields the stable
   anonymous `installId` materialized on first launch.
2. `assignExperiment(installId, key, variants)` hashes
   `${installId}::${key}` with a 32-bit FNV-1a hash (`hashStringToUint32`) and
   takes `hash % variants.length`.
3. The result is **persisted to MMKV** under `experiment:assignment:${key}` so
   the user stays in their bucket across cold restarts, even if the install id
   were ever regenerated (issue #724 acceptance criterion #2: "a single user
   receives the same bucket across reinstalls").

The hash is **synchronous + dependency-free** — it does not use the async
`Crypto.digestStringAsync` — because bucketing must be readable on the hot path
(Day-0 paywall) and only needs determinism + uniform spread, not cryptographic
strength. The pure assignment function is unit-tested separately in
`lib/experiments/__tests__/assignExperiment.test.ts` (determinism, distribution
parity, single-variant, throws-on-empty).

### Bucketing contract — do NOT reorder variants mid-experiment

The variant's position in the array is part of its identity. Reordering the
array, or appending a new variant in the middle, will **shift buckets** and
contaminate the experiment. Append new variants at the **end** if you must
extend, and document that even appending is not transparent.

---

## Exposure tracking

On the first mount that reads the bucket for a gating decision, `useExperiment`
emits exactly **one** `experiment_exposed` funnel event via `emitFunnelEvent`
(see `lib/analytics/funnel-events.ts`):

```jsonc
{
  "type": "experiment_exposed",
  "experimentKey": "trial_length_724",
  "variant": "long_trial",
  "installId": "<anonymous>",
  "installAnchorTs": 1718000000000,
  "eventTs": 1718000012345
}
```

This stamps the install anchor (so it joins the Day-0 cohort math) and fans out
to Sentry + RevenueCat like every other funnel event. Re-renders and re-mounts
do **not** re-emit (a `useRef` gate plus React strict-mode safety).

The downstream funnel events (`trial_started`, `paid_converted`,
`day0_trial_cancelled`, `subscription_refunded`, …) already carry the same
`installId`, so joining `experiment_exposed` to conversion outcomes by
`installId` yields per-variant conversion rates.

---

## What this framework does NOT do

The variant **payloads** live elsewhere. This framework gives you a stable
variant string; mapping that string to the actual user-facing change is the
consuming issue's job.

| Experiment | What varies                                                        | Where the payload is configured                                                                                                      | Owner issue |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| #724       | Free-trial length (14–21 days vs. current)                         | **RevenueCat offering + App Store Connect / Google Play subscription product.** Trial length is a property of the subscription product attached to an RC package. The app maps `variant → RC offering id` in `utils/subscription-utils.ts`. | #724        |
| #725       | Paywall hardness (which RC paywall is presented)                   | **RevenueCat paywall config** surfaced via `presentPaywallIfNeeded()`. The app maps `variant → paywall/offering id`.                 | #725        |
| #723       | Lifetime pricing                                                   | **Owner's hands in the RevenueCat dashboard** (not an in-app experiment).                                                            | #723        |
| #731       | Retention intervention (e.g. re-engagement nudge content/timing)  | The consuming feature's own config (notification copy / schedule).                                                                   | #731        |

This PR wires **none** of the above — it only ships the bucketing + measurement
plumbing so each experiment issue can adopt it without re-deriving the layer.

---

## Wiring checklist for a new experiment

When adopting `useExperiment` in #724 / #725 / #731:

- [ ] Pick a **stable experiment key** (e.g. `trial_length_724`) — never rename it mid-experiment.
- [ ] Define the variant list **once** in a shared constant; do not reorder.
- [ ] Resolve the bucket **before** the first paywall surface using
      `getExperimentAssignment` (synchronous) so the Day-0 paywall never blocks.
- [ ] Map the variant to the RevenueCat offering / paywall / content config in
      the consuming module — do not put the payload in this framework.
- [ ] Verify `useExperiment` (or a gating call site) mounts where the experiment
      decision is first **exposed** to the user, so the `experiment_exposed`
      event fires once and only once.
- [ ] Pre-register the decision rule (primary metric, guardrail metrics, minimum
      sample size) — see issue #724 acceptance criteria.
- [ ] `bun run typecheck && bun run lint` green; no change to Pro-gating for
      users who already have an active entitlement.

---

## Rollback

Because the variant payloads live in RevenueCat (offering / paywall config),
rolling an experiment back to 100% control is a **dashboard change** (disable
the audience / flip the offering) with no app release required. This framework's
local bucket is inert without a consuming call site, so disabling the call site
or the RC audience reverts behaviour immediately.
