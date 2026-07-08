## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.
## 2024-07-08 - Refactoring Long React Components
**Learning:** Extracting logical sections of a component (like a complex header, a bottom sheet with flatlist, etc.) into separate files vastly improves the readability of the main screen component. `app/meal-plan/index.tsx` was over 330 lines long, making it hard to follow. Creating a `components/` directory specifically for the screen keeps the components isolated from generic UI components.
**Action:** When working with large components, isolate logical pieces into new sub-components, pass down the necessary state/callbacks as props, and export them from an `index.ts` to keep imports clean.
