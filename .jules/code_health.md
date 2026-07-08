## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.
## 2024-05-30 - Extract Complex State Logic to Custom Hooks
**Learning:** Excessively long components with complex inline state and event handlers reduce readability and maintainability.
**Action:** Extract independent state and action handlers into dedicated custom hooks in the `hooks/` directory.
