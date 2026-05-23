# Expo SDK 55 → 56 Upgrade (Aggressive Modernization)

**Date:** 2026-05-23
**Approach:** B — Standard SDK upgrade + migrate `@gorhom/bottom-sheet` to Expo UI drop-in replacement

## Section 1: Core SDK Upgrade

- Run `npx expo install expo@^56.0.0 --fix` to bump all `expo-*` packages and compatible dependencies
- TypeScript 6.0.3 auto-bumped by the install command
- iOS deployment target bumps to 16.4 (from 15.1)
- Minimum Xcode 26.4
- Delete `ios/` and `android/` dirs, regenerate via CNG (`npx expo prebuild`)
- Run `npx expo-doctor@latest` for dependency validation
- Verify with `bun run typecheck && bun run lint`

**Key SDK 56 changes:**
- React Native 0.85 + React 19.2 (already on these — no-op)
- Hermes bytecode diffing enabled by default
- `expo/fetch` as default `globalThis.fetch`
- Async `copy()`/`move()` in expo-file-system (breaking change)

## Section 2: React Navigation Fork Codemod

Expo SDK 56 forks React Navigation internals into `expo-router`, making direct `@react-navigation/*` imports incompatible.

- No source files import from `@react-navigation/*` directly — `@react-navigation/native ^7.0.0` is a transitive dependency only
- Run `npx expo-codemod sdk-56-expo-router-react-navigation-replace .` (expected no-op)
- Remove `@react-navigation/native` from `package.json` dependencies if possible
- Verify `bun run typecheck` passes

## Section 3: `@gorhom/bottom-sheet` → Expo UI Migration

Expo UI ships production-ready bottom sheets backed by native platform UI (SwiftUI/Jetpack Compose) instead of JavaScript-animated views.

**Files affected (4):**

| File | Imports Used | Key Patterns |
|------|-------------|--------------|
| `app/grocery-map/index.tsx` | `BottomSheet` | `snapToIndex()`, `snapPoints`, `onChange` |
| `app/(misc)/search.tsx` | `BottomSheet`, `BottomSheetScrollView` | `expand()`, `close()`, `snapPoints`, Portal |
| `components/Camera/CameraOnboardingSheet.tsx` | `BottomSheet`, `BottomSheetView` | `expand()`, `close()`, imperative ref, Portal |
| `components/Recipe/Edit/VersionHistorySheet.tsx` | `BottomSheet`, `BottomSheetView` | `close()`, imperative ref, Portal |

**Migration steps:**
1. Install Expo UI bottom-sheet package
2. Change imports from `@gorhom/bottom-sheet` to Expo UI drop-in
3. `BottomSheetView` and `BottomSheetScrollView` follow the same replacement
4. Props (`snapPoints`, `enablePanDownToClose`, `backgroundStyle`, `handleIndicatorStyle`, `onChange`) should carry over
5. Imperative ref methods (`.expand()`, `.close()`, `.snapToIndex()`) expected to work identically
6. Verify exact API surface from TypeScript definitions before migrating each file

**Uncertainty:** Exact import path and unsupported props need verification from package TypeScript definitions during implementation, as docs were inaccessible during design.

## Section 4: Dependency Cleanup

- Remove `@expo/vector-icons` from `package.json` — zero direct imports in project (transitive dependency if needed)
- Remove `@gorhom/bottom-sheet` from `package.json` — after migration verified
- Both removals happen after their respective migrations pass typecheck

## Section 5: Validation & Testing

**After each section:**
- `bun run typecheck` — catch type errors from API changes
- `bun run lint` — catch formatting/import issues

**Full validation after all sections:**
1. `npx expo-doctor@latest` — verify dependency compatibility
2. `bun run typecheck && bun run lint` — final pass
3. `bun run dev` — smoke test app startup
4. Manual verification of bottom sheets on iOS simulator:
   - Grocery map sheet (snap between compact/expanded)
   - Search filter sheet (expand/close)
   - Camera onboarding sheet (expand/close with video playback)
   - Version history sheet (expand/close with revert action)
5. `bun test` — existing test suite
