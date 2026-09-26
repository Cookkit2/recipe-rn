## 2026-07-09 - Accessible Pressables in React Native Node Tests
**Learning:** Jest tests using the Supabase client may fail with a "WebSocket not found" error when running in a Node environment, especially when using Node.js versions without a native WebSocket implementation.
**Action:** When working on testing or CI issues related to Supabase in Node, ensure that `ws` is installed as a dev dependency and `globalThis.WebSocket = require("ws")` is mocked in the Jest setup file.

## 2026-07-13 - Pressable accessibilityLabel Overrides Nested Children
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` overrides the accessibility readout of its child elements. If there is text inside, screen readers will completely ignore it and only read the label. If the button has descriptive text, you don't need a label.
**Action:** When working on making `Pressable` elements accessible, carefully consider if the contents should be read by a screen reader. If they should, avoid adding an `accessibilityLabel` directly to the `Pressable`, but you can still add an `accessibilityRole="button"` if appropriate.

## 2026-08-27 - Separate Element Description and Action Description in Checkbox Roles
**Learning:** When using `accessibilityRole="checkbox"`, setting `accessibilityLabel` to an action-oriented phrase (e.g., 'Mark step complete') causes screen readers to announce redundant and confusing states (e.g., 'Mark step complete, checked, checkbox').
**Action:** Set `accessibilityLabel` to describe the item itself (e.g., 'Step 1: Preheat oven') and use `accessibilityHint` for the interactive action (e.g., 'Mark step complete').
