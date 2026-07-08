## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.
## 2025-01-20 - Refactor long chart components into presentational sub-components
**Learning:** Extracting large inline rendering functions (like `renderChart()`) from chart components into module-level, pure presentational sub-components (like `StackedBars`, `XAxisLabels`) significantly improves readability and reduces the size of the main component body, adhering to Code Health guidelines.
**Action:** When a React component becomes overly long due to inline rendering blocks or helper functions, extract those blocks into module-scope presentational sub-components that accept the necessary calculated layout values as props.
