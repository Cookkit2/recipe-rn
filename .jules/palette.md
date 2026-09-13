## 2026-07-09 - Accessible Pressables in React Native Node Tests
**Learning:** Jest tests using the Supabase client may fail with a "WebSocket not found" error when running in a Node environment, especially when using Node.js versions without a native WebSocket implementation.
**Action:** When working on testing or CI issues related to Supabase in Node, ensure that `ws` is installed as a dev dependency and `globalThis.WebSocket = require("ws")` is mocked in the Jest setup file.

## 2026-07-13 - Pressable accessibilityLabel Overrides Nested Children
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` overrides the accessibility readout of its child elements. If there is text inside, screen readers will completely ignore it and only read the label. If the button has descriptive text, you don't need a label.
**Action:** When working on making `Pressable` elements accessible, carefully consider if the contents should be read by a screen reader. If they should, avoid adding an `accessibilityLabel` directly to the `Pressable`, but you can still add an `accessibilityRole="button"` if appropriate.

## 2024-05-23 - Avoid Modifying Encapsulated UI Components Piecemeal
**Learning:** If a standard UI primitive (like a `Button` component) is missing a default accessibility role, adding the role manually to every single call site is an anti-pattern that bloats the codebase and fragments accessibility implementations.
**Action:** Always attempt to apply accessibility defaults at the component definition level (e.g., inside `components/ui/button.tsx`) rather than modifying individual instances. If the core component already has the proper defaults, ensure you are not redundantly targeting those components.
