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

## 2025-02-20 - Extracting excessive Stack.Screen definitions
**Learning:** Overly long React components with huge chunks of `Stack.Screen` definitions can be safely extracted into smaller module-specific groups without breaking the Expo Router, as long as they return `Stack.Screen` directly or via a Fragment. However, because React Navigation requires the direct children of a Navigator to be Screen or Group components, they must be called as functions `{ScreenGroup()}` rather than rendered as components `<ScreenGroup />`.
**Action:** Extract large screen configurations into separate `ScreenGroup*` functions that return fragments, and call them directly in the navigator stack to improve readability.

## 2024-05-14 - Remove Unused Code
**Learning:** Cleaning up dead utility functions reduces mental overhead and prevents obsolete code from creeping back in.
**Action:** When finding unused exports, aggressively remove them along with their test coverage, then verify with `typecheck` and `test`.

## 2024-07-08 - Refactoring Long React Components
**Learning:** Extracting logical sections of a component (like a complex header, a bottom sheet with flatlist, etc.) into separate files vastly improves the readability of the main screen component. `app/meal-plan/index.tsx` was over 330 lines long, making it hard to follow. Creating a `components/` directory specifically for the screen keeps the components isolated from generic UI components.
**Action:** When working with large components, isolate logical pieces into new sub-components, pass down the necessary state/callbacks as props, and export them from an `index.ts` to keep imports clean.

## 2025-01-20 - Refactor long chart components into presentational sub-components
**Learning:** Extracting large inline rendering functions (like `renderChart()`) from chart components into module-level, pure presentational sub-components (like `StackedBars`, `XAxisLabels`) significantly improves readability and reduces the size of the main component body, adhering to Code Health guidelines.
**Action:** When a React component becomes overly long due to inline rendering blocks or helper functions, extract those blocks into module-scope presentational sub-components that accept the necessary calculated layout values as props.

## 2024-05-18 - Extracting Side-Effects to Custom Hooks
**Learning:** When refactoring overly long React components, extracting state, refs, and `useEffect` side-effects (like confetti animations or unlocked item tracking) into custom hooks significantly slims down the main component and separates presentation from business logic.
**Action:** Always look to group related state, `useRef`s, and `useEffect`s into domain-specific custom hooks (e.g., `useAchievements`) instead of leaving them scattered within large container components. Ensure all constants used by the extracted logic are properly exported from the hook and imported back into the component if needed.
