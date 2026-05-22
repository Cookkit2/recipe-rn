# Expo SDK 56 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade from Expo SDK 55 to 56, replacing `@gorhom/bottom-sheet` with the Expo UI native drop-in.

**Architecture:** `@expo/ui/community/bottom-sheet` provides an API-compatible replacement backed by SwiftUI (iOS) and Jetpack Compose (Android). Import changes only — no component restructuring needed.

**Tech Stack:** Expo SDK 56, `@expo/ui@^56.0.12`, TypeScript 6.0.3, React Native 0.85

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Bump expo, add `@expo/ui`, remove `@gorhom/bottom-sheet`, `@expo/vector-icons`, `@react-navigation/native` |
| `app/grocery-map/index.tsx` | Modify | Swap bottom-sheet import, update ref type |
| `app/(misc)/search.tsx` | Modify | Swap bottom-sheet import, update ref type |
| `components/Camera/CameraOnboardingSheet.tsx` | Modify | Swap bottom-sheet import, update ref type |
| `components/Recipe/Edit/VersionHistorySheet.tsx` | Modify | Swap bottom-sheet import, update ref type |

---

### Task 1: Core SDK Upgrade

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Run Expo install with --fix**

```bash
npx expo install expo@^56.0.0 --fix
```

This bumps all `expo-*` packages, TypeScript (to 6.0.3), and compatible third-party deps.

- [ ] **Step 2: Install dependencies**

```bash
bun install
```

- [ ] **Step 3: Run typecheck to find breaking changes**

```bash
bun run typecheck
```

Expected: May fail on `expo-file-system` async `copy()`/`move()` if used. Our codebase doesn't use these methods directly, so this should pass or fail only on import path issues.

- [ ] **Step 4: Fix any typecheck errors**

Address each error individually. The main SDK 56 breaking changes are:
- `expo-file-system`: `copy()`/`move()` are now async (returns Promise) — not used in our codebase
- `expo/fetch` is now the default `globalThis.fetch` — no action needed
- Hermes bytecode diffing enabled by default — no action needed

- [ ] **Step 5: Run lint**

```bash
bun run lint
```

- [ ] **Step 6: Delete native dirs and regenerate via CNG**

```bash
rm -rf ios android
npx expo prebuild
```

- [ ] **Step 7: Run expo-doctor**

```bash
npx expo-doctor@latest
```

Expected: All checks pass. If issues, follow the suggestions.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Expo SDK 56

- Bump expo and all expo-* packages to SDK 56 compatible versions
- TypeScript 6.0.3
- iOS deployment target 16.4
- Regenerate native dirs via CNG

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: React Navigation Codemod

**Files:**
- Modify: `package.json` (remove `@react-navigation/native`)

- [ ] **Step 1: Run the codemod**

```bash
npx expo-codemod sdk-56-expo-router-react-navigation-replace .
```

Expected: "No changes" or similar — our codebase has no direct `@react-navigation/*` imports.

- [ ] **Step 2: Remove @react-navigation/native from package.json**

```bash
bun remove @react-navigation/native
```

If bun refuses (transitive dep needed), skip this step — it will be managed transitively.

- [ ] **Step 3: Verify typecheck still passes**

```bash
bun run typecheck
```

- [ ] **Step 4: Commit (only if changes were made)**

Only commit if the codemod or removal produced changes:

