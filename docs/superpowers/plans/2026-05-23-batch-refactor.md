# Batch Refactor: Bundle Optimization, Deduplication & Type Safety

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix deep link mismatch, bump image cache limits, defer Skia loading (734KB), extract duplicated cache invalidation and auth boilerplate, split debug.tsx, and clean up `any` types in top 5 files.

**Architecture:** Seven independent refactoring tasks, ordered by user impact. Each task is self-contained and can be committed independently. No new dependencies introduced.

**Tech Stack:** React Native (Expo SDK 55), TanStack Query, Zustand, WatermelonDB, TypeScript strict mode

---

## File Structure

### Tier 1: User-facing fixes

| File | Action | Purpose |
|------|--------|---------|
| `lib/constants.ts` | Modify | Fix deep link scheme from `recipe-app` to `cookkit` |
| `lib/__tests__/constants.test.ts` | Modify | Update test expectation to match new scheme |
| `auth/SupabaseAuthStrategy.ts` | Modify | Remove stale `recipe-app` from allowed schemes |
| `lib/image-cache.ts` | Modify | Bump iOS cache limits |

### Tier 2: Bundle optimization

| File | Action | Purpose |
|------|--------|---------|
| `store/CreateIngredientContext.tsx` | Modify | Replace static skia-dependent imports with dynamic imports |

### Tier 3: DX deduplication

| File | Action | Purpose |
|------|--------|---------|
| `hooks/queries/usePantryQueries.ts` | Modify | Extract shared invalidation helper |
| `auth/AuthStore.ts` | Modify | Extract `runWithStrategy` helper |

### Tier 4: Maintainability

| File | Action | Purpose |
|------|--------|---------|
| `app/(misc)/debug/types.ts` | Create | Shared types (`DebugRecipe`) |
| `app/(misc)/debug/SectionHeader.tsx` | Create | Collapsible section header |
| `app/(misc)/debug/DebugStats.tsx` | Create | Stats section |
| `app/(misc)/debug/DebugInspection.tsx` | Create | Inspection section |
| `app/(misc)/debug/DebugQuickActions.tsx` | Create | Quick actions section |
| `app/(misc)/debug/DebugDataManagement.tsx` | Create | Data management section |
| `app/(misc)/debug/DebugExport.tsx` | Create | Export & logging section |
| `app/(misc)/debug/DebugStorage.tsx` | Create | Storage reset section |
| `app/(misc)/debug.tsx` | Modify | Thin orchestrator importing sub-components |

### Tier 5: Type safety

| File | Action | Purpose |
|------|--------|---------|
| `data/api/householdApi.ts` | Modify | Replace `any` with typed WatermelonDB model casts |
| `data/api/pantryApi.ts` | Modify | Replace `any` with proper types |
| `data/db/repositories/StockRepository.ts` | Modify | Replace `any` with proper types |

---

## Task 1: Fix Deep Link Scheme Mismatch

**Files:**
- Modify: `lib/constants.ts:9`
- Modify: `lib/__tests__/constants.test.ts:26`
- Modify: `auth/SupabaseAuthStrategy.ts:28`

- [ ] **Step 1: Update the constant**

In `lib/constants.ts`, change line 9 from `"recipe-app"` to `"cookkit"`:

```ts
DEEP_LINK_SCHEME: "cookkit",
```

- [ ] **Step 2: Update the test expectation**

In `lib/__tests__/constants.test.ts`, change line 26:

```ts
expect(APP_CONFIG.DEEP_LINK_SCHEME).toBe("cookkit");
```

- [ ] **Step 3: Remove stale scheme from auth strategy**

In `auth/SupabaseAuthStrategy.ts`, remove `"recipe-app"` from line 28:

```ts
private readonly ALLOWED_SCHEMES = ["cookkit", "exp", "https"];
```

- [ ] **Step 4: Run typecheck and tests**

Run: `bun run typecheck && bun run test -- lib/__tests__/constants.test.ts`
Expected: PASS, no type errors

- [ ] **Step 5: Commit**

```bash
git add lib/constants.ts lib/__tests__/constants.test.ts auth/SupabaseAuthStrategy.ts
git commit -m "fix: correct deep link scheme from 'recipe-app' to 'cookkit' to match app.json"
```

---

## Task 2: Bump Image Cache Limits

**Files:**
- Modify: `lib/image-cache.ts`

- [ ] **Step 1: Update cache constants**

In `lib/image-cache.ts`, update lines 6-8:

```ts
const DEFAULT_MAX_DISK_SIZE = 500 * 1024 * 1024; // 500 MB
const DEFAULT_MAX_MEMORY_COST = 100 * 1024 * 1024; // 100 MB
const DEFAULT_MAX_MEMORY_COUNT = 200;
```

- [ ] **Step 2: Update the non-iOS log message**

In `lib/image-cache.ts`, update lines 22-24 to clarify native caching:

```ts
if (__DEV__) {
  log.info("[image-cache] iOS-only configureCache skipped on " + Platform.OS + "; native cache (Glide/Browser) handles this");
}
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/image-cache.ts
git commit -m "perf: increase iOS image cache limits (500MB disk, 100MB memory, 200 count)"
```

---

## Task 3: Defer Skia Loading via Dynamic Imports

**Context:** `store/CreateIngredientContext.tsx` statically imports from three model files that import `@shopify/react-native-skia` (734KB). These model files are only needed when the user takes a photo. By changing the static imports to dynamic `await import()`, Skia is deferred until first camera use. The model files themselves keep their static Skia imports (needed for worklet functions).

**Files:**
- Modify: `store/CreateIngredientContext.tsx`

- [ ] **Step 1: Remove static model imports**

In `store/CreateIngredientContext.tsx`, remove lines 5-10 (the static imports of model functions):

```ts
// REMOVE these lines:
import { classifyStaticImage } from "~/hooks/model/classifyModel";
import { loadImageIntoSkia } from "~/hooks/model/processImage";
import {
  segmentStaticImage,
  trimTransparentBordersAndResizeImage,
} from "~/hooks/model/segmentModel";
```

- [ ] **Step 2: Add dynamic imports in `processItem`**

