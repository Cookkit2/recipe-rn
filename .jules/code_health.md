## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.
## 2024-05-18 - Removing Unused Code and Lockfile Discipline
**Learning:** Removing unused functions often requires updating related test files to completely excise the code. Additionally, running tools like `bun test` or `bun install` can unintentionally modify the lockfile (`bun.lockb`).
**Action:** When removing code, always search for and remove its associated tests. Always run `git status` before requesting a review or submitting, and revert any unintended lockfile changes (`git restore --staged bun.lockb && git checkout bun.lockb`) to maintain a clean PR.
