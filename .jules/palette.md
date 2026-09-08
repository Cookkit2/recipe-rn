## 2026-07-09 - Accessible Pressables in React Native Node Tests
**Learning:** Jest tests using the Supabase client may fail with a "WebSocket not found" error when running in a Node environment, especially when using Node.js versions without a native WebSocket implementation.
**Action:** When working on testing or CI issues related to Supabase in Node, ensure that `ws` is installed as a dev dependency and `globalThis.WebSocket = require("ws")` is mocked in the Jest setup file.

## 2026-07-13 - Pressable accessibilityLabel Overrides Nested Children
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` overrides the accessibility readout of its child elements. If there is text inside, screen readers will completely ignore it and only read the label. If the button has descriptive text, you don't need a label.
**Action:** When working on making `Pressable` elements accessible, carefully consider if the contents should be read by a screen reader. If they should, avoid adding an `accessibilityLabel` directly to the `Pressable`, but you can still add an `accessibilityRole="button"` if appropriate.

## 2026-09-08 - Dynamic specific accessibilityHint vs generic ones
**Learning:** When replacing an `accessibilityLabel` that overrides child text with an `accessibilityHint`, it is crucial to retain the dynamic contextual information from the original label (e.g., `Mark step ${step.step} complete`) rather than degrading it to a generic string (like `Toggles step completion`). Doing otherwise introduces an accessibility regression.
**Action:** When migrating from labels to hints on Pressables, always map the original specific instruction directly into the hint string to preserve context.

## 2026-09-08 - Reverting unintended lockfile changes
**Learning:** Accidental lockfile churn (e.g. from running `bun install`) can pollute a PR. Checking out the lockfile from the parent commit (`git checkout HEAD~1 -- bun.lockb`) and amending the commit is an effective way to cleanly remove it from the patch.
**Action:** If a lockfile is accidentally modified and committed, revert it specifically to HEAD~1 and amend before submitting.
