## 2026-07-09 - Accessible Pressables in React Native Node Tests
**Learning:** Jest tests using the Supabase client may fail with a "WebSocket not found" error when running in a Node environment, especially when using Node.js versions without a native WebSocket implementation.
**Action:** When working on testing or CI issues related to Supabase in Node, ensure that `ws` is installed as a dev dependency and `globalThis.WebSocket = require("ws")` is mocked in the Jest setup file.

## 2026-07-13 - Pressable accessibilityLabel Overrides Nested Children
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` overrides the accessibility readout of its child elements. If there is text inside, screen readers will completely ignore it and only read the label. If the button has descriptive text, you don't need a label.
**Action:** When working on making `Pressable` elements accessible, carefully consider if the contents should be read by a screen reader. If they should, avoid adding an `accessibilityLabel` directly to the `Pressable`, but you can still add an `accessibilityRole="button"` if appropriate.
## 2026-07-28 - accessibilityHint vs accessibilityLabel in Pressables
**Learning:** When dealing with `Pressable` containers in React Native that wrap readable text (like dates or ingredient info), applying an `accessibilityLabel` entirely suppresses the screen reader from reading the internal children. This breaks accessibility for key content.
**Action:** Use `accessibilityHint` on the `Pressable` container instead. This safely appends the action instruction (e.g., 'Change expiry date') after the screen reader has natively announced all the nested child text, providing both context and instruction.
