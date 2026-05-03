# Grocery List Feature Plan

## Background and Motivation

The user wants to implement a grocery list feature that allows them to:

1. Add recipes to a "meal plan" from the recipe detail view
2. Access a grocery list page from the home pantry page
3. View aggregated ingredients needed from all planned recipes (minus what's already in pantry)

This feature will help users plan their shopping trips efficiently by showing them exactly what ingredients they need to buy based on the recipes they want to cook.

2026-05-03 CI triage note:

- The user wants PR #389 investigated because several CI checks are failing after the Bun migration and workflow edits.
- The goal is to identify true root failures, decide whether the current CI surface is appropriate for each PR, and avoid spending time fixing noisy or duplicated gates before agreeing on the desired CI shape.

---

## Key Challenges and Analysis

### Data Architecture

- **New Database Tables Required:**
  - `meal_plan`: Stores recipes that users want to cook
    - `recipe_id` (string, indexed)
    - `servings` (number) - user-selected servings when adding
    - `created_at` (number)
    - `updated_at` (number)
  - `grocery_item_check`: Tracks checked-off items during shopping
    - `ingredient_name` (string, indexed)
    - `is_checked` (boolean)
    - `created_at` (number)
    - `updated_at` (number)

### Smart Grocery List Logic

The core intelligence of this feature:

1. **Aggregate ingredients** across all planned recipes
2. **Combine duplicates** - "Onions" from 3 recipes → "Onions (4 total)"
3. **Smart unit conversion** - Combine compatible units (cups, ml, etc.)
4. **Subtract pantry stock** - Show only what user needs to buy
5. **Group by category** - Produce, Dairy, Meat, Pantry Staples

### UI Changes

1. **Recipe Detail TopBar** (`components/Recipe/Details/TopBar.tsx`)
   - Add "📅+" icon to add recipe to meal plan
   - Show serving picker modal before adding
   - Visual state: outline icon (not planned) vs filled icon (planned)
   - Show "✓ Planned" badge if already in plan

2. **Pantry Header** (`components/Pantry/PantryWrapper.tsx`)
   - **Current:** `[+]` → `[...]`
   - **New:** `[+]` → `[🛒 (badge)]` → `[👤]`
   - Shopping cart shows badge with count of items to buy
   - Change ellipsis to person icon for profile

3. **Grocery List Page** (`app/grocery-list/index.tsx`)
   - Grouped sections: 🥬 Produce, 🥛 Dairy, 🥩 Meat, 🥫 Pantry
   - Each item shows:
     - Checkbox (persists across sessions)
     - Ingredient name + quantity needed
     - "from: Recipe1, Recipe2" attribution
     - "✓ You have enough!" for covered items
   - Actions: Clear Checked, Clear All Planned Recipes

### Key Components to Create/Modify

| Component                                | Action | Description                                  |
| ---------------------------------------- | ------ | -------------------------------------------- |
| `TopBar.tsx`                             | MODIFY | Add "add to plan" button with serving picker |
| `AddToPlanModal.tsx`                     | CREATE | Modal to select servings before adding       |
| `MenuDropdown.tsx`                       | MODIFY | Change to person icon                        |
| `GroceryListButton.tsx`                  | CREATE | Shopping cart button with badge              |
| `app/grocery-list/index.tsx`             | CREATE | Grocery list page                            |
| `GroceryListWrapper.tsx`                 | CREATE | Main wrapper with grouped list               |
| `GroceryListSection.tsx`                 | CREATE | Category section (Produce, Dairy, etc.)      |
| `GroceryListItem.tsx`                    | CREATE | Individual item with checkbox                |
| `data/db/schema.ts`                      | MODIFY | Add meal_plan + grocery_item_check tables    |
| `data/db/models/MealPlan.ts`             | CREATE | MealPlan model                               |
| `data/db/models/GroceryItemCheck.ts`     | CREATE | Checked state persistence                    |
| `hooks/queries/useMealPlanQueries.ts`    | CREATE | React Query hooks                            |
| `hooks/queries/useGroceryListQueries.ts` | CREATE | Computed grocery list hook                   |

---

## High-Level Task Breakdown

### Phase 1: Database Schema & Models

- [ ] 1.1 Add `meal_plan` table to schema.ts
- [ ] 1.2 Add `grocery_item_check` table to schema.ts (for persistent check state)
- [ ] 1.3 Create MealPlan model (`data/db/models/MealPlan.ts`)
- [ ] 1.4 Create GroceryItemCheck model (`data/db/models/GroceryItemCheck.ts`)
- [ ] 1.5 Create MealPlanRepository (`data/db/repositories/MealPlanRepository.ts`)
- [ ] 1.6 Create GroceryItemCheckRepository
- [ ] 1.7 Export models and repositories from index files
- [ ] 1.8 Increment schema version and handle migration

### Phase 2: Data Access Layer & Business Logic

- [ ] 2.1 Create `useMealPlanQueries.ts` - fetch all planned recipes
- [ ] 2.2 Create mutations: addToPlan, removeFromPlan, updateServings
- [ ] 2.3 Create `useGroceryList.ts` - the smart aggregation hook
  - Combine duplicate ingredients
  - Convert/normalize units where possible
  - Subtract pantry stock quantities
  - Return grouped by category
- [ ] 2.4 Create `useGroceryItemCheck.ts` - toggle checked state

### Phase 3: UI - Pantry Header Changes

- [ ] 3.1 Modify `MenuDropdown.tsx` - Change EllipsisIcon → UserIcon
- [ ] 3.2 Create `GroceryListButton.tsx` - ShoppingCartIcon with badge
- [ ] 3.3 Update `PantryWrapper.tsx` - Insert GroceryListButton between buttons

### Phase 4: UI - Recipe Detail "Add to Plan"

- [ ] 4.1 Create `AddToPlanModal.tsx` - Serving picker modal
- [ ] 4.2 Modify `TopBar.tsx` - Add plan button with state indicator
- [ ] 4.3 Show toast on successful add: "Added to grocery list!"
- [ ] 4.4 Handle "already planned" state - show option to remove

### Phase 5: Grocery List Page

- [ ] 5.1 Create `app/grocery-list/index.tsx` - Main page with header
- [ ] 5.2 Create `components/GroceryList/GroceryListWrapper.tsx` - Container
- [ ] 5.3 Create `components/GroceryList/GroceryListSection.tsx` - Category group
- [ ] 5.4 Create `components/GroceryList/GroceryListItem.tsx` - Checkbox item
- [ ] 5.5 Add route configuration in `app/_layout.tsx`
- [ ] 5.6 Add empty state: "No recipes planned yet!"

### Phase 6: Polish & UX

- [ ] 6.1 Add satisfying checkbox animation (strikethrough + scale)
- [ ] 6.2 Add "Covered" state for items you already have
- [ ] 6.3 Add "Clear Checked" and "Clear All" actions
- [ ] 6.4 Test full flow end-to-end
- [ ] 6.5 Handle edge cases (unit mismatches, missing categories)

---

## Project Status Board

- [x] Phase 1: Database Schema & Models ✅
- [x] Phase 2: Data Access Layer & Business Logic ✅
- [x] Phase 3: UI - Pantry Header Changes ✅
- [x] Phase 4: UI - Recipe Detail "Add to Plan" ✅
- [x] Phase 5: Grocery List Page ✅
- [x] Phase 6: Polish & UX ✅
- [x] 2026-03-17: Fix failing Jest tests (update expectations for `safeJsonParse` + corrupted auth session handling). ✅
- [ ] 2026-03-12: Fix `SegmentedButtons` column layout regression caused by dynamic NativeWind basis classes.
- [ ] 2026-03-12: Resolve iOS archive failure caused by building the CocoaPods app project without its workspace.
- [x] 2026-05-03: Replace WatermelonDB `database.batch(...ops)` spread calls with array calls repo-wide to remove large-batch warnings.
- [x] 2026-05-03: Move search filters from inline horizontal chips into a toolbar-triggered bottom sheet.
- [x] 2026-05-03: Fix Reanimated `useScrollOffset` warning on recipe detail loading states.
- [x] 2026-05-03: Triage PR #389 CI failures and choose a lean PR/merge CI policy.
- [ ] 2026-05-03: Execute lean PR CI plan from `docs/superpowers/plans/2026-05-03-lean-pr-ci.md`.
- [x] 2026-05-03: Remove noisy create-camera pipeline info/profiling logs while keeping warnings and errors.

---

## Executor Feedback or Help Requests

**✅ FEATURE IMPLEMENTATION COMPLETE!**

All phases have been implemented. The grocery list feature is now ready for testing.

2026-03-12 executor update:

- Investigating a UI regression where `DietarySection` passes `columns={3}` but `SegmentedButtons` renders each option full-width.
- Root cause: runtime-generated class names like `basis-1/${columns}` are not statically compiled by NativeWind, so the width class is dropped.
- Plan: replace the dynamic basis class with a small static mapping helper and keep a regression test alongside it.
- Blocker: `npm test` cannot run because the workspace does not currently have the `jest` binary installed, so automated red/green verification is limited to type/lint checks for this task.

2026-03-12 executor update:

- Investigated an iOS archive failure from the provided Xcode log.
- Root cause: the build is running against `ios/Cookkit.xcodeproj` instead of `ios/Cookkit.xcworkspace`, so the target dependency graph contains only `Cookkit` and none of the CocoaPods targets that generate the Expo module maps referenced by `Pods-Cookkit.release.xcconfig`.
- Evidence: the log shows `cd /Users/ming/Documents/GitHub/recipe-rn/ios/Cookkit.xcodeproj`, a one-target dependency graph, and missing files under `BuildProductsPath/Release-iphoneos/*/*.modulemap` such as `Expo/Expo.modulemap` and `EASClient/EASClient.modulemap`.
- Recommended next step: archive from the workspace or change the build command to use `-workspace ios/Cookkit.xcworkspace -scheme Cookkit` so pod products are built before Swift compilation.

2026-03-17 executor update:

- Consolidated all currently open PR branches (#118–#171) into `consolidate/open-prs-2026-03-17`.
- Opened a single combined PR: `https://github.com/Cookkit2/recipe-rn/pull/172`.
- Follow-up: PR `#172` is now **merged**, and GitHub currently reports **no open PRs** remaining in this repo.
- Notable recurring conflict resolutions: kept `package-lock.json` and `fix-ts-13.js` deleted (repo uses `bun.lockb`), unified JSON parsing via `utils/json-parsing.ts`, and merged/expanded sanitizer/text-formatter test suites without dropping prior cases.

2026-05-03 executor update:

- Root cause of repeated runtime warning: WatermelonDB accepts `Model[]` directly, but many call sites still spread arrays into `database.batch(...ops)`. Large sync chunks of 500 operations become 500 function arguments and trigger WatermelonDB's performance warning.
- Plan: replace spread-based batch calls with array-form calls in the affected repository/API/hook/screen files, then run typecheck or focused validation.
- Completed repo-wide conversion of spread-based WatermelonDB batch calls to array-form calls.
- Verification: `bun run typecheck` passed; `bunx prettier --check` passed for touched files; no remaining `.batch(...` spread-array call sites were found.

2026-05-03 executor update:

- Search UX change in progress: remove the always-visible filter chip row from `app/search.tsx`, add a top-right filter toolbar button, and show time/difficulty/dietary controls inside a bottom sheet.
- Success criteria: selected filters still feed `useSearchRecipes`, users can clear filters from the sheet, and `bun run typecheck` passes for the route.
- Completed the search filter UX change in `app/search.tsx`.
- Verification: `bun run typecheck` passed; `bunx prettier --check app/search.tsx .cursor/scratchpad.md` passed; IDE lints report no errors for `app/search.tsx`.
- Follow-up fix: moved the filter button out of the native navigation header because `Stack.SearchBar`/hidden header can hide header buttons, and added an initial empty state that explains users can search pantry items or recipes.

2026-05-03 executor update:

- Root cause of Reanimated warning: `app/recipes/[recipeId]/index.tsx` initialized `useScrollOffset(scrollRef)` before recipe data loaded, then returned loading/error/not-found UI without mounting the `Animated.ScrollView` that owns `scrollRef`.
- Fix: split the route into a loader component and `RecipeDetailsContent`, so `useScrollOffset` is only mounted once the recipe content and its scroll view are rendered together.

2026-05-03 CI triage update:

- PR #389 check rollup has five red checks, but two are summary jobs. Root failures are `Dependency Audit`, `Test Suite`, `Bun Audit`, and `Security Policy Compliance`.
- `Dependency Audit` and `Bun Audit` fail on the same three moderate advisories: `file-type`, `postcss`, and `uuid`. Local `npm audit --audit-level=moderate` cannot run because this Bun-only repo has no npm lockfile.
- `Security Policy Compliance` fails because the workflow treats any tracked `*.env` file as a secret and catches `ios/.xcode.env`, which is a normal React Native/Xcode helper file.
- `Test Suite` fails across nine suites: legacy `src/` auth tests have Jest transform/mocking issues, `utils/__tests__/gemini-api.test.ts` has a changed cost expectation, pantry metadata aggregation expects quantity 6 but receives 4, and TailoredRecipeMappingRepository tests still expect spread `database.batch` arguments instead of the new array form.

2026-05-03 CI planning update:

- Approved design written to `docs/superpowers/specs/2026-05-03-lean-pr-ci-design.md`.
- Implementation plan written to `docs/superpowers/plans/2026-05-03-lean-pr-ci.md`.
- Plan decomposes execution into six checkpoints: simplify PR CI, move heavy security scans, update known behavior-change tests, resolve pantry duplicate quantity behavior, quarantine legacy `src/` auth Jest suites, and run final verification.

2026-05-03 executor update:

- Bug in progress: pressing Finish on the final recipe cooking congratulations page calls `goToNextStep`, which sets `showRatingModal`, but `CongratulationsContent` has the `RateRecipeModal` import/render and completion handlers commented out.
- Plan: add a focused regression test for the congratulations page modal wiring, reconnect the modal to `RecipeStepsContext`, then run the focused test/typecheck.
- Completed: restored the rating/completion modal wiring in `CongratulationsContent` and added `components/Recipe/Step/__tests__/CongratulationsContent.test.tsx`.
- Verification: focused Jest test passed; `bun run typecheck` passed; Prettier check passed for touched files; IDE lints report no errors.

2026-05-03 executor correction:

- User clarified they do not want the rating modal in the cooking flow.
- Updated plan: keep the rating modal disabled, make the final Finish action complete the recipe directly, and return home through the existing completion path.
- Completed: removed the modal render from `CongratulationsContent`, changed the final `goToNextStep` branch to call `skipRatingAndComplete`, and updated the regression test to assert the modal is not rendered.
- Verification: focused Jest test passed; `bun run typecheck` passed; Prettier check passed for touched files; IDE lints report no errors.

2026-05-03 executor update:

- Removed high-volume create-camera `log.info` and segmentation/classification profiling output from the create ingredient camera pipeline.
- Kept warning/error logs for capture, gallery picker, model preload, segmentation, retry, and processing failures so real debugging signals remain visible.
- Verification: no remaining `log.info("[create-camera] ...")` or `[Profiling]` logs in TypeScript/TSX files; focused Prettier check passed; `bun run typecheck` passed; IDE lints report no errors for touched files.

---

## Technical Notes

### Icon Choices (from lucide-uniwind)

- **Add to Plan (Recipe Detail)**: `CalendarPlusIcon` (outline) / `CalendarCheckIcon` (filled/planned)
- **Shopping Cart (Pantry Header)**: `ShoppingCartIcon`
- **Profile (Pantry Header)**: `UserIcon`
- **Checkbox**: `CheckIcon` / `SquareIcon`

### Grocery List Calculation Logic

```typescript
interface GroceryItem {
  name: string;
  totalQuantity: number;
  unit: string;
  neededQuantity: number; // after subtracting pantry
  fromRecipes: string[]; // recipe titles
  category: "produce" | "dairy" | "meat" | "pantry" | "other";
  isChecked: boolean;
  isCovered: boolean; // neededQuantity <= 0
}

// Smart aggregation pseudocode
function computeGroceryList(
  mealPlanRecipes: MealPlanWithRecipe[],
  pantryItems: PantryItem[],
  checkedItems: GroceryItemCheck[]
): GroceryItem[] {
  // 1. Flatten all ingredients from planned recipes (scaled by servings)
  // 2. Group by normalized ingredient name
  // 3. Sum quantities (with unit conversion where possible)
  // 4. Match against pantry items, subtract available stock
  // 5. Mark covered items (needed <= 0)
  // 6. Apply checked state from persistence
  // 7. Group by category and sort
}
```

### Category Mapping

```typescript
const CATEGORY_MAP: Record<string, GroceryCategory> = {
  // Will use ingredient_category from database
  // Fallback: 'other'
};

const CATEGORY_ICONS = {
  produce: "🥬",
  dairy: "🥛",
  meat: "🥩",
  pantry: "🥫",
  other: "📦",
};
```

### Navigation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ PANTRY PAGE                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Pantry              [+] [🛒(5)] [👤]                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│         │                  │         │                      │
│         │                  │         └──► /profile          │
│         │                  │                                │
│         │                  └──► /grocery-list               │
│         │                       ┌─────────────────────┐     │
│         │                       │ 🥬 Produce          │     │
│         │                       │ □ Onions (3)        │     │
│         │                       │   from: Pasta, Stir │     │
│         │                       │ ✓ Garlic - covered! │     │
│         │                       │ 🥛 Dairy            │     │
│         │                       │ □ Milk (2 cups)     │     │
│         │                       └─────────────────────┘     │
│         └──► /ingredient/create                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RECIPE DETAIL PAGE                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                              [📅+] ◄── Add to Plan      │ │
│ │     [Recipe Image]                                      │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│         │                                                   │
│         └──► Modal: "Add to plan?"                          │
│              [Servings: 2 - +]                              │
│              [Cancel] [Add]                                 │
│                   │                                         │
│                   └──► Toast: "Added to grocery list! 🛒"   │
└─────────────────────────────────────────────────────────────┘
```

---

## Lessons Learned

_(To be updated during implementation)_

---

## Grocery List Unit Conversion & Purchased Section (PR #55)

### Background and Motivation

- PR #55 (`auto-claude: 013-grocery-list-unit-conversion-organization`) improves grocery list behavior by:
  - Combining duplicate ingredient quantities with unit conversion when they appear across multiple recipes.
  - Organizing checked-off items into a dedicated “Purchased” section at the bottom of the grocery list.
  - Tweaking visuals so the Purchased section reads as completed/secondary while preserving existing category sections.

### High-Level Task Breakdown

- [x] Draft concise plan for porting PR #55 behavior into this workspace (see `docs/plans/2026-03-08-grocery-list-unit-conversion-organization.md`).
- [ ] Update `useGroceryList` to:
  - Add a `purchased` entry to `GroceryCategory`, `CATEGORY_CONFIG`, and `CATEGORY_KEYWORDS`.
  - Use a `combineIngredientWithConversion` helper to merge duplicate ingredients with unit-aware totals.
  - Route checked items into a trailing `Purchased` section while leaving unchecked items in their original categories.
- [ ] Update `GroceryListSection` UI to visually distinguish the Purchased section (muted colors, lower emphasis) while keeping existing behavior for other categories.
- [ ] Run lint/type checks and manually validate unit conversion and Purchased section behavior in the running app.

---

2026-05-03 CI executor update:

- Simplified `.github/workflows/ci.yml` to PR-quality checks: typecheck, Prettier, Jest, and one high/critical Bun audit.

2026-05-03 CI executor update:

- Moved CodeQL, Semgrep, OSSF Scorecard, and repository security policy checks to scheduled/manual/main/master runs. Removed duplicate Bun audit from `security-scan.yml`.

2026-05-03 CI executor update:

- Updated test expectations for Gemini 2.5 Flash Lite pricing and WatermelonDB array-form `database.batch` calls.

2026-05-03 CI executor update:

- Corrected Jest commands from `bun test` to `bun run test` because bare `bun test` invokes Bun's native runner and fails on React Native Flow syntax before Jest configuration is applied.

2026-05-03 CI executor update:

- Chose duplicate pantry quantity aggregation for `addPantryItemsWithMetadata`: the implementation comment, pre-aggregation path, and existing-stock update branch all indicate incoming duplicate quantities should be added to pantry stock while refreshing metadata. Fixed the focused Jest mock to apply WatermelonDB array-form `database.batch(batchOps)` updates, preserving the expected `4 + 2 = 6` behavior.

2026-05-03 CI executor update:

- Quarantined legacy `src/` auth Jest suites from default PR CI because `src/AGENTS.md` marks that tree as unused legacy auth code.

2026-05-03 CI verification update:

- `bun run typecheck` passed with `tsc --noEmit`.
- `bunx prettier --check .github/workflows/ci.yml .github/workflows/security-scan.yml jest.config.js utils/__tests__/gemini-api.test.ts data/db/repositories/__tests__/TailoredRecipeMappingRepository.test.ts data/api/__tests__/pantryApi-addPantryItemsWithMetadata.test.ts .cursor/scratchpad.md docs/superpowers/specs/2026-05-03-lean-pr-ci-design.md docs/superpowers/plans/2026-05-03-lean-pr-ci.md` passed.
- `bun run test` passed: 45 suites, 579 tests. Jest emitted a Watchman recrawl warning and an open-handle warning after completion.
- `bun audit --audit-level=high` could not run locally because installed Bun is `1.1.43` and reports `error: Script not found "audit"`.
- `bun pm audit --audit-level=high` also could not run locally because Bun `1.1.43` reports `error: "audit" unknown command`.
- CI previously ran Bun `1.3.13`, where `bun audit` exists; the workflow keeps `bun audit --audit-level=high` for CI.

2026-05-03 precommit executor update:

- Investigating Husky precommit failure from `bun run typecheck`.
- Root causes found so far: stale pantry component test fixtures, WatermelonDB batch operation typing left as function callbacks, strict indexed-access checks in achievement/streak verification paths, storage facade narrowing to `never` after capability guards, and URL regex capture groups returning `string | undefined`.
- Applied focused TypeScript fixes and formatted the files reported by Prettier.
- Verification: `bun run typecheck` passed, `bun run lint` passed, and IDE lints report no errors for the TypeScript files touched for the precommit fix.
