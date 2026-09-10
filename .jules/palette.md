## 2026-07-09 - Accessible Pressables in React Native Node Tests
**Learning:** Jest tests using the Supabase client may fail with a "WebSocket not found" error when running in a Node environment, especially when using Node.js versions without a native WebSocket implementation.
**Action:** When working on testing or CI issues related to Supabase in Node, ensure that `ws` is installed as a dev dependency and `globalThis.WebSocket = require("ws")` is mocked in the Jest setup file.

## 2026-07-13 - Pressable accessibilityLabel Overrides Nested Children
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` overrides the accessibility readout of its child elements. If there is text inside, screen readers will completely ignore it and only read the label. If the button has descriptive text, you don't need a label.
**Action:** When working on making `Pressable` elements accessible, carefully consider if the contents should be read by a screen reader. If they should, avoid adding an `accessibilityLabel` directly to the `Pressable`, but you can still add an `accessibilityRole="button"` if appropriate.
## 2024-05-24 - Camera Shutter Button Accessibility State
**Learning:** While custom `AnimatedPressable` components in React Native will handle interaction properly with a `disabled` prop, screen readers may fail to announce the button as disabled if it is not explicitly mapped to `accessibilityState={{ disabled: true }}`. This is particularly noticeable in heavily nested/custom components like the circular shutter button.
**Action:** When adding a `disabled` prop to any interactive custom component, particularly one inheriting from `Pressable` (or an animated version), always pair it with an explicit `accessibilityState={{ disabled }}` mapping.
