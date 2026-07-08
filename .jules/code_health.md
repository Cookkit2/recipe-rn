## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.
## 2025-02-13 - Remove unused useGroceryItemCount hook
**Learning:** Removing unused exports helps keep the bundle size small and the codebase clean, reducing cognitive load.
**Action:** Continually check for and remove unused code as part of routine code health maintenance.
