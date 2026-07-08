## 2025-03-09 - Remove unused toKebabCase utility
**Learning:** Identifying and removing unused exports reduces cognitive overhead and bundle size, improving long-term maintainability.
**Action:** When finding unused code verified via codebase search, comprehensively delete both the function definition and its corresponding test cases to keep the codebase clean. Ensure no garbage files like temporary patch files or lockfiles are unintentionally added or modified when completing pre-commit steps.

## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.

## 2024-05-16 - Module-Scoped Component Extraction
**Learning:** Extracting inline render functions into module-scoped functional components improves readability and maintainability without causing unnecessary re-renders. It separates concerns clearly.
**Action:** Identify overly long components with mixed concerns or inline render functions and extract them to module scope, passing necessary state via props.

## 2025-02-13 - Remove unused useGroceryItemCount hook
**Learning:** Removing unused exports helps keep the bundle size small and the codebase clean, reducing cognitive load.
**Action:** Continually check for and remove unused code as part of routine code health maintenance.

## 2025-02-18 - Remove unused function
**Learning:** Removing unused utility functions reduces codebase clutter, cognitive load, and potentially bundle size.
**Action:** When asked to remove an unused export, always verify it's unused via global text search (`grep -rn "exportName" .`), then completely remove it and its associated tests and imports. Ensure you run type checks and tests to verify everything is safe before submitting.

## 2024-07-08 - Extracted RecipeDetails Review and Tip logic into a custom hook
**Learning:** Overly long React components often contain clusters of related state and effect logic that can be isolated. In `app/recipes/[recipeId]/index.tsx`, the review and tip logic was mixed with UI rendering.
**Action:** Extracting related state and React Query hooks into custom hooks (e.g. `useRecipeReviewsAndTips`) reduces component complexity and improves maintainability by encapsulating concerns. Always check for untracked artifact files like `test_extract.ts` or lockfiles before requesting review.

## 2024-03-24 - Removing bun.lockb changes
**Learning:** Running `bun install` can unintentionally modify `bun.lockb` if the environment's Bun version differs, which gets staged as an extraneous change during task execution.
**Action:** Always check `git status` and specifically revert `bun.lockb` (using `git restore --staged bun.lockb && git checkout bun.lockb`) before submitting a pull request to ensure only the intended code changes are included.

## 2024-05-30 - Extract Complex State Logic to Custom Hooks
**Learning:** Excessively long components with complex inline state and event handlers reduce readability and maintainability.
**Action:** Extract independent state and action handlers into dedicated custom hooks in the `hooks/` directory.
