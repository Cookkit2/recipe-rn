## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.

## 2024-07-08 - Extracted RecipeDetails Review and Tip logic into a custom hook
**Learning:** Overly long React components often contain clusters of related state and effect logic that can be isolated. In `app/recipes/[recipeId]/index.tsx`, the review and tip logic was mixed with UI rendering.
**Action:** Extracting related state and React Query hooks into custom hooks (e.g. `useRecipeReviewsAndTips`) reduces component complexity and improves maintainability by encapsulating concerns. Always check for untracked artifact files like `test_extract.ts` or lockfiles before requesting review.