In `store/CreateIngredientContext.tsx`, inside the `processItem` callback, add the dynamic imports at the top of the try block (after `const pipelineStart = performance.now();` and before `try {`), replacing the direct calls:

```ts
const processItem = useCallback(
  async (itemId: string, imagePath: string, itemFramePosition: { x: number; y: number }) => {
    const pipelineStart = performance.now();

    try {
      // Lazy-load skia-dependent modules (734KB deferred until camera use)
      const [{ loadImageIntoSkia }, { segmentStaticImage, trimTransparentBordersAndResizeImage }, { classifyStaticImage }] =
        await Promise.all([
          import("~/hooks/model/processImage"),
          import("~/hooks/model/segmentModel"),
          import("~/hooks/model/classifyModel"),
        ]);

      const skImage = await loadImageIntoSkia(imagePath);
      // ... rest of the function unchanged
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add store/CreateIngredientContext.tsx
git commit -m "perf: defer react-native-skia loading (734KB) until camera use via dynamic imports"
```

---

## Task 4: Extract Pantry Cache Invalidation Helper

**Files:**
- Modify: `hooks/queries/usePantryQueries.ts`

- [ ] **Step 1: Add the helper function**

In `hooks/queries/usePantryQueries.ts`, add this helper after the imports (before the first hook, around line 10):

```ts
async function invalidateAfterPantryChange(queryClient: ReturnType<typeof useQueryClient>) {
  try {
    await achievementService.checkAchievements();
  } catch (error) {
    log.warn("Failed to check achievements after pantry change:", error);
  }

  queryClient.invalidateQueries({ queryKey: pantryQueryKeys.all });
  queryClient.invalidateQueries({ queryKey: recipeQueryKeys.recommendations() });
  queryClient.invalidateQueries({ queryKey: recipeQueryKeys.available() });
}
```

- [ ] **Step 2: Simplify `useAddPantryItem`**

Replace the `onSuccess` block (lines 107-128) with:

```ts
onSuccess: () => invalidateAfterPantryChange(queryClient),
```

- [ ] **Step 3: Simplify `useAddPantryItems`**

Replace the `onSuccess` block (lines 148-169) with:

```ts
onSuccess: () => invalidateAfterPantryChange(queryClient),
```

- [ ] **Step 4: Simplify `useAddPantryItemsWithMetadata`**

Replace the `onSuccess` block (lines 191-212) with:

```ts
onSuccess: () => invalidateAfterPantryChange(queryClient),
```

- [ ] **Step 5: Simplify `useUpdatePantryItem`**

Replace the achievement check + invalidation block (lines 244-269) in the `onSuccess` with:

```ts
onSuccess: async (updatedItem) => {
  try {
    await rescheduleExpiryNotification(updatedItem);
  } catch {
    // Non-critical
  }

  queryClient.setQueryData<PantryItem[]>(pantryQueryKeys.items(), (oldData) => {
    if (!oldData) return oldData;
    return oldData.map((item) => (item.id === updatedItem.id ? updatedItem : item));
  });

  queryClient.invalidateQueries({ queryKey: pantryQueryKeys.expiring() });
  await invalidateAfterPantryChange(queryClient);
},
```

Note: `invalidateAfterPantryChange` already handles `recipeQueryKeys.recommendations()` and `recipeQueryKeys.available()`, so the explicit calls are removed.

- [ ] **Step 6: Simplify `useDeletePantryItem`**

Replace the invalidation block (lines 307-317) in the `onSuccess` with:

```ts
onSuccess: async (_, deletedId) => {
  try {
    await cancelExpiryNotification(deletedId);
  } catch {
    // Non-critical
  }

  queryClient.setQueryData<PantryItem[]>(pantryQueryKeys.items(), (oldData) => {
    if (!oldData) return oldData;
    return oldData.filter((item) => item.id !== deletedId);
  });

  queryClient.invalidateQueries({ queryKey: pantryQueryKeys.expiring() });
  await invalidateAfterPantryChange(queryClient);
},
```

- [ ] **Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add hooks/queries/usePantryQueries.ts
git commit -m "refactor: extract shared pantry invalidation helper to reduce duplication"
```

---

## Task 5: Extract AuthStore `runWithStrategy` Helper

**Files:**
- Modify: `auth/AuthStore.ts`

- [ ] **Step 1: Add the `runWithStrategy` helper**

In `auth/AuthStore.ts`, add this type and function before the `useAuthStore` definition (after the `AuthStore` interface, around line 48):

```ts
type GetState = typeof useAuthStore extends create.Store<infer T> ? () => T : never;

