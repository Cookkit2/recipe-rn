# Paywall: Annual-as-Default — Issue [#723](https://github.com/Cookkit2/recipe-rn/issues/723) Runbook

> **Why:** Cheap annual plans retain up to **36% Y1 vs 6.7%** for high-priced monthly, and ~30% of annuals still cancel in month 1 — pricing choice dominates retention ([#F8]). Making annual the default/recommended option is a config-only, high-leverage change.
>
> **In-repo scope: NONE.** All four paywall surfaces call `presentPaywallIfNeeded()` (`utils/subscription-utils.ts`), which presents RevenueCat's default paywall (`RevenueCatUI.presentPaywall`). The default/featured package is driven entirely by the **RevenueCat offering + paywall template**, configured in the dashboard — not in code.

## Call sites (no changes needed — for reference)
- `app/ingredient/(create)/confirmation.tsx:42`
- `components/Camera/CameraActionRow.tsx:46,77`
- `components/Recipe/Details/BottomActionBar.tsx:72`
- `components/Profile/SubscriptionCard.tsx:54` (the "subscribe" button)

Entitlement id: `"Pro"` (see `ENTITLEMENT_IDENTIFIER` in `utils/subscription-utils.ts`).

---

## Steps (RevenueCat dashboard)

1. **Products** → confirm an **annual** product exists for Cookkit Pro (with an attractive effective monthly price — "cheap annual" is what drives the 36% retention per [#F8]).
2. **Offerings** → set the offering that includes the **annual** product as the **Current (default) offering**.
3. **Paywall template** (RevenueCatUI / Customer Center paywall):
   - Mark the **annual package as the featured/recommended** option (the visually highlighted, pre-selected tier).
   - Order packages **annual → monthly** (annual first).
   - Surface the savings vs. monthly on the annual row (e.g., "Save 50%").
4. **Free trial** (couples with [#724](https://github.com/Cookkit2/recipe-rn/issues/724)): attach a **14–21 day trial** to the annual product — longer trials convert ~70% better ([#F6]). *Decide exact length via the #724 A/B.*
5. **Save & publish** the offering/paywall.

## Verify
- Sandbox account → trigger each of the 4 call sites → confirm the paywall shows **annual as the default/featured** tier with the trial applied.
- `bun run ios` (sandbox) → `presentPaywallIfNeeded()` flow.
- Confirm purchase updates entitlement via the existing `customerInfoUpdateListener` → `invalidateSubscriptionEntitlementsQuery()` in `app/_layout.tsx`.

## Measure (requires [#718](https://github.com/Cookkit2/recipe-rn/issues/718) instrumentation)
Watch for the [#F8] lift: share of new subscribers choosing annual ↑; Y1 retention ↑; month-1 annual cancellation rate. Compare monthly-cohort vs annual-cohort RLTV.

## Rollback
Revert the offering's default/featured package to monthly in the dashboard — no code deploy needed.

---

## What's NOT in this issue (to avoid scope creep)
- Changing *what's gated* or *which features are Pro* — that's gating policy, separate.
- The trial-length A/B — that's [#724].
- A harder paywall variant — that's [#725].
- Centralizing entitlement reads — that's [#717] (still recommended before relying on gating in code).
