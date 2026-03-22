# Sprint 1 Implementation Plan - recipe-rn

## 1. Current Codebase State Analysis

Based on an architectural review of the repository:

*   **Database Schema (Task 1):** Mostly complete. WatermelonDB is configured with `recipe`, `recipe_step`, and `recipe_ingredient` tables (refer to `data/db/schema.ts`).
*   **Recipe Detail & Cooking Mode (Task 3 & 4):** Largely implemented. `app/recipes/[recipeId]/index.tsx` contains the detail view with ingredients and instructions. `app/recipes/[recipeId]/steps.tsx` handles the "Cooking Mode" carousel. Voice guidance foundation exists in `hooks/useVoiceCooking.ts`.
*   **Search UI (Task 2):** Basic search UI exists (`app/search.tsx`) utilizing `useSearchRecipes`, but advanced filters (dietary, time, difficulty) are missing.
*   **Favorites (Task 5):** The schema supports `is_favorite` and the UI has a heart toggle (`BottomActionBar.tsx`), but a dedicated Favorites list screen and robust toggle wiring appear pending.
*   **Smart Timer (Task 6):** Foundation exists but is disabled. Components like `<AddTimerDialog />` and `<StepTimer />` are commented out in `steps.tsx` and `StepCarousel.tsx`.
*   **Offline Mode (Task 7):** WatermelonDB provides offline-first data, but explicit caching strategies for images and synced remote data need refinement.

## 2. Priority Order of Tasks

We will focus on completing the core user journey (Search -> Save -> Cook) before tackling advanced integrations.

1.  **Task 2: Implement recipe search with filters (dietary, time, difficulty)**
    *   *Why:* Essential for discovery. Core text search exists, making this a natural extension.
2.  **Task 5: Implement favorites/saved recipes management**
    *   *Why:* High user value, low effort since schema and UI primitives exist.
3.  **Task 6: Add smart timer and notifications**
    *   *Why:* Crucial for the Cooking Mode experience. Code is already partially written but commented out.
4.  **Task 3: Finalize recipe detail view & steps**
    *   *Why:* Address commented-out sections (e.g., Nutrition) and polish existing implementation.

*(Note: Task 1 is considered done. Tasks 4, 7, and 8 are deferred to subsequent sprints to ensure Sprint 1 delivers a stable core loop).*

## 3. Detailed Implementation Plan

### Task 2: Recipe Search with Filters
*   **Estimated Complexity:** Medium
*   **Required Changes:**
    *   Update `app/search.tsx` to include UI controls for Time (e.g., < 30m), Difficulty (Stars), and Dietary tags.
    *   Modify `useSearchRecipes` hook in `hooks/queries/useRecipeQueries.ts` to accept and apply filter parameters.
    *   Update WatermelonDB queries (`Q.where`, `Q.and`) to handle the new filter constraints securely.
*   **Dependencies:** None.

### Task 5: Favorites/Saved Recipes Management
*   **Estimated Complexity:** Low
*   **Required Changes:**
    *   Implement a `toggleFavorite` mutation in the recipe repository/facade.
    *   Wire the `onToggleFavorite` prop in `app/recipes/[recipeId]/index.tsx`.
    *   Create a new screen (e.g., `app/profile/favorites.tsx`) utilizing a new `useFavoriteRecipes` query hook to list saved items.
*   **Dependencies:** None.

### Task 6: Smart Timer and Notifications
*   **Estimated Complexity:** Medium
*   **Required Changes:**
    *   Uncomment and integrate `<AddTimerDialog />` in `app/recipes/[recipeId]/steps.tsx`.
    *   Uncomment `<StepTimer />` in `components/Recipe/Step/StepCarousel.tsx`.
    *   Implement local push notifications using `expo-notifications` for when the timer expires in the background.
*   **Dependencies:** Requires physical device testing for robust background notification verification.

### Task 3: Finalize Recipe Detail View
*   **Estimated Complexity:** Low
*   **Required Changes:**
    *   Uncomment and integrate `<RecipeNutrition />` and `<UserChoice />` in `app/recipes/[recipeId]/index.tsx`.
    *   Ensure all related database fields (calories, etc.) are properly hydrated and displayed.
*   **Dependencies:** Task 1 (Schema) is already complete.

## 4. Technical Debt & Blockers

*   **Missing Files:** `app/recipes/index.tsx` and `app/recipes/search.tsx` were referenced but not found, indicating potential dead routes or unfinished refactoring.
*   **Commented Code:** Significant portions of the UI (Timers, Nutrition) are commented out.
*   **Testing Environment:** Development container may lack `ts-jest` or `tsc` initially. `pnpm install` must be run prior to executing tests or typechecks.

## 5. Risk Assessment

*   **Medium Risk:** Background Timers. Mobile OS restrictions on background execution can make reliable timers challenging. We must rely heavily on `expo-notifications` scheduling rather than purely JS-driven intervals.
*   **Low Risk:** Schema migrations. Since WatermelonDB is already setup, adding filters or toggling favorites relies on existing infrastructure.
