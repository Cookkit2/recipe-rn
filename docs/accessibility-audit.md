# Accessibility Audit (Issue #732, P3-2)

> **Scope:** This is an **audit only**, not remediation. It inventories accessibility gaps across
> `components/` and `app/` and prioritizes them so a follow-up remediation issue can be scoped into
> reviewable phases. No production code is changed by this document.
>
> **Method:** Every finding below was verified by reading the actual source on `origin/master`
> (commit `66ad869`) at the time of the audit — not extrapolated from the issue's pre-flight grep.
> Quantitative counts were re-run live; contrast ratios were computed from the real `global.css`
> oklch tokens. Where the issue's draft *claimed* a gap that does not exist, that is noted
> explicitly so the remediation PR does not regress working coverage.

**Audit date:** 2026-06-20
**Audited ref:** `origin/master` (`66ad869`)
**Audited by:** Claude (autonomous, issue #732)

---

## 1. Baseline measurements (live grep)

Re-run against the current tree (file count has grown since the issue's pre-flight; ratios hold):

| Metric | Issue draft | Live (this audit) |
|---|---|---|
| `.tsx` files in `components/` + `app/` | 198 | **254** |
| Files with `accessibilityLabel` | 50 | **70** |
| Files with `accessibilityRole` | — | **54** |
| Files with `accessibilityState` | 11 | **19** |
| Files with `accessibilityHint` | — | **8** |
| Files with `hitSlop` | 9 | **12** |
| Files with `allowFontScaling` | 0 | **0** |
| Files with `maxFontSizeMultiplier` | 0 | **0** |
| Files with `accessibilityLiveRegion` | — | **1** (only `app/grocery-map/index.tsx`) |
| Files with `accessibilityActions` | 0 | **0** |

**Headline takeaways:** Dynamic Type is effectively unsupported (0 files), live-region announcements
exist in exactly one place, and no custom control exposes rotor `accessibilityActions`. Label/role
coverage is broader than the issue's draft implied but is concentrated in a handful of well-built
controls; many high-traffic surfaces still rely on bare `Pressable`s.

---

## 2. Severity scale

- **P0 (blocking)** — App Store / core-flow risk, or a control is completely invisible to
  VoiceOver/TalkBack on a primary screen. Fix before shipping any a11y work.
- **P1 (high)** — Real exclusion of the target population on a high-traffic screen, or a
  cross-cutting primitive gap that fans out to many screens.
- **P2 (medium)** — Partial gap, decorative media, secondary screen, or polish (focus order,
  regression guard).

---

## 3. Prioritized gap table

| # | Component / File | Gap | WCAG / impact | Fix-sketch | Severity |
|---|---|---|---|---|---|
| 1 | `components/ui/text.tsx` | No `maxFontSizeMultiplier`; `allowFontScaling` not pinned true. Every label, ingredient name, step instruction is locked to the designer's font size. | 1.4.4 Resize text — **systemic** | Add optional `maxFontSizeMultiplier` (≈1.4) prop threaded to `RNText`; assert `allowFontScaling !== false`. One change inherits to every consumer. | **P1** |
| 2 | `components/ui/typography.tsx` (`H1`–`H4`, `P`, `Lead`, `Small`, `Muted`, `Large`, `BlockQuote`, `Code`) | Same as #1 — none set `maxFontSizeMultiplier`. Headings can overflow at iOS accessibility XL. | 1.4.4 Resize text — **systemic** | Thread `maxFontSizeMultiplier` per heading (tighter for big display sizes like H1). | **P1** |
| 3 | `components/MealPlanCalendar/MealSlot.tsx` | **True zero coverage.** Drop-zone `Pressable` (L178) has no `accessibilityRole`/`Label`/`Hint`. Drag-and-drop is gesture-only with no VoiceOver equivalent. | 2.1.1 Keyboard, 4.1.2 Name/Role/Value — drag-only affordance | Add `accessibilityRole="button"`, `accessibilityLabel` ("Breakfast, {recipe or empty}"), `accessibilityHint` ("Double tap to edit"), and `accessibilityActions` (`move`/`delete`) via `onAccessibilityAction`. | **P1** |
| 4 | `components/MealPlanCalendar/RecipeDraggable.tsx` | **True zero coverage.** Draggable card `Pressable` (L241) has no role/label/hint. Drag handle indicator (L250 "⋮⋮") is decorative text read verbatim. | 2.1.1, 4.1.2 — drag-only affordance | Add role/label ("{recipe title}, draggable"), hint ("Double tap to view, or use rotor to move"), `accessibilityActions`. Mark the "⋮⋮" handle `accessible={false}`. | **P1** |
| 5 | `app/grocery-map/index.tsx` (tap zones via `MapLayer` markers) | Map markers/tap zones have no documented label exposed to assistive tech (native map annotations vary by platform). Loading/error states correctly use `accessibilityLiveRegion` (good — preserve this). | 4.1.2 — map interactions unreachable | Verify `MapLayer` annotation `title`/`accessibilityLabel`; add a non-map fallback list (`MiniStoreList` already exists — ensure it is reachable as the a11y path). | **P2** |
| 6 | `global.css` **light** `--color-muted-foreground: oklch(0.556 0 0)` (L62) on `--color-background: oklch(0.92 0 20)` (L51) | Computed **3.73:1** — fails WCAG AA for body text (needs 4.5:1). Passes for large/UI text (≥3:1). Used pervasively for secondary text, hints, captions. | 1.4.3 Contrast (Minimum) | Darken light `muted-foreground` to ~`oklch(0.48 0 0)` (~4.6:1). On `card` (0.96) it's 4.21:1 — also borderline; recompute after change. | **P1** |
| 7 | `app/profile/preferences/voice-settings.tsx` (and peer pref screens) | `Switch` components (L51, L65) and the speech-rate `Slider` (L80) carry **no** `accessibilityLabel` or `accessibilityState`. VoiceOver announces bare "switch, off" with no context. | 4.1.2 Name/Role/Value | Add `accessibilityLabel` (the setting title) + `accessibilityState={{ checked }}` to each `Switch`; add `accessibilityRole="adjustable"`, `accessibilityValue={{ min, max, now, text }}`, and `accessibilityActions` to the `Slider`. | **P1** |
| 8 | `components/Timer/TimerItem.tsx` | Countdown text (L123) changes every second and the "Done!" completion is conveyed by **color only** (`text-green-500`). No `accessibilityLiveRegion` — VoiceOver users get no countdown/finish announcement. Icon buttons (Play/Pause/Delete) are correctly labeled (preserve). | 1.4.1 Use of Color, 4.1.3 Status Messages | Add `accessibilityLiveRegion="polite"` to the countdown (debounced) and `assertive` on completion; add an icon/text equivalent for the completed state, not green-only. | **P1** |
| 9 | `components/ui/StarRating.tsx` | Per-star labels exist (L46 "Rate N stars", `checked` state L47 — good), but interactive rating requires precise per-star taps. No `accessibilityRole="adjustable"` / `accessibilityActions` / `accessibilityValue`. | 2.5.1 Pointer Gestures, 4.1.2 | Convert interactive mode to `role="adjustable"` with `accessibilityValue={{ min:1, max, now, text }}` and increment/decrement `accessibilityActions`. | **P2** |
| 10 | `components/VoiceCooking/MicButton.tsx` | **Already has** role + stateful label + `selected` state (L133–135). **Missing only** `accessibilityHint`, and combined listening/speaking transition is not reflected in announced state. | 4.1.3 Status Messages | Add `accessibilityHint` ("Double tap to start or stop voice control"); surface listening-vs-speaking in the label/state so transitions announce. **Do not rewrite — extend.** | **P2** |
| 11 | `components/Pantry/IngredientItemCard.tsx` | Has role + label (L33–34 — good) but **no check-off state** for the pantry toggle. | 4.1.2 | Add `accessibilityState={{ checked }}` reflecting the in-pantry toggle. | **P2** |
| 12 | `components/Shared/SlidingNumber.tsx` | Already has role + label + hint (L172–174 — **the non-gesture fallback the issue asked for already exists**). Only gap: no `accessibilityActions` if a swipe gesture is added later. | 4.1.2 | Verify-only; add `accessibilityActions` only if a swipe is introduced. **Do not claim this is bare.** | **P2** |
| 13 | `components/ui/outlined-image.tsx` | Decorative layered image wrapper never marks itself `accessible={false}`. Nine offset copies + base are each potentially focusable. | 1.3.1 Info and Relationships | Default `accessible={false}` / collapse children when used decoratively; allow an opt-in `accessibilityLabel` when it conveys content. | **P2** |
| 14 | `components/ui/modal.tsx` | Relies entirely on RN `Modal`'s native focus behavior; no explicit first-focus / focus-return verified. Backdrop dismiss `Pressable` (L29) has no role/label (dismiss-by-tap is unlabeled for AT). | 2.4.3 Focus Order, 4.1.2 | Verify focus trap on iOS/Android; add `accessibilityRole="button"`/`Label="Dismiss"` or `accessible={false}` to the backdrop as appropriate. Apply same review to `components/ui/dialog.tsx`, `components/Shared/SheetModalWrapper.tsx`, `components/MealPlanCalendar/TemplateSheet.tsx`. | **P2** |
| 15 | `components/Recipe/Step/StepCard.tsx` | Outer `Pressable` (L127) is a press-scale animation container with no role/label; it is not an action for the user but VoiceOver will still focus it. | 4.1.2 | Mark `accessible={false}` and let the inner step content own focus, or give it a descriptive label of the current step. | **P2** |
| 16 | `app/index.tsx` (pantry home toolbar) | `Stack.Toolbar.Button`s for Search / Add ingredient / Profile **already have** `accessibilityLabel` (L22, L30, L40) — verified. Missing: `accessibilityHint` and explicit `accessibilityRole` (toolbar primitives may not default to button). | 4.1.2 | Add `accessibilityHint` where the action is non-obvious and confirm role. Low effort. | **P2** |
| 17 | `app/grocery-map/index.tsx` inline `Text` styles | Hard-coded `color: "#666666"` / `"#1A1A1A"` (L198, L210, L215) bypass the theme tokens and the dark-theme contrast guarantee; fixed font sizes ignore Dynamic Type. | 1.4.3, 1.4.4 | Route through `useColors()` tokens and the `Text` primitive (inherits Dynamic Type). | **P2** |
| 18 | Bare `Pressable`s lacking labels (production, non-test) | `components/Recipe/ImportResultCard.tsx`, `components/Recipe/Details/ReviewsList.tsx`, `components/Recipe/Details/TipCard.tsx`, `components/Analytics/WasteLogItem.tsx` each contain a `Pressable` with no role/label/hint. | 4.1.2 — unnamed controls | Case-by-case: add role + label + hint, or mark `accessible={false}` if the press is purely cosmetic. | **P2** |
| 19 | Spoken (TTS) voice-cooking prompts & haptic cues | No on-screen text equivalent for TTS prompts; haptic-only cues have no accessible fallback. VoiceOver users and users with haptics disabled are stranded mid-recipe. | 1.4.1, 4.1.3 | Render the current spoken prompt as visible (and live-region) caption text alongside the audio path. | **P1** |
| 20 | Regression guard | No automated guard prevents a new icon-only `Pressable`/`Button` from shipping without a label. Project has **no ESLint** (`bun run lint` = prettier + tsc only). | Preventive | Either (a) introduce ESLint + `eslint-plugin-react-native-a11y` at **warn** (`icon-has-label`, `no-nested-touchables`, `has-accessibility-hint`) as a *separate* gate, or (b) Jest render assertions for representative controls. Update `jest.config.js` `collectCoverageFrom` to include `components/**` and `app/**` and create `components/__tests__/`. | **P2** |

---

## 4. Highest-ROI fixes (do these first)

These give the largest accessibility gain per unit of review surface area, because each is either
cross-cutting (one change inherits everywhere) or unblocks a primary screen that is currently
unusable under VoiceOver:

1. **Dynamic Type in the primitives (#1, #2).** Threading `maxFontSizeMultiplier` through `text.tsx`
   and `typography.tsx` is a single, contained change that makes *every* label, ingredient, and step
   respect iOS Larger Text. Highest fan-out in the audit.
2. **The two zero-coverage gesture controls (#3 MealSlot, #4 RecipeDraggable).** Drag-and-drop meal
   planning is one of Cookkit's differentiators and is currently 100% unreachable to VoiceOver/TalkBack.
   Adding role + label + hint + rotor actions is the single biggest "feature now works for everyone" win.
3. **Light-theme `muted-foreground` contrast (#6).** One token edit fixes a verified 3.73:1 failure
   that pervades secondary text across the whole light theme. (Recompute against `card` after.)
4. **Preference `Switch`/`Slider` labels (#7).** Every preference toggle currently announces as a
   context-less "switch, off" — a quick, mechanical add of `accessibilityLabel` + `accessibilityState`.
5. **Timer live-region + non-color completion state (#8).** Hands-busy cooking is the core use case;
   a VoiceOver user today gets no countdown and a color-only "Done!".

### Highest-ROI verification note (per the issue's explicit ask)

> *"icon-only toolbar buttons like the new mic/search/add in `app/index.tsx` need labels — verify
> they have them."*

**Verified:** the `app/index.tsx` pantry toolbar buttons (Search, Add ingredient, Profile) **already
carry `accessibilityLabel`** (L22, L30, L40). They do **not** have an `accessibilityHint` and their
`accessibilityRole` is implicit (set by `Stack.Toolbar.Button`). The "mic" button referenced in the
issue does not live in `app/index.tsx`; the voice mic control is `components/VoiceCooking/MicButton.tsx`,
which already has role + stateful label + `selected` state and needs only a hint (row #10). Neither
control is a true P0 — the headline icon-only toolbar is already labeled.

---

## 5. Controls the draft assumed were bare — **verified already covered**

The remediation PR must *extend*, not rewrite, these. Regressing them is a real risk flagged in the
issue's reviewer note and re-confirmed here:

| Control | Verified existing coverage | Only remaining gap |
|---|---|---|
| `components/VoiceCooking/MicButton.tsx` (L133–135) | role=`button`, stateful label "Mute/Unmute voice assistant", `accessibilityState={{ selected }}` | add hint + announce listening/speaking transitions |
| `components/Shared/SlidingNumber.tsx` (L172–174) | role=`button`, label "Edit quantity", hint "Opens modal to edit the quantity" | none required (non-gesture fallback already present) |
| `components/GroceryList/GroceryListItem.tsx` (L103–107) | role `checkbox`/`button`, `accessibilityState.checked`, label with name+quantity | verify isCovered/needed distinction uses text/icon not color alone (it does: "✓ You have enough!" + check icon) |
| `components/Camera/CameraActionRow.tsx` (L127, L140–141, L153) | gallery/capture/save all labeled, capture has role=`button` | verify-only; capture button exposes `disabled` state when camera unavailable |
| `components/Timer/TimerItem.tsx` (L141–142, L161–162) | Play/Pause + Delete icon buttons labeled with role=`button` | countdown live-region + non-color completion (row #8) |
| `components/auth/AuthInput.tsx` (L47, L74–75) | input label, show/hide password toggle has role + label + `hitSlop` | none material |
| `components/auth/SocialAuthButton.tsx` (L57–59) | role + label + `disabled` state | none material |
| `app/meal-plan/index.tsx` (L149–224) | templates/add/prev-week/next-week/close all role+label | add hints where non-obvious |

---

## 6. Contrast pass (computed from real tokens)

Ratios computed by converting each `oklch` token to linear sRGB → relative luminance → WCAG ratio.
AA threshold: 4.5:1 body, 3.0:1 large text / UI components.

### Light theme (`global.css` L50–82)

| Pairing | Foreground | Background | Ratio | Verdict |
|---|---|---|---|---|
| muted-foreground / background | `oklch(0.556 0 0)` L62 | `oklch(0.92 0 20)` L51 | **3.73:1** | **FAIL (body)**, pass (large/UI) |
| muted-foreground / card | `oklch(0.556 0 0)` L62 | `oklch(0.96 0 20)` L53 | **4.21:1** | Borderline — fails body (4.5) |
| card-foreground / card | `oklch(0.4 0 20)` L54 | `oklch(0.96 0 20)` L53 | 8.20:1 | Pass |
| foreground / background | `oklch(0.15 0 20)` L52 | `oklch(0.92 0 20)` L51 | 15.53:1 | Pass |

### Dark theme (`global.css` L85–104)

| Pairing | Foreground | Background | Ratio | Verdict |
|---|---|---|---|---|
| muted-foreground / background | `oklch(0.708 0 0)` L97 | `oklch(0.15 0 20)` L86 | 7.59:1 | Pass |
| muted-foreground / card | `oklch(0.708 0 0)` L97 | `oklch(0.2 0 20)` L88 | 6.98:1 | Pass |
| card-foreground / card | `oklch(0.76 0 20)` L89 | `oklch(0.2 0 20)` L88 | 8.43:1 | Pass |
| card-foreground / background | `oklch(0.76 0 20)` L89 | `oklch(0.15 0 20)` L86 | 9.16:1 | Pass |
| foreground / background | `oklch(0.96 0 20)` L87 | `oklch(0.15 0 20)` L86 | 17.51:1 | Pass |

**Correction to the issue draft:** the draft worried dark `muted-foreground` (`0.708`) and dark
`card-foreground` (`0.76`) might be low-contrast. They are not — both comfortably exceed AA on both
dark backgrounds. **The only real contrast failure is light-theme `muted-foreground` (row #6).** All
dark-theme foreground/background pairings pass.

---

## 7. Dynamic Type (systemic)

**0 of 254 files** reference `allowFontScaling` or `maxFontSizeMultiplier`. RN's `allowFontScaling`
defaults to `true`, so text does scale today — but nothing prevents a future regression, and
layout-critical text has no `maxFontSizeMultiplier` cap, so accessibility-XL fonts will overflow:
meal-plan calendar cells, grocery-map chrome, recipe step cards, and the camera action row. The fix
is centralized (rows #1, #2) plus a per-screen manual pass at XL sizes. **Risk:** uncapped Dynamic
Type *is itself* an a11y regression (truncation/overlap), so `maxFontSizeMultiplier` is required,
not optional, on tight layouts.

---

## 8. Live regions & dynamic content

Only `app/grocery-map/index.tsx` uses `accessibilityLiveRegion` (loading/error states — correct).
Missing elsewhere:

- **`Timer/TimerItem.tsx`** countdown + completion (row #8) — the most important omission.
- **Voice-cooking TTS transcript / current step prompt** — the spoken prompt has no on-screen
  live-region text equivalent (row #19).
- **MicButton** state transitions (listening → speaking) are not announced (row #10).

---

## 9. Focus order & modals (verification-only)

- `components/ui/modal.tsx`, `components/ui/dialog.tsx`, `components/Shared/SheetModalWrapper.tsx`,
  `components/MealPlanCalendar/TemplateSheet.tsx` all rely on native focus behavior; no explicit
  first-focus / focus-return is asserted. Verify with a real VoiceOver pass (row #14).
- RN's `Modal` handles focus trap on iOS natively, but Android/Sheet behavior is less guaranteed;
  log pass/fail per surface in the manual pass (Section 11).

---

## 10. Color-as-sole-state check

| Where | State conveyed by color | Also conveyed by |
|---|---|---|
| `GroceryListItem` isCovered | green text/icon | ✓ "✓ You have enough!" text + check icon — **OK** |
| `TimerItem` completed | `text-green-500` | ✗ nothing else — **fix (row #8)** |
| `IngredientItemCard` | background tint | ✓ text label — OK |
| `MealSlot` hover (drag) | primary-tint background | drag-only (no AT equivalent) — **fix (row #3)** |

---

## 11. Manual VoiceOver / TalkBack pass (to be logged by remediation PR)

Per the issue's acceptance criteria, the remediation PR must run a manual pass across the 10
highest-traffic screens and log pass/fail here. This audit provides the per-screen entry points and
predicted failures to target:

| Screen | Entry point | Predicted top failure |
|---|---|---|
| Pantry home | `app/index.tsx` → `PantryWrapper` | toolbar hints; `IngredientItemCard` missing checked state |
| Recipe detail | `app/recipes/[recipeId]/index.tsx` | verify header share/back labels |
| Recipe steps | `app/recipes/[recipeId]/steps.tsx` → `StepCard` | unlabeled press container; no TTS caption equivalent |
| Recipe edit | `app/recipes/[recipeId]/edit.tsx` | input `Label` pairing via `accessibilityLabelledBy` |
| Meal-plan calendar | `app/meal-plan/index.tsx` | **MealSlot / RecipeDraggable** fully unreachable |
| Grocery list | `app/grocery-list/` → `GroceryListItem` | verify selection-mode state announces |
| Grocery map | `app/grocery-map/index.tsx` | map marker labels; non-map fallback path |
| Camera create | camera flow → `CameraActionRow` | verify disabled-state announce when camera unavailable |
| Search | `app/(misc)/search.tsx` | filter sheet labels (mostly present) |
| Profile | `app/profile/index.tsx` | preference `Switch`/`Slider` labels (row #7) |

TalkBack (Android): repeat pantry home, recipe steps, grocery-list, grocery-map.

---

## 12. Phased remediation recommendation

To keep the remediation PR reviewable (the issue's stated scope-creep risk), ship in this order:

1. **Phase 1 — Primitives (rows #1, #2).** Centralized Dynamic Type; inherits everywhere.
2. **Phase 2 — True zero-coverage gesture controls (rows #3, #4).** Unblocks meal planning for AT.
3. **Phase 3 — Contrast + preference labels (rows #6, #7, #8).** Mechanical, high-visibility.
4. **Phase 4 — Extend existing controls (rows #9–#16).** Hints, states, decorative media, hints.
5. **Phase 5 — Regression guard + manual pass (rows #19, #20, §11).** Lock in the gains.

Each phase is independently mergeable and independently testable.

---

## 13. References

- WCAG 2.1 Success Criteria: [1.3.1](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships), [1.4.1 Use of Color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color), [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum), [1.4.4 Resize Text](https://www.w3.org/WAI/WCAG21/Understanding/resize-text), [2.1.1 Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard), [2.4.3 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order), [2.5.1 Pointer Gestures](https://www.w3.org/WAI/WCAG21/Understanding/pointer-gestures), [4.1.2 Name/Role/Value](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value), [4.1.3 Status Messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages)
- React Native Accessibility docs: `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, `accessibilityState`, `accessibilityActions`, `accessibilityLiveRegion`, `accessibilityValue`
- Apple HIG — Accessibility; App Store Review — 2.5.1 / accessibility baseline
