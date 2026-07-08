## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.
## 2024-05-18 - Extracting Side-Effects to Custom Hooks
**Learning:** When refactoring overly long React components, extracting state, refs, and `useEffect` side-effects (like confetti animations or unlocked item tracking) into custom hooks significantly slims down the main component and separates presentation from business logic.
**Action:** Always look to group related state, `useRef`s, and `useEffect`s into domain-specific custom hooks (e.g., `useAchievements`) instead of leaving them scattered within large container components. Ensure all constants used by the extracted logic are properly exported from the hook and imported back into the component if needed.
