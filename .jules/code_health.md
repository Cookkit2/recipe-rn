## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.

## 2024-05-14 - Remove Unused Code
**Learning:** Cleaning up dead utility functions reduces mental overhead and prevents obsolete code from creeping back in.
**Action:** When finding unused exports, aggressively remove them along with their test coverage, then verify with `typecheck` and `test`.
