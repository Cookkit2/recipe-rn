🎯 **What:** Extracted the complex selection and action state from `GroceryListScreen` into a new `useGroceryListActions` custom hook.
💡 **Why:** `GroceryListScreen` was overly long and mixed UI rendering with complex business logic (clearing plans, multi-selection, deleting items). Extracting this logic separates concerns, making the component easier to read and maintain.
✅ **Verification:** Verified locally that typechecks, linting, and tests pass. Checked that the new hook correctly manages state and triggers alerts/toasts.
✨ **Result:** Reduced the size and complexity of `app/grocery-list/index.tsx`, adhering to the codebase pattern of utilizing dedicated custom hooks for feature-specific logic.
