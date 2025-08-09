## Background and Motivation
Recipes screen crashes when opening the Tinder-style carousel. Need to identify root cause and apply a minimal, safe fix.

## Key Challenges and Analysis
- React Native 0.79 introduces stricter prop validation; using unsupported props (e.g., `id`) on native components may crash.
- `getImages` had an off-by-one slice that could produce unexpected lengths; while unlikely to crash, it can cause inconsistent carousel behavior.

## High-Level Task Breakdown
1. Inspect `components/Recipe/Tinder.tsx` and related helpers for unsafe props and data issues.
2. Replace unsupported `id` on `View` with a safe alternative (`testID` or `nativeID`).
3. Correct `getImages` to return exactly the requested length deterministically.
4. Run lints and ensure no new errors are introduced.
5. Verify runtime on the Recipes screen.

## Success Criteria
- Opening `app/recipes.tsx` no longer crashes.
- Carousel renders images and responds to gestures without errors.
- No new linter errors introduced by changes.

## Project Status Board
- [x] Inspect Tinder component and helpers
- [x] Replace unsupported `id` prop on `View`
- [x] Fix `getImages` off-by-one behavior
- [x] Run lints on modified files
- [ ] Verify runtime on device/simulator

## Current Status / Progress Tracking
- Implemented edits in `components/Recipe/Tinder.tsx` (`id` -> `testID`).
- Implemented deterministic `getImages` that returns exact length.
- Lints show only warnings; no errors.

## Executor Feedback or Help Requests
- Ready for you to re-run the app and confirm the crash is resolved. If it persists, please share the error stack trace so we can dig deeper (e.g., `expo start -c` logs or native crash log). We can also swap `testID` to `nativeID` if you require a platform identifier.

## Lessons Learned
- Avoid using unsupported props like `id` on RN primitives; use `testID` for testing or `nativeID` for native lookup.
- Utility functions returning collection slices should be deterministic and exact-length to avoid subtle UI issues.
## Background and Motivation

We want the recipe screen UI to match the desired layout: a horizontally swipeable recipe images carousel at the top, with the currently selected recipe title shown at the bottom. This replaces the existing list of stacked recipe cards.

## Key Challenges and Analysis

- Detecting the active item in a horizontal carousel reliably across platforms
- Smooth snapping behavior and sensible card sizing for different screen widths
- Keeping implementation lightweight without adding new heavy dependencies

## High-Level Task Breakdown

1. Create a reusable `components/Recipe/RecipeCarousel.tsx` with a horizontally snapping `FlatList` that renders recipe images as rounded cards. Expose `onIndexChange`.
2. Replace the stacked cards in `app/recipes.tsx` with the new carousel. Track active index in state and display the active recipe title at the bottom.
3. Add a subtle bottom gradient behind the title for readability and polish spacing/typography.
4. Add animated scaling/parallax of cards during scroll for delight (optional, post-MVP).
5. Hook up tapping a card to navigate to the recipe details (optional).

### Success Criteria

- Top area shows a swipeable carousel of recipe images using data from `dummyRecipesData`.
- Swiping updates the active index and the bottom title updates accordingly.
- Layout is responsive and feels native on iOS/Android.

## Project Status Board

- [x] Define plan and tasks
- [x] Implement carousel component and integrate on recipe screen (MVP)
- [ ] Add bottom gradient and polish styles
- [ ] Add animations (scale/parallax) during scroll
- [ ] Add navigation on card press

## Current Status / Progress Tracking

- Implemented Step 1: Created `RecipeCarousel.tsx`, integrated it into `app/recipes.tsx`, and now the screen shows a top carousel with images and the current recipe title at the bottom.

## Executor Feedback or Help Requests

- Confirm if the title should be overlaid on top of the background (bottom of the screen) or inside each card. Currently placed at the bottom of the screen as requested.
- Provide any specific visual references for spacing, gradient strength, and typography to match exactly.

## Lessons Learned

- Keep carousel item width as a fraction of screen width and use `snapToInterval` for smooth snapping without extra libraries.

## Background and Motivation

We want to reproduce the Warp Overlay animation inspired by the Motion.dev example and display it once when the `recipes` page is presented. Reference: [Warp overlay example](https://examples.motion.dev/react/warp-overlay).

## Key Challenges and Analysis

- Matching the warp aesthetic in React Native: use `react-native-reanimated` transforms and an `SVG` grid (`react-native-svg`).
- Performance: ensure the overlay is lightweight and self-disposes once the animation completes.
- Layering: use the existing `OverlayProvider` so the effect sits above the page without altering routing.
- Triggering once: show on first mount of `recipes` only, then remove automatically.

## High-Level Task Breakdown

1. Create `WarpOverlay` component with:
   - Full-screen grid (SVG lines) and subtle background tint.
   - Animated perspective tilt, scale, and vertical offset easing to flat.
   - Brief flash pulse to sell the warp effect.
   - Auto-callback to remove itself on completion.
2. Integrate with overlay system on `recipes` first mount (guard with ref).
3. Visual polish pass to better match the reference (grid density, easing curve, timing, flash intensity, theme-aware colors).
4. Validation: ensure no regressions and lint/tests are green.

## Success Criteria

- On navigating to `recipes`, a warp overlay appears for ~0.9s and fades away.
- The effect layers over content without blocking subsequent interactions.
- No runtime or lint errors; animation is performant on device.

## Project Status Board

- [x] Create `WarpOverlay` with grid, transforms, fade-out, and flash.
- [x] Hook into `recipes` mount via `OverlayProvider` and auto-remove on complete.
- [ ] Visual polish to better match the reference timing and curves.
- [ ] User validation of look-and-feel.

## Current Status / Progress Tracking

- Implemented steps 1 and 2. The overlay displays once on `recipes` mount and self-removes.
- Lint checks for modified files are passing.

## Executor Feedback or Help Requests

- Please confirm if the current warp intensity, duration (~900ms), and grid density feel right. If not, specify preferred timing and visual adjustments.

## Lessons Learned

- Central overlay management simplifies ephemeral effects that must sit outside normal navigation stacks.

