## 2026-07-09 - Accessible Pressables in React Native Node Tests
**Learning:** Jest tests using the Supabase client may fail with a "WebSocket not found" error when running in a Node environment, especially when using Node.js versions without a native WebSocket implementation.
**Action:** When working on testing or CI issues related to Supabase in Node, ensure that `ws` is installed as a dev dependency and `globalThis.WebSocket = require("ws")` is mocked in the Jest setup file.

## 2026-07-13 - Pressable accessibilityLabel Overrides Nested Children
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` overrides the accessibility readout of its child elements. If there is text inside, screen readers will completely ignore it and only read the label. If the button has descriptive text, you don't need a label.
**Action:** When working on making `Pressable` elements accessible, carefully consider if the contents should be read by a screen reader. If they should, avoid adding an `accessibilityLabel` directly to the `Pressable`, but you can still add an `accessibilityRole="button"` if appropriate.
## 2024-05-24 - Dynamic Accessibility Labels and States for Multi-Select Chips
**Learning:** In components that double as navigation links and multi-select toggles (like `RecipeChip` in `components/GroceryList/RecipeChip.tsx`), using a static `accessibilityLabel` (e.g. "View recipe for X") completely breaks the screen reader experience when the component is switched into a selection mode. Furthermore, screen readers need explicit `accessibilityState={{ selected: isSelected }}` to announce checkmark/selection state changes.
**Action:** When a generic component can enter a "selection mode", always dynamically update the `accessibilityLabel` (e.g., "Select X" or "Deselect X"), update the `accessibilityHint` to clarify the action, and pass the explicit `accessibilityState={{ selected: ... }}`.
