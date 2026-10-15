## 2026-07-09 - Accessible Pressables in React Native Node Tests
**Learning:** Jest tests using the Supabase client may fail with a "WebSocket not found" error when running in a Node environment, especially when using Node.js versions without a native WebSocket implementation.
**Action:** When working on testing or CI issues related to Supabase in Node, ensure that `ws` is installed as a dev dependency and `globalThis.WebSocket = require("ws")` is mocked in the Jest setup file.

## 2026-07-13 - Pressable accessibilityLabel Overrides Nested Children
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` overrides the accessibility readout of its child elements. If there is text inside, screen readers will completely ignore it and only read the label. If the button has descriptive text, you don't need a label.
**Action:** When working on making `Pressable` elements accessible, carefully consider if the contents should be read by a screen reader. If they should, avoid adding an `accessibilityLabel` directly to the `Pressable`, but you can still add an `accessibilityRole="button"` if appropriate.
## 2024-05-14 - React Native Checkbox Accessibility Label Truncation
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` completely overrides the accessibility readout of its child text elements. For interactive elements containing descriptive text (like a recipe step with a title and description), if the label only describes the action (e.g., "Mark complete"), the screen reader will never read the actual content of the step, rendering it unusable for visually impaired users.
**Action:** When adding accessibility to complex interactive containers, ensure the `accessibilityLabel` describes the item's *identity* (e.g., "Step 1: Title. Description"). Delegate the action instructions (e.g., "Marks step as complete") to the `accessibilityHint` prop so the user knows both what the item is and what interacting with it does.
## 2026-10-01 - Testing Library getByRole Override Issue
**Learning:** When using `getByRole` to query a checkbox that has a descriptive `accessibilityLabel` applied to a parent element, it will not find the checkbox. We must explicitly query using `getByLabelText` that matches the label of the parent element.
**Action:** When updating `accessibilityLabel` of a component in a test, always check to make sure the unit tests are updated to expect the new label or use alternative selection methods like `getByLabelText`.
## 2026-10-01 - Testing Library getByRole Override Issue
**Learning:** When using `getByRole` to query a checkbox that has a descriptive `accessibilityLabel` applied to a parent element, it will not find the checkbox. We must explicitly query using `getByLabelText` that matches the label of the parent element.
**Action:** When updating `accessibilityLabel` of a component in a test, always check to make sure the unit tests are updated to expect the new label or use alternative selection methods like `getByLabelText`.