```bash
git add -A
git commit -m "chore: apply React Navigation fork codemod for SDK 56

- Run sdk-56-expo-router-react-navigation-replace codemod
- Remove @react-navigation/native from explicit dependencies

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Install @expo/ui

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @expo/ui**

```bash
npx expo install @expo/ui
```

This uses `npx expo install` to pick the SDK 56 compatible version. All peer deps (`react-native-reanimated`, `react-native-worklets`) are already installed.

- [ ] **Step 2: Verify installation**

```bash
bun run typecheck
```

Expected: Passes — `@expo/ui` is installed but not yet imported anywhere.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: install @expo/ui for bottom-sheet migration

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Migrate `app/grocery-map/index.tsx`

**Files:**
- Modify: `app/grocery-map/index.tsx`

- [ ] **Step 1: Update import**

Change line 4 from:
```tsx
import BottomSheet from "@gorhom/bottom-sheet";
```
To:
```tsx
import BottomSheet from "@expo/ui/community/bottom-sheet";
```

- [ ] **Step 2: Update ref type**

Change line 35 from:
```tsx
const bottomSheetRef = useRef<BottomSheet>(null);
```
To:
```tsx
import type { BottomSheetMethods } from "@expo/ui/community/bottom-sheet";
```
And the ref:
```tsx
const bottomSheetRef = useRef<BottomSheetMethods>(null);
```

The combined import block becomes:
```tsx
import BottomSheet, { type BottomSheetMethods } from "@expo/ui/community/bottom-sheet";
```
And the ref stays visually the same but uses the imported type:
```tsx
const bottomSheetRef = useRef<BottomSheetMethods>(null);
```

- [ ] **Step 3: Verify no prop changes needed**

This file uses:
- `snapPoints={["10%", "25%", "50%"]}` — supported (note: on Android, only 2 states effective, but iOS/web work with all 3)
- `index={1}` — supported
- `onChange={handleSheetChange}` — supported
- `ref={bottomSheetRef}` — supported with `BottomSheetMethods` type
- `bottomSheetRef.current?.snapToIndex(SNAP_EXPANDED)` — supported

No prop changes needed.

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add app/grocery-map/index.tsx
git commit -m "refactor: migrate grocery map bottom sheet to @expo/ui

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Migrate `app/(misc)/search.tsx`

**Files:**
- Modify: `app/(misc)/search.tsx`

- [ ] **Step 1: Update import**

Change line 3 from:
```tsx
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
```
To:
```tsx
import BottomSheet, { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
```

- [ ] **Step 2: Update ref type**

Change line 39 from:
```tsx
const filterSheetRef = useRef<BottomSheet>(null);
```

Add type import (can be combined with the existing import):
```tsx
import BottomSheet, { BottomSheetScrollView, type BottomSheetMethods } from "@expo/ui/community/bottom-sheet";
```

And update the ref:
```tsx
const filterSheetRef = useRef<BottomSheetMethods>(null);
```

- [ ] **Step 3: Verify no prop changes needed**

This file uses:
- `index={-1}` — supported (starts closed)
- `snapPoints={filterSnapPoints}` where `filterSnapPoints = useMemo(() => ["55%"], [])` — supported
- `enablePanDownToClose` — supported
- `backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.card }]}` — supported (only `backgroundColor` applies on native, `borderTopLeftRadius`/`borderTopRightRadius` have no effect — native handles its own corners)
- `handleIndicatorStyle={styles.handleIndicator}` — accepted for compatibility, has no effect on native (native controls handle styling)
- `onChange` not used — uses `filterSheetRef.current?.expand()` / `.close()` instead — both supported
- `BottomSheetScrollView` — supported (re-export of RN `ScrollView`)

No functional changes needed. `borderTopLeftRadius`/`borderTopRightRadius` in `sheetBackground` style and `width`/`height` in `handleIndicator` style will have no effect on native — this is acceptable since native handles sheet chrome automatically.

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add "app/(misc)/search.tsx"
git commit -m "refactor: migrate search filter bottom sheet to @expo/ui

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Migrate `components/Camera/CameraOnboardingSheet.tsx`

**Files:**
- Modify: `components/Camera/CameraOnboardingSheet.tsx`

- [ ] **Step 1: Update import**

Change line 3 from:
```tsx
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
```
To:
```tsx
import BottomSheet, { BottomSheetView } from "@expo/ui/community/bottom-sheet";
```

- [ ] **Step 2: Update ref type**

Change line 35 from:
```tsx
const bottomSheetRef = useRef<BottomSheet>(null);
```

Add type import (combined):
```tsx
import BottomSheet, { BottomSheetView, type BottomSheetMethods } from "@expo/ui/community/bottom-sheet";
```

And update the ref:
```tsx
const bottomSheetRef = useRef<BottomSheetMethods>(null);
```

- [ ] **Step 3: Verify no prop changes needed**

This file uses:
- `index={isOnboardingComplete ? -1 : 0}` — supported (dynamic index)
- `snapPoints={["85%"]}` — supported
- `onChange={handleSheetChanges}` — supported
- `enablePanDownToClose` — supported
- `backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.card }]}` — same pattern as search.tsx
- `handleIndicatorStyle={styles.handleIndicator}` — same pattern as search.tsx
- `bottomSheetRef.current?.expand()` / `.close()` — both supported
- `BottomSheetView` — supported

No functional changes needed.

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/Camera/CameraOnboardingSheet.tsx
git commit -m "refactor: migrate camera onboarding bottom sheet to @expo/ui

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Migrate `components/Recipe/Edit/VersionHistorySheet.tsx`

**Files:**
- Modify: `components/Recipe/Edit/VersionHistorySheet.tsx`

- [ ] **Step 1: Update import**

Change line 3 from:
```tsx
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
```
To:
```tsx
import BottomSheet, { BottomSheetView } from "@expo/ui/community/bottom-sheet";
```

- [ ] **Step 2: Update ref type**

Change line 26 from:
```tsx
const bottomSheetRef = useRef<BottomSheet>(null);
```

Add type import (combined):
```tsx
import BottomSheet, { BottomSheetView, type BottomSheetMethods } from "@expo/ui/community/bottom-sheet";
```

And update the ref:
```tsx
const bottomSheetRef = useRef<BottomSheetMethods>(null);
```

- [ ] **Step 3: Verify no prop changes needed**

This file uses:
- `index={0}` — supported (starts open at first snap point)
- `snapPoints={["70%"]}` — supported
- `onChange={handleSheetChanges}` — supported
- `enablePanDownToClose` — supported
- `backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.card }]}` — same pattern
- `handleIndicatorStyle={styles.handleIndicator}` — same pattern
- `bottomSheetRef.current?.close()` — supported
- `BottomSheetView` — supported

No functional changes needed.

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/Recipe/Edit/VersionHistorySheet.tsx
git commit -m "refactor: migrate version history bottom sheet to @expo/ui

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Remove Deprecated Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove @gorhom/bottom-sheet**

```bash
bun remove @gorhom/bottom-sheet
```

- [ ] **Step 2: Remove @expo/vector-icons**

```bash
bun remove @expo/vector-icons
```

If bun refuses (transitive dep needed by another package), skip this step.

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck
```

- [ ] **Step 4: Run lint**

```bash
bun run lint
```

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: remove @gorhom/bottom-sheet and @expo/vector-icons

Both replaced: bottom-sheet by @expo/ui, vector-icons unused.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Final Validation

- [ ] **Step 1: Run expo-doctor**

```bash
npx expo-doctor@latest
```

Expected: All checks pass.

- [ ] **Step 2: Run full typecheck and lint**

```bash
bun run typecheck && bun run lint
```

- [ ] **Step 3: Run test suite**

```bash
bun test
```

- [ ] **Step 4: Smoke test the dev server**

```bash
bun run dev
```

Launch iOS simulator and manually verify:
1. **Grocery map** — bottom sheet snaps between compact/expanded, store selection works
2. **Search** — filter bottom sheet opens/closes, scroll works inside sheet
3. **Camera onboarding** — bottom sheet with video opens/closes on first launch
4. **Version history** — bottom sheet opens with version list, revert works
