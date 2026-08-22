## 2026-07-09 - Accessible Pressables in React Native Node Tests
**Learning:** Jest tests using the Supabase client may fail with a "WebSocket not found" error when running in a Node environment, especially when using Node.js versions without a native WebSocket implementation.
**Action:** When working on testing or CI issues related to Supabase in Node, ensure that `ws` is installed as a dev dependency and `globalThis.WebSocket = require("ws")` is mocked in the Jest setup file.

## 2026-07-13 - Pressable accessibilityLabel Overrides Nested Children
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` overrides the accessibility readout of its child elements. If there is text inside, screen readers will completely ignore it and only read the label. If the button has descriptive text, you don't need a label.
**Action:** When working on making `Pressable` elements accessible, carefully consider if the contents should be read by a screen reader. If they should, avoid adding an `accessibilityLabel` directly to the `Pressable`, but you can still add an `accessibilityRole="button"` if appropriate.

## 2024-05-23 - Dynamic Accessibility Labels for Loading States
**Learning:** In React Native, applying a static `accessibilityLabel` to a button that has dynamic inner text (e.g. indicating a loading state like 'Saving...' vs 'Save') causes screen readers to ignore the state change, hiding vital feedback.
**Action:** When adding accessibility labels to buttons with dynamic content or loading states, ensure the `accessibilityLabel` is also dynamic to accurately reflect the current state (e.g. `accessibilityLabel={isSaving ? "Saving..." : "Save as Template"}`).
