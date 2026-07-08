## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.

## 2024-05-16 - Module-Scoped Component Extraction
**Learning:** Extracting inline render functions into module-scoped functional components improves readability and maintainability without causing unnecessary re-renders. It separates concerns clearly.
**Action:** Identify overly long components with mixed concerns or inline render functions and extract them to module scope, passing necessary state via props.
