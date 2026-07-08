## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.

## 2024-07-08 - Clean up legacy subscription read paths
**Learning:** Found an unused, deprecated `isValidSubscription` function. Although reported as unused, it still had one call site in `data/api/householdApi.ts`.
**Action:** When removing deprecated functions, always double-check for lingering usage across the codebase and refactor them to use the recommended modern alternative (e.g., `readEntitlement`) before deleting the code and its associated tests.
