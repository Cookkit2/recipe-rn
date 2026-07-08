## 2024-07-05 - Refactor NutritionReportScreen

**Learning:** Extracting large inline useMemo logic (like computation for stats) into custom hooks greatly improves the readability of the UI component.
**Action:** Actively look for inline useMemo hooks in UI components and extract them when they represent self-contained business logic.

## 2024-07-08 - Refactoring SheetModalWrapper Gestures
**Learning:** Extracting complex reanimated and gesture logic into custom hooks significantly improves the readability of large View components, particularly by encapsulating shared values.
**Action:** Next time I encounter a component over ~150 lines with heavy `react-native-gesture-handler` and `react-native-reanimated` logic, I will preemptively plan to extract the gesture composition and `useSharedValue` setup into a dedicated hook.
