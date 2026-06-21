# Batch Refactor: Bundle Optimization, Deduplication & Type Safety

Date: 2026-05-23

## Summary

Six independent improvements targeting user-facing bugs (deep link mismatch, image cache), bundle size (skia lazy loading), developer experience (query/auth deduplication), and maintainability (debug split, `any` cleanup).

## Items

### 1. Deep Link Scheme Fix

**Problem:** `lib/constants.ts` defines `DEEP_LINK_SCHEME` as `"recipe-app"` but `app.json` defines `scheme` as `"cookkit"`. This mismatch breaks OAuth redirects and password reset links.

**Fix:** Change `lib/constants.ts:9` from `"recipe-app"` to `"cookkit"`. Grep for any other `recipe-app` references and fix.

**Effort:** 1 line.

### 2. Image Cache Improvements

**Problem:** `lib/image-cache.ts` only configures caching for iOS. Android (Glide) and Web (browser) get default behavior. Cache limits are conservative for a recipe app with high-res images.

**Fix:**
- Bump iOS defaults: disk 200MB → 500MB, memory 50MB → 100MB, count 100 → 200
- Update non-iOS log message to clarify that Glide/browser handle caching natively
- No structural changes, no config plugin

**Rationale:** Glide Android defaults (250MB disk, device-scaled memory) are already reasonable. Adding a config plugin for parity is unnecessary complexity.

**Effort:** ~5 lines.

### 3. Skia Lazy Loading (734KB bundle savings)

**Problem:** `@shopify/react-native-skia` is statically imported in `store/CreateIngredientContext.tsx` and three model hooks (`processImage.ts`, `classifyModel.tsx`, `segmentModel.tsx`). These are only needed during camera/image processing but load at app startup.

**Fix:**
- `hooks/model/processImage.ts`: change to `const { Skia } = await import("@shopify/react-native-skia")` inside exported functions
- `hooks/model/classifyModel.tsx`: same treatment for `Skia`, `ImageFormat`
- `hooks/model/segmentModel.tsx`: same treatment for `Skia`, `AlphaType`, `BlendMode`, `ColorType`, `TileMode`
- `store/CreateIngredientContext.tsx`: change static imports to dynamic `await import()` at usage sites
- Type imports (`SkImage`, `SkRect`) remain as `import type` — erased at compile time, no bundle impact

**Pattern:** Follows existing dynamic import pattern documented in CLAUDE.md (see `lib/function-gemma/`).

**Effort:** ~3 files, medium.

### 4. Pantry Query Cache Invalidation Deduplication

**Problem:** `hooks/queries/usePantryQueries.ts` has 5 mutation hooks that repeat the same pattern: achievement checking + 3× `invalidateQueries` calls (~10 lines each, ~50 lines total duplication).

**Fix:**
- Extract `invalidateAfterPantryChange(queryClient: QueryClient)` helper in the same file
- Helper does: `achievementService.checkAchievements()` (warn-only catch), then invalidates `pantryQueryKeys.all`, `recipeQueryKeys.recommendations()`, `recipeQueryKeys.available()`
- `useAddPantryItem`, `useAddPantryItems`, `useAddPantryItemsWithMetadata`: `onSuccess` becomes `() => invalidateAfterPantryChange(queryClient)`
- `useUpdatePantryItem`: call helper after its specific `setQueryData` and notification reschedule
- `useDeletePantryItem`: call helper after its specific `setQueryData` and notification cancel

**Effort:** 1 helper + 5 callers simplified.

### 5. AuthStore Deduplication

**Problem:** `auth/AuthStore.ts` (520 lines) has 7 auth methods that repeat: strategy check → set loading → clear error → call strategy → update state on success → set error on failure → clear loading. Each is ~30 lines with ~25 lines of boilerplate.

**Fix:**
- Add private `runWithStrategy` helper:
  ```ts
  async function runWithStrategy(
    get: Get<AuthStore>,
    errorCode: string,
    action: (strategy: AuthStrategy) => Promise<AuthResult>,
    errorLabel: string
  ): Promise<AuthResult>
  ```
