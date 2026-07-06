# Pricing Decision — Lifetime Tier vs Counter-Positioning

> **Status:** DECISION REQUIRED (product owner). This document is analysis + a recommendation; it does **not** make the final call. Linked to issue [#745](https://github.com/Cookkit2/recipe-rn/issues/745) (P1-8).
>
> **Evidence base:** competitive segment deep-dive ([`docs/research-segment-deepdive.md`](./research-segment-deepdive.md), findings [F12]–[F22]) and RevenueCat monetization benchmarks ([`docs/ROADMAP.md`](./ROADMAP.md), findings [F5]–[F9]). All RevenueCat figures are **category-agnostic medians to A/B test, not guaranteed lifts for Cookkit**.

## TL;DR

The recipe-manager segment Cookkit competes in is dominated by **pay-once** incumbents who market "no subscription" as a moat ([F12]). Cookkit Pro's subscription is the inverse of that norm, so the status quo is not neutral — it is a positional disadvantage that needs an explicit answer.

**Recommendation: Option C (hybrid — keep the subscription, add a Lifetime tier), but only as a Phase-2 move.** Do not build Lifetime now. First land the in-flight subscription rigor (cheap annual as default [#723](https://github.com/Cookkit2/recipe-rn/issues/723), longer trial [#724](https://github.com/Cookkit2/recipe-rn/issues/724), Day-0 funnel instrumentation [#718](https://github.com/Cookkit2/recipe-rn/issues/718)), measure actual conversion/RLTV/churn, and **use those numbers** to decide whether a Lifetime tier is worth its complexity. Whichever tier model wins, **counter-position aggressively** (Option A's copy strategy) — Cookkit's AI features (auto meal-plan [#727](https://github.com/Cookkit2/recipe-rn/issues/727), pantry-aware dedup, voice) are things Paprika/Mela **structurally cannot match** because they are pay-once products with no recurring revenue to fund cloud AI ([F15], [F22]).

The rest of this document is the analysis behind that recommendation. **The product owner makes the final call.**

---

## 1. The threat (why this is a decision, not a non-decision)

Per [F12] (high confidence, 3-0 verified):

| Competitor | Model | Price | Positioning |
| --- | --- | --- | --- |
| **Paprika 3** | One-time | $4.99 | #1 Food & Drink, 4.9/5 (53K ratings). Reddit r/PaprikaApp repeatedly cites "no ads, no subscription" as a buying reason. |
| **Mela** | One-time IAP | $6.99 (iOS) / $14.99 (macOS) | "A one-time purchase to unlock all features." |
| **Pestle** | Freemium + Lifetime | Sub $2.99–$3.99/mo or $24.99–$29.99/yr; **Lifetime $39.99–$49.99** | The only competitor offering both — Pestle's model is the live existence-proof that hybrid works in this segment. |
| **Cookkit Pro** | Subscription (monthly/annual) | TBD | The **only** one of these four with no pay-once option. |

Cookkit is functionally **ahead** on pantry-aware grocery dedup, the in-store grocery map, the 9-strategy recommendation engine, cross-platform vs Mela's Apple lock-in, and voice-cooking depth ([F22]). The pricing mismatch is therefore **not** a feature gap — it is a framing and buyer-segment mismatch: a slice of this category's buyers self-select *against* subscriptions on principle, and today Cookkit cannot capture them at all.

---

## 2. The three options

### Option A — Subscription-only + counter-position

Keep the current subscription model (no Lifetime tier) and win the positioning argument instead: Cookkit's subscription buys continuously-improving AI features that pay-once competitors cannot fund.

**Pros**
- **Lowest implementation cost.** No new RevenueCat offering, no new entitlement semantics, no new paywall variant. The only work is ASO/marketing copy (mostly done — [#722](https://github.com/Cookkit2/recipe-rn/issues/722) is CLOSED).
- **Defensible on its merits.** Paprika's meal-planning is entirely manual ([F15], 3-0), its grocery entry is high-friction with flaky Siri ([F16]), and it has shipped no AI. A subscription funds ongoing cloud Gemini, the auto meal-plan ([#727](https://github.com/Cookkit2/recipe-rn/issues/727)), and macro-target planning ([#746](https://github.com/Cookkit2/recipe-rn/issues/746)) — none of which a $4.99-one-time product can economically match. The counter-position is real, not spin.
- **Aligns with [F9]:** AI apps monetize harder (+52% trial conversion, +41% Y1 RLTV). The subscription is the vehicle that captures that AI RLTV premium.

**Cons**
- **Concedes the pay-once-preferring buyer entirely.** Some users in this category will never subscribe, period. Option A leaves that revenue on the table with no recourse.
- **Subscriptions churn faster.** [F8] pricing dominates retention: ~30% of annuals cancel in month 1, and high-priced monthly retains only ~6.7% Y1 vs 36% for cheap annual. [F9] AI apps specifically churn ~30% faster and refund ~20% more. A subscription-only model carries that churn/refund drag forever.
- **Positioning risk if AI features slip.** The counter-argument only holds while Cookkit's AI is visibly better. If Gemini import reliability ([F17] — Mela already ships on-device ML) or auto meal-plan (#727) underdelivers, the "subscription = better AI" story collapses and there is no fallback tier.
- **[F5] caveat:** hard paywalls convert ~5× freemium but with higher refunds (5.8% vs 3.4%) and the *same* Y1 retention — i.e. a conversion lever, not a retention strategy. Subscription-only leans entirely on a lever that does not improve retention.

**Implementation cost:** Minimal. ASO repositioning (#722) is already CLOSED; this option is essentially "keep building AI features, sharpen the copy." RevenueCat config: no change. Gating: no change beyond #717 (CLOSED).

### Option B — Add a Lifetime tier alongside the subscription (Pestle's model)

Introduce a Lifetime package ($39.99–$49.99, matching Pestle's band) as a second option in the RevenueCat offering. Subscription stays for users who prefer it; Lifetime captures the pay-once-preferring buyer.

**Pros**
- **Captures an otherwise-lost buyer segment.** Directly answers the [F12] threat. Pestle proves the hybrid model is viable in this exact category.
- **Higher up-front revenue per conversion.** A $39.99–$49.99 Lifetime purchase dwarfs a single month or even a single year of subscription revenue, improving payback period and cash conversion — useful before Cookkit has proven long-term subscription retention.
- **Lower ongoing churn/refund exposure on that revenue.** Lifetime buyers cannot cancel a recurring charge, so they do not appear in the month-1 annual churn ([F8]) or the AI-app refund surge ([F9]). The revenue is "locked."
- **Neutralizes the competitors' own moat.** "No subscription" stops being a reason to pick Paprika over Cookkit if Cookkit *also* offers a no-subscription path.

**Cons**
- **Lifetimes are a known RLTV trap at scale.** A Lifetime buyer who would otherwise have subscribed for 3+ years is net-negative vs the subscription, and you find out only in hindsight. [F8] cheap annuals retain 36% Y1 — at scale, a cohort of multi-year subscribers can exceed a one-time $49.99. Pestle's success does not guarantee Cookkit's, because Cookkit's AI cost structure (cloud Gemini per request) makes Lifetime less margin-friendly than for a pay-once competitor.
- **AI cost asymmetry (the structural problem).** Paprika/Mela can offer Lifetime cheaply because their per-user serving cost is ~zero (local-only, no cloud inference). Cookkit's Gemini/AI features have a **marginal cost per active user**. A Lifetime tier sold today commits Cookkit to serving that user's AI calls indefinitely for a fixed one-time fee — the longer they use the AI features, the worse the unit economics. This is the strongest argument *against* a pure Lifetime and is unique to Cookkit among these competitors.
- **Product/entitlement complexity.** A second entitlement or entitlement-source path means the gating logic (#717, now centralized on a single `"Pro"` entitlement) must distinguish "Pro via subscription" from "Pro via lifetime" for things like renewal messaging, trial logic, and "your subscription expires" copy in `components/Profile/SubscriptionCard.tsx`. RevenueCat supports this (entitlements can be granted by multiple products), but the paywall UI, restore flow, and the `presentPaywallIfNeeded` paths ([`utils/subscription-utils.ts`](../utils/subscription-utils.ts)) all need a second-package variant.
- **Paywall decision fatigue.** Offering monthly + annual + lifetime on one paywall raises choice complexity. RevenueCat [F5]–[F8] evidence favors *simple, cheap-annual-default* paywalls; a Lifetime tile works against that simplicity unless carefully positioned (e.g., as an "or buy once" secondary affordance).

**Implementation cost:** Moderate. RevenueCat: new product + new package added to the current offering, granting the existing `"Pro"` entitlement (so #717's single read path still works — the entitlement is the same, only the product behind it changes). Paywall: `RevenueCatUI.presentPaywall` renders the current offering, so the Lifetime package appears automatically once configured, *but* the copy/affordance for "Lifetime vs subscribe" needs design. Gating: #717 (CLOSED) is the prerequisite and is done. ASO (#722, CLOSED): add "or one-time purchase" messaging. Couples with #723 (annual default) — the paywall IA needs to reconcile three options, not two.

### Option C — Hybrid (annual + Lifetime), the recommended path *as a Phase-2 move*

Keep both models but be deliberate about ordering and pricing architecture: make **cheap annual the default** (per [F8], #723), and add **Lifetime as a secondary "buy once" option** for buyers who reject subscriptions. Do **not** ship Lifetime until the subscription funnel is instrumented and the cheap-annual default has real numbers behind it.

**Why the ordering matters (the crux of the recommendation):**
1. [F8] says cheap annual retains **36% Y1 vs 6.7%** for high-priced monthly — the single largest retention lever in the data, and it is *config-only* (#723).
2. [F6] says 17–32-day trials convert **~70% better** than ≤4-day trials (#724).
3. [F7] says Day-0 decides ~50% of conversions — but Cookkit currently **cannot see its own Day-0 funnel** (#718 OPEN).

Until #718 ships real numbers, **any Lifetime decision is being made blind**. We do not know Cookkit's actual trial-to-paid, month-1 churn, or RLTV. A Lifetime tier priced at $49.99 is only defensible against the alternative (subscription) if we know what a subscriber is worth. Building Lifetime first would optimize for a buyer segment we have not measured, at the expense of the subscription rigor that the data says is the bigger lever.

**The recommended sequence:**
1. **Now (Phase 1):** Ship #718 (instrumentation), #723 (cheap annual default), #724 (longer trial). Run Option A's counter-position copy (free — #722 is done). Measure for 1–2 cohorts.
2. **Decision gate (Phase 2):** Using real Cookkit numbers, answer two questions: (a) is measured subscriber RLTV high enough that a $49.99 Lifetime would cannibalize more than it captures? (b) is there survey/support evidence of pay-once-preferring buyers bouncing at the paywall? If **yes to (b) and the cannibalization math in (a) is acceptable**, ship Option C's Lifetime tier as a secondary affordance.
3. **Either way:** Counter-position copy stays — it is free and correct regardless of tier model.

**Pros:** Captures the pay-once buyer (B's upside) while not betting the roadmap on an unmeasured segment (A's discipline). The decision is *informed by Cookkit's own data*, not Pestle's.
**Cons:** Slower — the Lifetime option (if it ships) is gated behind ~1–2 quarters of instrumentation. If the pay-once-preferring segment is large and impatient, this delay costs some conversions. Requires the product owner to actually run the Phase-2 decision gate rather than treat this doc as a one-time sign-off.

**Implementation cost:** Phase 1 = the cost of #718/#723/#724 (already scoped). Phase-2 Lifetime (if approved) = Option B's cost.

---

## 3. Revenue / retention implications at a glance

| Lever | [F]-ref | Relevance |
| --- | --- | --- |
| Hard paywall converts ~5× freemium, but +refunds, same Y1 retention | [F5] | A pure-subscription model's conversion tool is *not* a retention tool — argues for not over-relying on it. |
| 17–32-day trials convert ~70% better | [F6] | Subscription lever (#724). Independent of the Lifetime question; do this either way. |
| Day-0 decides ~50% of conversions | [F7] | First-session "aha" matters more than tier count. A confusing 3-option paywall can hurt Day-0; keep Lifetime as a secondary affordance. |
| Cheap annual retains 36% Y1 vs 6.7% monthly | [F8] | The biggest retention lever in the data, and it is config-only (#723). Do this before adding a Lifetime tile. |
| AI apps: +41% RLTV, +52% trial conversion, but +30% churn, +20% refunds | [F9] | The subscription *captures* the AI RLTV premium **and** inherits the AI churn/refund drag. A Lifetime tier removes the churn/refund drag on that buyer but forfeits the recurring RLTV upside. This is the core trade-off. |

**Net read:** The data does **not** say "add Lifetime" or "don't." It says (a) the subscription needs rigor first ([F8]/[F6]/[F7] levers are unmeasured and unshipped), and (b) the AI-churn drag ([F9]) is a real cost of subscription-only that a Lifetime tier partially insures against — making the Lifetime question worth *revisiting with data*, not worth answering today.

---

## 4. Counter-positioning copy (needed in all three options)

Regardless of tier model, the ASO/onboarding story must own the "why a subscription here, when Paprika is $4.99 once?" objection. Cookkit's subscription buys things the pay-once incumbents structurally cannot offer:

- **Auto meal-plan generation from your pantry & preferences ([#727](https://github.com/Cookkit2/recipe-rn/issues/727))** — Paprika's meal-planning is entirely manual, causing recipe-repetition bias at 500+ recipes ([F15]).
- **Pantry-aware grocery dedup with synonyms/units + in-store grocery map** — Paprika's grocery entry is in-app-only with flaky Siri; unmatched across all researched apps ([F16], [F22]).
- **Cross-platform voice-guided cooking** — vs Mela's Apple-ecosystem lock-in ([F18]).
- **Cloud AI recipe import that keeps improving** — vs Mela's frozen on-device ML shipped Jan 2025 ([F17]).

The honest framing: a one-time $4.99 funds a static, local-only app. A subscription funds a continuously-improving AI cooking assistant. That is a legitimate counter-position, not marketing — but it **must be paired with the AI features actually shipping** (the dependency cuts both ways: if #727/#746 slip, this argument weakens and the case for a Lifetime tier strengthens).

---

## 5. Recommendation

**Option C, sequenced** — but the final decision is the product owner's.

1. **Do not build a Lifetime tier now.** Ship the in-flight subscription rigor first: #718 (Day-0 funnel instrumentation, OPEN), #723 (cheap annual default, OPEN), #724 (longer trial, OPEN). These are the levers the data ranks highest and none of them requires a tier decision.
2. **Ship the counter-positioning copy now (free).** #722 (ASO) is CLOSED; this is the always-correct, zero-cost part of Option A.
3. **At a Phase-2 decision gate (after ~1–2 cohorts of real Cookkit data):** decide whether to add a Lifetime tier (Option B/C) using *measured* subscriber RLTV vs the Lifetime price point, plus any paywall-bounce evidence of pay-once-preferring buyers. Price a Lifetime, if approved, in Pestle's $39.99–$49.99 band and present it as a **secondary** affordance so it does not complicate the Day-0 paywall ([F7]).
4. **If the product owner disagrees and wants Lifetime sooner:** the prerequisite is already in place — #717 (clean single-`"Pro"` entitlement) is CLOSED, so a Lifetime product can grant the same entitlement with no new read path. The remaining work is RevenueCat offering config + paywall copy + ASO; budget a small-to-moderate sprint. The **AI marginal-cost caveat ([F9] + Gemini serving costs) is the risk to weigh most heavily** in that case — it is the one argument that applies to Cookkit but not to its pay-once competitors.

**Why not Option A outright:** it permanently concedes the pay-once-preferring buyer that [F12] shows is real and sizable in this segment, with no plan to capture them.
**Why not Option B right now:** it optimizes for an unmeasured segment before shipping the cheaper, higher-leverage subscription fixes ([F8]/[F6]) and before Cookkit knows its own subscriber RLTV to price Lifetime against.

---

## 6. Dependencies & implementation notes

- **#717 (clean entitlement) — CLOSED.** The single `"Pro"` entitlement read path in [`utils/subscription-utils.ts`](../utils/subscription-utils.ts) (`ENTITLEMENT_IDENTIFIER = "Pro"`) means any future Lifetime product grants the same entitlement — no new gating hook required. This is the foundational prerequisite and it is done.
- **#722 (ASO repositioning) — CLOSED.** Counter-position copy can land now.
- **#723 (cheap annual default) — OPEN.** Do first; [F8] says it is the largest retention lever and it is config-only.
- **#724 (longer trial) — OPEN.** Do alongside #723; [F6] says +70% conversion.
- **#718 (Day-0 funnel instrumentation) — OPEN.** The prerequisite for any *data-informed* Lifetime decision. Without it, this document's recommendation is the best that can be done on external benchmarks alone.
- **RevenueCat config (if Lifetime approved):** add a Lifetime product to the current offering; it grants the existing `"Pro"` entitlement. `RevenueCatUI.presentPaywall()` already renders the current offering, so the package appears automatically; the work is copy/affordance design and `components/Profile/SubscriptionCard.tsx` handling a non-expiring source. Pricing: match Pestle's $39.99–$49.99 band.

## References

- Issue [#745](https://github.com/Cookkit2/recipe-rn/issues/745) — this decision.
- [`docs/research-segment-deepdive.md`](./research-segment-deepdive.md) — segment findings [F12]–[F22].
- [`docs/ROADMAP.md`](./ROADMAP.md) — RevenueCat findings [F5]–[F9].
- Related: [#717](https://github.com/Cookkit2/recipe-rn/issues/717) (CLOSED), [#722](https://github.com/Cookkit2/recipe-rn/issues/722) (CLOSED), [#723](https://github.com/Cookkit2/recipe-rn/issues/723) (OPEN), [#724](https://github.com/Cookkit2/recipe-rn/issues/724) (OPEN), [#718](https://github.com/Cookkit2/recipe-rn/issues/718) (OPEN), [#727](https://github.com/Cookkit2/recipe-rn/issues/727) (OPEN).
