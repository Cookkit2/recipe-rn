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
