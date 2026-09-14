## 2026-07-09 - Accessible Pressables in React Native Node Tests
**Learning:** Jest tests using the Supabase client may fail with a "WebSocket not found" error when running in a Node environment, especially when using Node.js versions without a native WebSocket implementation.
**Action:** When working on testing or CI issues related to Supabase in Node, ensure that `ws` is installed as a dev dependency and `globalThis.WebSocket = require("ws")` is mocked in the Jest setup file.

## 2026-07-13 - Pressable accessibilityLabel Overrides Nested Children
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` overrides the accessibility readout of its child elements. If there is text inside, screen readers will completely ignore it and only read the label. If the button has descriptive text, you don't need a label.
**Action:** When working on making `Pressable` elements accessible, carefully consider if the contents should be read by a screen reader. If they should, avoid adding an `accessibilityLabel` directly to the `Pressable`, but you can still add an `accessibilityRole="button"` if appropriate.
## 2025-02-27 - Button Loading State Accessibility
**Learning:** In React Native, disabling a button during a loading state (`disabled: true`) prevents interaction, but screen readers will simply announce it as "disabled," which can leave users confused about why they cannot proceed.
**Action:** Always include `busy: isLoading` in the `accessibilityState` of interactive elements (like Buttons) alongside `disabled: isLoading`. This maps to `aria-busy` and ensures assistive technologies accurately convey that the application is actively processing an action.
