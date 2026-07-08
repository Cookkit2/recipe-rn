## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.
## 2024-03-24 - Removing bun.lockb changes
**Learning:** Running `bun install` can unintentionally modify `bun.lockb` if the environment's Bun version differs, which gets staged as an extraneous change during task execution.
**Action:** Always check `git status` and specifically revert `bun.lockb` (using `git restore --staged bun.lockb && git checkout bun.lockb`) before submitting a pull request to ensure only the intended code changes are included.
