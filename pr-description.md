🧹 Refactor MealSlot component to reduce complexity

🎯 **What:** Extracted the complex drag-and-drop state, gestures, and animations into a `useMealSlotDrop` custom hook. Extracted the conditional render branches into dedicated functional subcomponents (`PlannedMealContent` and `EmptyMealContent`).
💡 **Why:** The `MealSlot` component was overly long and complex, violating the "Function is too long" code health guideline. This refactoring clearly separates the state management (drag and drop) from the UI rendering, making the component much more readable and maintainable.
✅ **Verification:** Verified that `bun run typecheck` passes, `bun run lint` passes, and the full test suite (`bun run test`) passed with 526/526 passing.
✨ **Result:** The main `MealSlot` function is now significantly shorter and focused purely on layout orchestration, drastically improving local readability without altering any component functionality or behavior.