async function runWithStrategy(
  get: GetState,
  errorCode: string,
  action: (strategy: AuthStrategy) => Promise<AuthResult>,
  errorLabel: string
): Promise<AuthResult> {
  const { strategy } = get();
  if (!strategy) {
    const error = "No authentication strategy configured";
    get()._setError(error);
    return { success: false, error: { code: "NO_STRATEGY", message: error, retryable: false } };
  }

  get()._setLoading(true);
  get()._setError(null);
  get()._setAuthState("loading");

  try {
    const result = await action(strategy);

    if (result.success && result.user) {
      get()._setUser(result.user);
      get()._setSession(result.session || null);
      get()._setAuthState("authenticated");
    } else {
      get()._setAuthState("error");
      get()._setError(result.error?.message || errorLabel);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    get()._setAuthState("error");
    get()._setError(errorMessage);
    return { success: false, error: { code: errorCode, message: errorMessage, retryable: true } };
  } finally {
    get()._setLoading(false);
  }
}
```

Note: Since `GetState` depends on the store type which hasn't been defined yet, use a simpler approach — type `get` as `() => AuthStore`:

```ts
async function runWithStrategy(
  get: () => AuthStore,
  errorCode: string,
  action: (strategy: AuthStrategy) => Promise<AuthResult>,
  errorLabel: string
): Promise<AuthResult> {
  const { strategy } = get();
  if (!strategy) {
    const error = "No authentication strategy configured";
    get()._setError(error);
    return { success: false, error: { code: "NO_STRATEGY", message: error, retryable: false } };
  }

  get()._setLoading(true);
  get()._setError(null);
  get()._setAuthState("loading");

  try {
    const result = await action(strategy);

    if (result.success && result.user) {
      get()._setUser(result.user);
      get()._setSession(result.session || null);
      get()._setAuthState("authenticated");
    } else {
      get()._setAuthState("error");
      get()._setError(result.error?.message || errorLabel);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    get()._setAuthState("error");
    get()._setError(errorMessage);
    return { success: false, error: { code: errorCode, message: errorMessage, retryable: true } };
  } finally {
    get()._setLoading(false);
  }
}
```

- [ ] **Step 2: Simplify `signInWithEmail`**

Replace the entire method body (lines 73-112) with:

```ts
signInWithEmail: async (credentials: SignInCredentials) => {
  return runWithStrategy(get, "SIGNIN_ERROR", (s) => s.signInWithEmail(credentials), "Sign in failed");
},
```

- [ ] **Step 3: Simplify `signInWithProvider`**

Replace the method body (lines 115-157) with:

```ts
signInWithProvider: async (config: SocialAuthConfig) => {
  return runWithStrategy(get, "SOCIAL_SIGNIN_ERROR", (s) => s.signInWithProvider(config), "Social sign in failed");
},
```

- [ ] **Step 4: Simplify `signInAnonymously`**

Replace the method body (lines 161-203) with:

```ts
signInAnonymously: async () => {
  return runWithStrategy(get, "ANONYMOUS_SIGNIN_ERROR", (s) => s.signInAnonymously(), "Anonymous sign in failed");
},
```

- [ ] **Step 5: Simplify `signUpWithEmail`**

Replace the method body (lines 207-245) with:

```ts
signUpWithEmail: async (credentials: SignInCredentials) => {
  return runWithStrategy(get, "SIGNUP_ERROR", (s) => s.signUpWithEmail(credentials), "Sign up failed");
},
```

- [ ] **Step 6: Simplify `refreshSession`**

Replace the method body (lines 297-338) with:

```ts
refreshSession: async () => {
  return runWithStrategy(get, "REFRESH_ERROR", (s) => s.refreshSession(), "Session refresh failed");
},
```

- [ ] **Step 7: Simplify `linkAnonymousAccount`**

Replace the method body (lines 342-383) with:

```ts
linkAnonymousAccount: async (credentials: LinkAccountCredentials) => {
  return runWithStrategy(get, "LINK_ACCOUNT_ERROR", (s) => s.linkAnonymousAccount(credentials), "Account linking failed");
},
```

- [ ] **Step 8: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add auth/AuthStore.ts
git commit -m "refactor: extract runWithStrategy helper to deduplicate AuthStore auth methods"
```

---

## Task 6: Split debug.tsx into Sub-components

**Files:**
- Create: `app/(misc)/debug/types.ts`
- Create: `app/(misc)/debug/SectionHeader.tsx`
- Create: `app/(misc)/debug/DebugStats.tsx`
- Create: `app/(misc)/debug/DebugInspection.tsx`
- Create: `app/(misc)/debug/DebugQuickActions.tsx`
- Create: `app/(misc)/debug/DebugDataManagement.tsx`
- Create: `app/(misc)/debug/DebugExport.tsx`
- Create: `app/(misc)/debug/DebugStorage.tsx`
- Modify: `app/(misc)/debug.tsx`

- [ ] **Step 1: Create `app/(misc)/debug/types.ts`**

```ts
import type Recipe from "~/data/db/models/Recipe";
import type { RecipeWithDetails } from "~/data/db/DatabaseFacade";

export type DebugRecipe = Recipe & { details?: RecipeWithDetails | null };
```

- [ ] **Step 2: Create `app/(misc)/debug/SectionHeader.tsx`**

```tsx
import { Pressable } from "react-native";
import { H3 } from "~/components/ui/typography";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-uniwind";

interface SectionHeaderProps {
  title: string;
  icon: string;
  expanded: boolean;
  onToggle: () => void;
}

export function SectionHeader({ title, icon, expanded, onToggle }: SectionHeaderProps) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center justify-between bg-card p-4 rounded-lg mb-2"
    >
      <H3>
        {icon} {title}
      </H3>
      {expanded ? (
        <ChevronUpIcon className="text-foreground" size={20} />
      ) : (
        <ChevronDownIcon className="text-foreground" size={20} />
      )}
    </Pressable>
  );
}
```

- [ ] **Step 3: Create `app/(misc)/debug/DebugStats.tsx`**

Extract lines 296-339 from `debug.tsx`. The component receives `stats`, `mealPlanData`, `isLoading`, `onRefreshStats`, and `expanded` + `onToggle`.

```tsx
import { View } from "react-native";
import { H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import type { DatabaseStats } from "~/data/db/DatabaseFacade";
import type { MealPlanItemWithRecipe } from "~/data/api/mealPlanApi";
import { SectionHeader } from "./SectionHeader";

interface DebugStatsProps {
  stats: DatabaseStats | null;
  mealPlanData: MealPlanItemWithRecipe[];
  isLoading: boolean;
  onRefreshStats: () => void;
  expanded: boolean;
  onToggle: () => void;
}

export function DebugStats({ stats, mealPlanData, isLoading, onRefreshStats, expanded, onToggle }: DebugStatsProps) {
  return (
    <>
      <SectionHeader title="Database Stats" icon="\u{1F4CA}" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4">
          {stats ? (
            <>
              <P>{"\u{1F4CA}"} Total Records: {stats.totalRecords}</P>
              <P>{"\u{1F373}"} Recipes: {stats.recipes}</P>
              <P>{"\u{1F955}"} Ingredients: {stats.ingredients}</P>
              <P>{"\u{1F4E6}"} Stock Items: {stats.stockItems}</P>
              <P>{"\u{1F3F7}\u{FE0F}"} Categories: {stats.categories}</P>
              <P>{"\u{1F4C5}"} Meal Plan Items: {mealPlanData.length}</P>

              {mealPlanData.length > 0 && (
                <View className="mt-4 pt-4 border-t border-border">
                  <H3 className="mb-3">{"\u{1F4C5}"} Current Meal Plan</H3>
                  {mealPlanData.map((item, index) => (
                    <View key={item.id} className="mb-2 p-2 bg-muted rounded">
                      <P className="font-medium">
                        {index + 1}. {item.recipe?.title ?? "Unknown Recipe"}
                      </P>
                      <P className="text-sm text-muted-foreground">
                        Servings: {item.servings} | Ingredients: {item.recipe?.ingredients?.length ?? 0}
                      </P>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <P className="text-muted-foreground">Loading stats...</P>
          )}
          <Button onPress={onRefreshStats} disabled={isLoading} variant="outline" className="w-full mt-3" size="sm">
            <P className="text-foreground font-medium">{"\u{1F504}"} Refresh Stats</P>
          </Button>
        </View>
      )}
    </>
  );
}
```

- [ ] **Step 4: Create `app/(misc)/debug/DebugInspection.tsx`**

Extract lines 341-426. Receives inspection state and handlers.

```tsx
import { View, ActivityIndicator } from "react-native";
import { H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import type { AvailableRecipesResult } from "~/data/db/DatabaseFacade";
import type Recipe from "~/data/db/models/Recipe";
import type { DebugRecipe } from "./types";
import { SectionHeader } from "./SectionHeader";

interface DebugInspectionProps {
  inspectionLoading: boolean;
  stockItems: { name: string; quantity: number; unit: string }[];
  recipes: DebugRecipe[];
  recommendations: AvailableRecipesResult | null;
  onLoadData: () => void;
  expanded: boolean;
  onToggle: () => void;
}

export function DebugInspection({
  inspectionLoading,
  stockItems,
  recipes,
  recommendations,
  onLoadData,
  expanded,
  onToggle,
}: DebugInspectionProps) {
  return (
    <>
      <SectionHeader title="Database Inspection" icon="\u{1F50D}" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4">
          {!inspectionLoading && stockItems.length === 0 && recipes.length === 0 ? (
            <Button onPress={onLoadData} variant="outline" className="w-full mb-3">
              <P className="text-foreground font-medium">Load Database Details</P>
            </Button>
          ) : inspectionLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" />
              <P className="mt-2 text-muted-foreground">Loading database details...</P>
            </View>
          ) : (
            <>
              <View className="mb-4">
                <H3 className="mb-2">{"\u{1F4E6}"} Stock Items ({stockItems.length})</H3>
                {stockItems.length === 0 ? (
                  <P className="text-muted-foreground ml-2">No stock items with quantity</P>
                ) : (
                  stockItems.slice(0, 10).map((item, i) => (
                    <P key={i} className="ml-2 text-sm">
                      {"•"} {item.name}: {item.quantity} {item.unit}
                    </P>
                  ))
                )}
                {stockItems.length > 10 && (
                  <P className="text-xs text-muted-foreground ml-2 mt-1">
                    ...and {stockItems.length - 10} more
                  </P>
                )}
              </View>

              <View className="mb-4">
                <H3 className="mb-2">{"\u{1F4DA}"} Recipes ({recipes.length} total)</H3>
                {recipes.length === 0 ? (
                  <P className="text-muted-foreground ml-2">No recipes in local database</P>
                ) : (
                  recipes.map((recipe, i) => (
                    <View key={i} className="ml-2 mb-2">
                      <P className="font-semibold text-sm">{recipe.title}</P>
                      {recipe.details?.ingredients && (
                        <P className="text-xs text-muted-foreground ml-2">
                          {recipe.details.ingredients.length} ingredients
                        </P>
                      )}
                    </View>
                  ))
                )}
              </View>

              <View className="mb-4">
                <H3 className="mb-2">{"\u{1F3AF}"} Recommendations</H3>
                {recommendations ? (
                  <>
                    <P className="ml-2">{"✅"} Can make: {recommendations.canMake.length} recipes</P>
                    {recommendations.canMake.slice(0, 3).map((r: Recipe, i: number) => (
                      <P key={i} className="ml-6 text-sm">{"•"} {r.title}</P>
                    ))}
                    <P className="ml-2 mt-2">{"\u{1F7E6}"} Partial: {recommendations.partiallyCanMake.length} recipes</P>
                    {recommendations.partiallyCanMake.slice(0, 3).map((item: { recipe: Recipe; completionPercentage: number }, i: number) => (
                      <P key={i} className="ml-6 text-sm">
                        {"•"} {item.recipe.title} ({item.completionPercentage}%)
                      </P>
                    ))}
                  </>
                ) : (
                  <P className="text-muted-foreground ml-2">No recommendations loaded</P>
                )}
              </View>

              <Button onPress={onLoadData} variant="outline" className="w-full" size="sm">
                <P className="text-foreground font-medium">{"\u{1F504}"} Reload Inspection</P>
              </Button>
            </>
          )}
        </View>
      )}
    </>
  );
}
```

- [ ] **Step 5: Create `app/(misc)/debug/DebugQuickActions.tsx`**

Extract lines 428-460.

```tsx
import { View } from "react-native";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { SectionHeader } from "./SectionHeader";

interface DebugQuickActionsProps {
  isLoading: boolean;
  onSeedDatabase: () => void;
  onAddSample: () => void;
  onHealthCheck: () => void;
  onRefreshAll: () => void;
  expanded: boolean;
  onToggle: () => void;
}

export function DebugQuickActions({
  isLoading,
  onSeedDatabase,
  onAddSample,
  onHealthCheck,
  onRefreshAll,
  expanded,
  onToggle,
}: DebugQuickActionsProps) {
  return (
    <>
      <SectionHeader title="Quick Actions" icon="⚡" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4 gap-2">
          <Button onPress={onSeedDatabase} disabled={isLoading} className="w-full">
            <P className="text-primary-foreground font-medium">
              {"\u{1F331}"} {isLoading ? "Seeding..." : "Seed Full Database"}
            </P>
          </Button>
          <Button onPress={onAddSample} disabled={isLoading} variant="secondary" className="w-full">
            <P className="text-secondary-foreground font-medium">{"\u{1F3AF}"} Add Sample Data</P>
          </Button>
          <Button onPress={onHealthCheck} disabled={isLoading} variant="outline" className="w-full">
            <P className="text-foreground font-medium">{"\u{1F50D}"} Health Check</P>
          </Button>
          <Button onPress={onRefreshAll} disabled={isLoading} variant="outline" className="w-full">
            <P className="text-foreground font-medium">{"\u{1F504}"} Refresh UI Data</P>
          </Button>
        </View>
      )}
    </>
  );
}
```

- [ ] **Step 6: Create `app/(misc)/debug/DebugDataManagement.tsx`**

Extract lines 462-517.

```tsx
import { View } from "react-native";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { SectionHeader } from "./SectionHeader";

interface DebugDataManagementProps {
  isLoading: boolean;
  onClearMealPlan: () => void;
  onClearRecipes: () => void;
  onClearAll: () => void;
  expanded: boolean;
  onToggle: () => void;
}

export function DebugDataManagement({
  isLoading,
  onClearMealPlan,
  onClearRecipes,
  onClearAll,
  expanded,
  onToggle,
}: DebugDataManagementProps) {
  return (
    <>
      <SectionHeader title="Data Management" icon="\u{1F5C4}\u{FE0F}" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4 gap-2">
          <Button onPress={onClearMealPlan} disabled={isLoading} variant="destructive" className="w-full">
            <P className="text-destructive-foreground font-medium">{"\u{1F4C5}"} Clear Meal Plan</P>
          </Button>
          <Button onPress={onClearRecipes} disabled={isLoading} variant="destructive" className="w-full">
            <P className="text-destructive-foreground font-medium">{"\u{1F9F9}"} Clear Recipes</P>
          </Button>
          <Button onPress={onClearAll} disabled={isLoading} variant="destructive" className="w-full">
            <P className="text-destructive-foreground font-medium">{"\u{1F9F9}"} Clear All Data</P>
          </Button>
        </View>
      )}
    </>
  );
}
```

- [ ] **Step 7: Create `app/(misc)/debug/DebugExport.tsx`**

Extract lines 519-689. This is the largest sub-component.

```tsx
import { View } from "react-native";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { storage } from "~/data";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { recipeApi } from "~/data/api/recipeApi";
import { mealPlanApi } from "~/data/api/mealPlanApi";
import {
  PREF_APPLIANCES_KEY,
  PREF_ALLERGENS_KEY,
  PREF_OTHER_ALLERGENS_KEY,
  PREF_DIET_KEY,
} from "~/constants/storage-keys";
import { log } from "~/utils/logger";
import { Alert } from "react-native";
import { SectionHeader } from "./SectionHeader";

interface DebugExportProps {
  isLoading: boolean;
  onSetLoading: (loading: boolean) => void;
  onRefreshStats: () => void;
  onFetchMealPlanData: () => Promise<ReturnType<typeof mealPlanApi.getAllMealPlanItems>>;
  expanded: boolean;
  onToggle: () => void;
}

export function DebugExport({ isLoading, onSetLoading, onFetchMealPlanData, expanded, onToggle }: DebugExportProps) {
  const printLocalStorage = () => {
    try {
      const keys = storage.getAllKeys();
      const data = keys.reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = storage.get(key);
        return acc;
      }, {});
      const jsonOutput = JSON.stringify(data, null, 2);
      log.info("Local Storage (All Keys):", jsonOutput);
      Alert.alert("Storage Logged", `${keys.length} storage items logged to console. Check your logs.`);
    } catch (error) {
      log.error("Failed to get storage values:", error);
      Alert.alert("Error", "Failed to get storage values");
    }
  };

  const printIngredients = async () => {
    try {
      const stock = await databaseFacade.getAllStock();
      const plainData = stock.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      const jsonOutput = JSON.stringify(plainData, null, 2);
      log.info("Current Ingredients (Stock):", jsonOutput);
      Alert.alert("Ingredients Logged", `${stock.length} ingredients logged to console. Check your logs.`);
    } catch (error) {
      log.error("Failed to get ingredients:", error);
      Alert.alert("Error", "Failed to get ingredients");
    }
  };

  const printPreferences = () => {
    try {
      const appliances = storage.getString(PREF_APPLIANCES_KEY) ?? "";
      const diet = storage.getString(PREF_DIET_KEY) ?? "none";
      const allergens = storage.getString(PREF_ALLERGENS_KEY) ?? "";
      const otherAllergens = storage.getString(PREF_OTHER_ALLERGENS_KEY) ?? "";

      const preferences = {
        electricAppliances: appliances ? appliances.split(",") : [],
        dietaryPreference: diet,
        allergens: allergens ? allergens.split(",") : [],
        otherAllergens: otherAllergens ? otherAllergens.split(",").map((a: string) => a.trim()) : [],
      };

      const jsonOutput = JSON.stringify(preferences, null, 2);
      log.info("User Preferences:", jsonOutput);
      Alert.alert("Preferences Logged", "User preferences logged to console. Check your logs.");
    } catch (error) {
      log.error("Failed to get preferences:", error);
      Alert.alert("Error", "Failed to get preferences");
    }
  };

  const printRecommendedRecipes = async () => {
    try {
      onSetLoading(true);
      const { recipes } = await recipeApi.getRecipeRecommendations({ maxRecommendations: 10 });

      const output = recipes.map((r) => ({
        id: r.recipe.id,
        title: r.recipe.title,
        description: r.recipe.description,
        completionPercentage: r.completionPercentage,
        prepMinutes: r.recipe.prepMinutes,
        cookMinutes: r.recipe.cookMinutes,
        servings: r.recipe.servings,
        difficultyStars: r.recipe.difficultyStars,
        calories: r.recipe.calories,
        tags: r.recipe.tags,
        ingredients: (r.recipe.ingredients || []).map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        })),
        instructions: (r.recipe.instructions || []).map((step) => ({
          step: step.step,
          title: step.title,
          description: step.description,
        })),
      }));

      const jsonOutput = JSON.stringify(output, null, 2);
      log.info("Recommended Recipes (Full Data):", jsonOutput);
      Alert.alert("Recipes Logged", `${output.length} recommendations logged. Check your logs.`);
    } catch (error) {
      log.error("Failed to get recommendations:", error);
      Alert.alert("Error", "Failed to get recommendations");
    } finally {
      onSetLoading(false);
    }
  };

  const printMealPlan = async () => {
    try {
      const items = await onFetchMealPlanData();
      const jsonOutput = JSON.stringify(items, null, 2);
      log.info("Meal Plan Data:", jsonOutput);
      Alert.alert("Meal Plan Logged", `${items.length} meal plan items logged. Check your logs.`);
    } catch (error) {
      log.error("Failed to get meal plan:", error);
      Alert.alert("Error", "Failed to get meal plan data");
    }
  };

  return (
    <>
      <SectionHeader title="Export & Logging" icon="\u{1F4E4}" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4 gap-2">
          <Button onPress={printLocalStorage} disabled={isLoading} variant="outline" className="w-full">
            <P className="text-foreground font-medium">{"\u{1F4BE}"} Print Local Storage</P>
          </Button>
          <Button onPress={printIngredients} disabled={isLoading} variant="outline" className="w-full">
            <P className="text-foreground font-medium">{"\u{1F4C4}"} Print Ingredients JSON</P>
          </Button>
          <Button onPress={printPreferences} disabled={isLoading} variant="outline" className="w-full">
            <P className="text-foreground font-medium">{"⚙}\u{FE0F}"} Print User Preferences</P>
          </Button>
          <Button onPress={printRecommendedRecipes} disabled={isLoading} variant="outline" className="w-full">
            <P className="text-foreground font-medium">{"\u{1F373}"} Print Recommended Recipes</P>
          </Button>
          <Button onPress={printMealPlan} disabled={isLoading} variant="outline" className="w-full">
            <P className="text-foreground font-medium">{"\u{1F4C5}"} Print Meal Plan JSON</P>
          </Button>
        </View>
      )}
    </>
  );
}
```

- [ ] **Step 8: Create `app/(misc)/debug/DebugStorage.tsx`**

Extract lines 692-705.

```tsx
import { View } from "react-native";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY, PREFERENCE_COMPLETED_KEY, RECIPE_COOKED_KEY } from "~/constants/storage-keys";
import { SectionHeader } from "./SectionHeader";

interface DebugStorageProps {
  expanded: boolean;
  onToggle: () => void;
}

export function DebugStorage({ expanded, onToggle }: DebugStorageProps) {
  return (
    <>
      <SectionHeader title="Storage Reset" icon="\u{1F511}" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <View className="bg-card p-4 rounded-lg mb-4 gap-2">
          <Button onPress={() => storage.delete(ONBOARDING_COMPLETED_KEY)} variant="outline">
            <P className="text-foreground">Clear Onboarding Key</P>
          </Button>
          <Button onPress={() => storage.delete(PREFERENCE_COMPLETED_KEY)} variant="outline">
            <P className="text-foreground">Clear Preference Key</P>
          </Button>
          <Button onPress={() => storage.delete(RECIPE_COOKED_KEY)} variant="outline">
            <P className="text-foreground">Clear Recipe Cooked Key</P>
          </Button>
        </View>
      )}
    </>
  );
}
```

- [ ] **Step 9: Rewrite `app/(misc)/debug.tsx` as thin orchestrator**

Replace the entire file with:

```tsx
import React, { useState } from "react";
import { View, Alert, ScrollView } from "react-native";
import { H1, H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { seedDatabase, addQuickSampleData, checkDatabase } from "~/data/db/seed";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeftIcon } from "lucide-uniwind";
import { useRefreshPantryItems } from "~/hooks/queries/usePantryQueries";
import { mealPlanApi } from "~/data/api/mealPlanApi";
import { log } from "~/utils/logger";

import { DebugStats } from "./debug/DebugStats";
import { DebugInspection } from "./debug/DebugInspection";
import { DebugQuickActions } from "./debug/DebugQuickActions";
import { DebugDataManagement } from "./debug/DebugDataManagement";
import { DebugExport } from "./debug/DebugExport";
import { DebugStorage } from "./debug/DebugStorage";
import type { DebugRecipe } from "./debug/types";

type Sections = {
  stats: boolean;
  inspection: boolean;
  quickActions: boolean;
  dataManagement: boolean;
  export: boolean;
  storage: boolean;
};

export default function DebugScreen() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof databaseFacade.getDatabaseStats>> | null>(null);
  const { refresh } = useRefreshPantryItems();
  const [mealPlanData, setMealPlanData] = useState<Awaited<ReturnType<typeof mealPlanApi.getAllMealPlanItems>>>([]);

  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [stockItems, setStockItems] = useState<{ name: string; quantity: number; unit: string }[]>([]);
  const [recipes, setRecipes] = useState<DebugRecipe[]>([]);
  const [recommendations, setRecommendations] = useState<Awaited<ReturnType<typeof databaseFacade.getAvailableRecipes>> | null>(null);

  const [expandedSections, setExpandedSections] = useState<Sections>({
    stats: true,
    inspection: false,
    quickActions: false,
    dataManagement: false,
    export: false,
    storage: false,
  });

  const toggleSection = (section: keyof Sections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const checkStats = async () => {
    try {
      const dbStats = await databaseFacade.getDatabaseStats();
      setStats(dbStats);
      log.info("Current stats:", dbStats);
    } catch (error) {
      log.error("Stats error:", error);
    }
  };

  const fetchMealPlanData = async () => {
    try {
      const items = await mealPlanApi.getAllMealPlanItems();
      setMealPlanData(items);
      return items;
    } catch (error) {
      log.error("Meal plan fetch error:", error);
      return [];
    }
  };

  const loadInspectionData = async () => {
    try {
      setInspectionLoading(true);
      const stock = await databaseFacade.getAllStock();
      setStockItems(stock.filter((s) => s.quantity > 0));

      const allRecipes = await databaseFacade.getAllRecipes();
      const topRecipes = allRecipes.slice(0, 3);
      const detailsMap = await databaseFacade.getRecipesWithDetails(topRecipes.map((r) => r.id));
      const recipesWithDetails = topRecipes.map((r) =>
        Object.assign(r, { details: detailsMap.get(r.id) || null }) as DebugRecipe
      );

      const recs = await databaseFacade.getAvailableRecipes();
      setRecommendations(recs);
      setRecipes(recipesWithDetails);
    } catch (error) {
      log.error("Error loading inspection data:", error);
    } finally {
      setInspectionLoading(false);
    }
  };

  const runSeedDatabase = async () => {
    try {
      setIsLoading(true);
      Alert.alert("Starting...", "Seeding database with dummy data...");
      await seedDatabase();
      await Promise.all([refresh()]);
      Alert.alert("Success!", "Database seeded successfully!");
      await checkStats();
    } catch (error) {
      log.error("Seeding error:", error);
      Alert.alert("Error", "Failed to seed database");
    } finally {
      setIsLoading(false);
    }
  };

  const addSample = async () => {
    try {
      setIsLoading(true);
      await addQuickSampleData();
      await Promise.all([refresh()]);
      Alert.alert("Success!", "Sample data added");
      await checkStats();
    } catch (error) {
      log.error("Sample data error:", error);
      Alert.alert("Error", "Failed to add sample data");
    } finally {
      setIsLoading(false);
    }
  };

  const runHealthCheck = async () => {
    try {
      const isHealthy = await databaseFacade.isHealthy();
      const dbStats = await checkDatabase();
      Alert.alert(
        "Database Health",
        `Status: ${isHealthy ? "Healthy" : "Unhealthy"}\n\nRecipes: ${dbStats.recipes}\nStock Items: ${dbStats.stockItems}\nCooking History: ${dbStats.cookingHistory}`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to check database health");
    }
  };

  const refreshAllContexts = async () => {
    try {
      setIsLoading(true);
      await Promise.all([refresh()]);
      Alert.alert("Success!", "UI contexts refreshed!");
      await checkStats();
    } catch (error) {
      log.error("Refresh error:", error);
      Alert.alert("Error", "Failed to refresh contexts");
    } finally {
      setIsLoading(false);
    }
  };

  const clearRecipe = async () => {
    Alert.alert("Clear Recipes", "This will delete ALL recipes. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear Recipes",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoading(true);
            await databaseFacade.clearRecipes();
            await Promise.all([refresh()]);
            Alert.alert("Success!", "All recipes cleared");
            await checkStats();
          } catch (error) {
            Alert.alert("Error", "Failed to clear data");
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const clearAll = async () => {
    Alert.alert("Clear Database", "This will delete ALL data. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoading(true);
            await databaseFacade.clearAllData();
            await Promise.all([refresh()]);
            Alert.alert("Success!", "Database cleared");
            await checkStats();
          } catch (error) {
            Alert.alert("Error", "Failed to clear database");
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const clearMealPlan = async () => {
    Alert.alert("Clear Meal Plan", "This will remove all planned recipes. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoading(true);
            await mealPlanApi.clearAllPlannedRecipes();
            await fetchMealPlanData();
            Alert.alert("Success!", "Meal plan cleared");
          } catch (error) {
            Alert.alert("Error", "Failed to clear meal plan");
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  React.useEffect(() => {
    checkStats();
    fetchMealPlanData();
  }, []);

  return (
    <ScrollView className="flex-1 bg-background">
      <View style={{ paddingTop: top + 20 }} className="px-6 pb-6">
        <View className="flex-row items-center mb-6">
          <Button
            size="icon-sm"
            variant="ghost"
            onPress={() => router.back()}
            className="mr-3"
            accessibilityLabel="Go back"
          >
            <ArrowLeftIcon className="text-foreground" size={20} />
          </Button>
          <H1>Database Debug</H1>
        </View>

        <DebugStats
          stats={stats}
          mealPlanData={mealPlanData}
          isLoading={isLoading}
          onRefreshStats={checkStats}
          expanded={expandedSections.stats}
          onToggle={() => toggleSection("stats")}
        />

        <DebugInspection
          inspectionLoading={inspectionLoading}
          stockItems={stockItems}
          recipes={recipes}
          recommendations={recommendations}
          onLoadData={loadInspectionData}
          expanded={expandedSections.inspection}
          onToggle={() => toggleSection("inspection")}
        />

        <DebugQuickActions
          isLoading={isLoading}
          onSeedDatabase={runSeedDatabase}
          onAddSample={addSample}
          onHealthCheck={runHealthCheck}
          onRefreshAll={refreshAllContexts}
          expanded={expandedSections.quickActions}
          onToggle={() => toggleSection("quickActions")}
        />

        <DebugDataManagement
          isLoading={isLoading}
          onClearMealPlan={clearMealPlan}
          onClearRecipes={clearRecipe}
          onClearAll={clearAll}
          expanded={expandedSections.dataManagement}
          onToggle={() => toggleSection("dataManagement")}
        />

        <DebugExport
          isLoading={isLoading}
          onSetLoading={setIsLoading}
          onFetchMealPlanData={fetchMealPlanData}
          expanded={expandedSections.export}
          onToggle={() => toggleSection("export")}
        />

        <DebugStorage
          expanded={expandedSections.storage}
          onToggle={() => toggleSection("storage")}
        />

        <View className="mt-4 p-4 bg-muted rounded-lg">
          <H3 className="mb-2">{"\u{1F4A1}"} Instructions</H3>
          <P className="text-sm text-muted-foreground">{"•"} Quick Actions: Seed database, add samples, check health</P>
          <P className="text-sm text-muted-foreground">{"•"} Data Management: Clear specific data sets</P>
          <P className="text-sm text-muted-foreground">{"•"} Export & Logging: Print data to console for debugging</P>
          <P className="text-sm text-muted-foreground">{"•"} Storage Reset: Clear app state flags</P>
        </View>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 10: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add app/\(misc\)/debug.tsx app/\(misc\)/debug/
git commit -m "refactor: split debug.tsx (725 lines) into 6 focused sub-components"
```

---

## Task 7: Clean up `any` Types in Top Files

**Files:**
- Modify: `data/api/householdApi.ts`
- Modify: `data/api/pantryApi.ts`

**Note:** `FunctionGemmaService.ts` has 23 `any` usages but these involve complex AI/ML type interop — defer to a separate pass. `StockRepository.ts` only has 12 `any` in the portion visible, most in its `buildSearchQuery` base class — also defer. Focus on the two API files where the fixes are straightforward WatermelonDB model casts.

- [ ] **Step 1: Fix `householdApi.ts` — add typed model imports**

At the top of `data/api/householdApi.ts`, add these imports alongside the existing model imports:

```ts
import type Stock from "~/data/db/models/Stock";
import type HouseholdMember from "~/data/db/models/HouseholdMember";
```

Note: `Household` and `HouseholdMember` are already imported. Add `Stock`.

- [ ] **Step 2: Fix `householdApi.ts` — replace `any` casts in `fetchCurrentHousehold`**

Replace `(m: any)` and `(myMembership as any)` with typed casts:

```ts
const myMembership = members.find((m) => (m as HouseholdMember).userId === user.id);
// ...
return (await householdCollection.find((myMembership as HouseholdMember).householdId)) as Household;
```

- [ ] **Step 3: Fix `householdApi.ts` — replace `any` casts in `createHousehold`**

Replace all `(record: any)` in `create` callbacks:

```ts
const localHousehold = await database.write(async () => {
  const hh = await (householdCollection as ReturnType<typeof database.collections.get<"household">>).create((record) => {
    record.supabaseId = supabaseHousehold.id;
    record.name = name;
    record.inviteCode = inviteCode;
    record.inviteExpiresAt = new Date(supabaseHousehold.invite_expires_at).getTime();
    record.maxMembers = maxMembers;
    record.createdByUserId = user.id;
  });

  await (memberCollection as ReturnType<typeof database.collections.get<"household_member">>).create((record) => {
    record.supabaseId = supabaseHousehold.id;
    record.householdId = hh.id;
    record.userId = user.id;
    record.joinedAt = Date.now();
  });

  return hh;
});
```

For the stock seeding:

```ts
const batchOps = allStock.map((stock) =>
  (stock as Stock).prepareUpdate((record) => {
    record.householdId = supabaseHousehold.id;
    record.addedByUserId = user.id;
  })
);
```

- [ ] **Step 4: Fix `householdApi.ts` — replace remaining `any` casts**

Apply the same pattern to `joinHousehold`, `leaveHousehold`, `dissolveHousehold`, and `regenerateInviteCode` — replacing `(record: any)`, `(m: any)`, `(s: any)`, `(stock: any)` with typed casts using the imported model types.

For all `record: any` in create/update callbacks, remove the type annotation and rely on the collection's generic type. For `s: any` and `m: any` filter predicates, cast to the model type: `(s) => (s as Stock).householdId`.

- [ ] **Step 5: Fix `pantryApi.ts` — typed stock array**

In `addPantryItems`, replace `stockRecordsToCreate: any[]` with:

```ts
const stockRecordsToCreate: Stock[] = [];
```

And the batch conversion:

```ts
const convertedBatch = await convertStockToPantryItemBatch(stockRecordsToCreate);
```

(Remove the `as Stock[]` cast since the array is now typed.)

- [ ] **Step 6: Fix `pantryApi.ts` — typed steps collection**

In `convertStockToPantryItemBatch`, replace `let allSteps: any[]` with a typed interface:

```ts
interface StepRecord {
  id: string;
  _raw: { stock_id: string; title?: string; description?: string; sequence?: number };
  title?: string;
  description?: string;
  sequence?: number;
}

let allSteps: StepRecord[] = [];
```

Then update the `stepsByStockId` map:

```ts
allSteps.forEach((s) => {
  const stockId = s._raw.stock_id;
  const list = stepsByStockId.get(stockId) || [];
  list.push({
    id: s.id,
    title: s.title || s._raw?.title,
    description: s.description || s._raw?.description,
    sequence: s.sequence || s._raw?.sequence || 0,
  });
  stepsByStockId.set(stockId, list);
});
```

- [ ] **Step 7: Fix `pantryApi.ts` — typed synonym/category casts**

In `convertStockToPantryItemBatch`, the `(s as any).stock_id` patterns can use the typed collection accessors. Since the model uses decorators, access the `_raw` field consistently:

```ts
// For synonyms — IngredientSynonym model has stockId via decorator
allSynonyms.forEach((s) => {
  const stockId = s._raw.stock_id;
  const list = synonymsByStockId.get(stockId) || [];
  list.push({ id: s.id, synonym: s.synonym });
  synonymsByStockId.set(stockId, list);
});

// For stock categories
allStockCategories.forEach((sc) => {
  const stockId = sc._raw.stock_id;
  const categoryId = sc._raw.category_id;
  const list = categoriesByStockId.get(stockId) || [];
  const ingredientCat = ingredientCategoryMap.get(categoryId);
  if (ingredientCat) {
    list.push({ id: ingredientCat.id, name: ingredientCat.name });
  }
  categoriesByStockId.set(stockId, list);
});
```

- [ ] **Step 8: Fix `pantryApi.ts` — typed missing categories**

Replace `new Map<string, any[]>()` on line 656 with:

```ts
const missingCategoriesMap = new Map<string, Array<{ id: string; name: string }>>();
```

- [ ] **Step 9: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add data/api/householdApi.ts data/api/pantryApi.ts
git commit -m "refactor: replace 'any' types with proper WatermelonDB model casts in household and pantry APIs"
```

---

## Self-Review

### Spec Coverage

| Spec Item | Task |
|-----------|------|
| Deep link fix | Task 1 |
| Image cache bump | Task 2 |
| Skia lazy loading | Task 3 |
| Pantry dedup | Task 4 |
| AuthStore dedup | Task 5 |
| Debug split | Task 6 |
| `any` cleanup | Task 7 |

### Placeholder Scan
No TBD, TODO, or placeholder patterns found.

### Type Consistency
- `invalidateAfterPantryChange` accepts `QueryClient` — matches `useQueryClient()` return type
- `runWithStrategy` accepts `() => AuthStore` — matches Zustand's `get` function
- All sub-components use `SectionHeader` with consistent `{ expanded, onToggle }` props
- `DebugRecipe` type defined once in `types.ts`, imported by `DebugInspection`