- Helper handles: strategy null check, loading state, error clearing, try/catch with state updates, finally block
- Simplified methods (6): `signInWithEmail`, `signInWithProvider`, `signInAnonymously`, `signUpWithEmail`, `refreshSession`, `linkAnonymousAccount`
- Methods with unique control flow stay as-is: `signOut` (clears state even on failure), `resetPassword` (no user/session update), `initialize` (multi-step session restoration)

**Effort:** 1 helper + 5 methods simplified (~150 lines removed).

### 6. Debug.tsx Split

**Problem:** `app/(misc)/debug.tsx` is 725 lines with 6 collapsible sections handling unrelated concerns.

**Fix:** Split into focused sub-components under `app/(misc)/debug/`:

| File | Section | Lines (approx) |
|------|---------|-----------------|
| `debug/types.ts` | Shared types (`DebugRecipe`) | ~5 |
| `debug/SectionHeader.tsx` | Collapsible section header component | ~20 |
| `debug/DebugStats.tsx` | Database stats + meal plan display | ~50 |
| `debug/DebugInspection.tsx` | Stock/recipes/recommendations viewer | ~80 |
| `debug/DebugQuickActions.tsx` | Seed, sample data, health check, refresh | ~60 |
| `debug/DebugDataManagement.tsx` | Clear meal plan/recipes/all data | ~60 |
| `debug/DebugExport.tsx` | Print storage/ingredients/preferences/recipes | ~120 |
| `debug/DebugStorage.tsx` | Clear onboarding/preference/cooked keys | ~30 |

`debug.tsx` becomes a thin orchestrator: manages `expandedSections` state, renders `SectionHeader` + each component.

**Effort:** 8 new files, mechanical extraction.

### 7. `any` Type Cleanup

**Problem:** ~504 `any` occurrences across source files (excluding node_modules, worktrees, auto-claude). Top offenders:
1. `lib/function-gemma/FunctionGemmaService.ts` (23)
2. `data/api/householdApi.ts` (14)
3. `data/db/repositories/StockRepository.ts` (12)
4. `data/api/pantryApi.ts` (12)
5. `app/(misc)/debug.tsx` (partially fixed by item 6)

**Fix:**
- Target top 5 source files
- Replace `any` with proper types from existing type definitions, or create narrow interfaces where needed
- Do not change files where `any` comes from external library types we can't control

**Follow-up (not in this batch):** Add a `grep -c '\bany\b'` ratchet to CI that fails if count increases.

**Effort:** Top 5 files, careful typing.

## Implementation Order

| Priority | Item | Category | Est. Effort |
|----------|------|----------|-------------|
| 1 | Deep link scheme fix | User-facing bug | 1 line |
| 2 | Image cache bump | User-facing perf | ~5 lines |
| 3 | Skia lazy loading | Bundle optimization | ~3 files |
| 4 | Pantry query dedup | DX | 1 helper + 5 callers |
| 5 | AuthStore dedup | DX | 1 helper + 5 methods |
| 6 | Debug.tsx split | Maintainability | 8 files |
| 7 | `any` cleanup | Type safety | Top 5 files |

## Files Touched

### Tier 1 (User-facing)
- `lib/constants.ts` — deep link fix
- `lib/image-cache.ts` — cache bump
- `hooks/model/processImage.ts` — skia lazy load
- `hooks/model/classifyModel.tsx` — skia lazy load
- `hooks/model/segmentModel.tsx` — skia lazy load
- `store/CreateIngredientContext.tsx` — dynamic imports

### Tier 2 (DX)
- `hooks/queries/usePantryQueries.ts` — invalidation helper
- `auth/AuthStore.ts` — runWithStrategy helper

### Tier 3 (Maintainability)
- `app/(misc)/debug.tsx` — split into sub-components
- `app/(misc)/debug/*.tsx` — new sub-component files
- `lib/function-gemma/FunctionGemmaService.ts` — type cleanup
- `data/api/householdApi.ts` — type cleanup
- `data/db/repositories/StockRepository.ts` — type cleanup
- `data/api/pantryApi.ts` — type cleanup
