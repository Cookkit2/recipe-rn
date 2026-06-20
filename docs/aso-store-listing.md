# ASO & Store Listing Copy — Issue [#722](https://github.com/Cookkit2/recipe-rn/issues/722)

> **Goal:** Surface Cookkit's verified, under-claimed differentiators in the App Store / Play Store listing and first-run onboarding so install→trial conversion improves (Day 0 is decisive — [#F7]).
>
> **The one line that must land:** *"The grocery list that knows what's already in your pantry."* Cookkit already does pantry-aware grocery dedup (synonyms + unit conversion + coverage) — Samsung Food's documented weakness ([#F2]) and Cookkit's unclaimed edge.

---

## Differentiators to lead with (evidence-ranked)

1. **Pantry-aware grocery list** — only adds what you *don't* already have. (Beats Samsung Food [#F2]; already shipped in `useGroceryList.ts`.) **#1 hero.**
2. **Offline-first** — works without internet; your data stays local. (CozZo shut down when its cloud died [#F10] — reliability is a moat.)
3. **Cook from what you have** — recipes matched to your pantry + dietary prefs (9-strategy recommender).
4. **Voice-guided cooking** — hands-free, step by step.
5. **In-store grocery map** — find items faster in the store.
6. **Less food waste** — expiry nudges + waste tracking.

---

## Apple App Store

**App Name (30):** `Cookkit — Pantry & Meal Planner`
*(keeps brand, stuffs the two highest-value keywords)*

**Subtitle (30):** `Cook from what you already have`
*(or: `Grocery list that knows your pantry` — 32 chars, too long; use `Knows your pantry` if shorter needed)*

**Keywords (100, comma-separated):**
`pantry,meal planner,grocery list,recipe saver,cook with what i have,food waste,voice cooking,recipe`

**Promotional Text (170, editable without re-review):**
`New: your grocery list now skips anything already in your pantry. Cook from what you have, waste less, and cook hands-free with voice guidance.`

**Description (lead ~600 chars):**
```
Stop buying things you already have.

Cookkit builds your grocery list from your meal plan — then automatically subtracts anything already in your pantry. No more duplicate salt, no more "you already have 3 onions." It's the pantry-first cooking app that actually knows what's on your shelf.

• COOK FROM WHAT YOU HAVE — recipes matched to your pantry, dietary needs, and what's expiring next.
• VOICE-GUIDED COOKING — hands-free, step-by-step. Your screen stays on; your hands stay free.
• OFFLINE-FIRST — everything works without internet. Your kitchen doesn't need Wi-Fi, and neither does your recipes app.
• LESS WASTE — expiry reminders and waste tracking, so ingredients get used, not thrown out.

Works entirely on-device; your data stays yours.
```
*(Rest of the 4000-char description: feature deep-dives, household sharing, meal-plan templates, gamification.)*

**Screenshots (concept order):**
1. Grocery list item flagged **"Already in your pantry ✓"** next to one marked "Buy 2" — the hero shot.
2. **"Cook from what you have"** — a recipe card "You have 9/10 ingredients."
3. **Voice cooking** screen with a big current step + mic.
4. **In-store grocery map** highlighting an aisle.
5. **Meal plan** week view.
6. **Expiry/waste** nudge ("Use these 2 items today").

---

## Google Play Store

**Short description (80):** `Pantry-first cooking: grocery lists that skip what you own, cook-from-pantry recipes, voice cooking.`

**Long description (4000):** lead with the same pantry-aware paragraph above; Play indexing rewards keyword density in the first lines, so front-load `pantry`, `grocery list`, `meal planner`, `recipe`.

---

## In-app onboarding tie-in (the in-repo part of #722)

Files: `app/onboarding/{index,tutorial}.tsx`, `components/Onboarding/DisplayCards.tsx`.

Add a first-run card that demonstrates the moat concretely:
- **Card copy:** *"Other apps add everything to your list. Cookkit checks your pantry first."*
- **Visual:** the same "Already in your pantry ✓" grocery-list mock used in screenshot #1.
- **CTA:** leads straight into pantry population (pairs with #721 voice batch entry).

> ⚠️ The store-listing copy itself is authored in **App Store Connect / Play Console** (not in-repo). This file is the copy artifact to paste there; commit it in the #722 PR as the source of truth.

---

## Notes
- All claims above are already-shipped features (verified in code) — no vaporware in the copy.
- RevenueCat data ([#F7]) says the first session decides ~50% of conversions, so the listing + first-run must hit the moat immediately.
