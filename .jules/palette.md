## 2026-07-09 - Accessible Pressables in React Native Node Tests
**Learning:** Jest tests using the Supabase client may fail with a "WebSocket not found" error when running in a Node environment, especially when using Node.js versions without a native WebSocket implementation.
**Action:** When working on testing or CI issues related to Supabase in Node, ensure that `ws` is installed as a dev dependency and `globalThis.WebSocket = require("ws")` is mocked in the Jest setup file.

## 2026-07-13 - Pressable accessibilityLabel Overrides Nested Children
**Learning:** In React Native, applying an `accessibilityLabel` to a container element like `Pressable` overrides the accessibility readout of its child elements. If there is text inside, screen readers will completely ignore it and only read the label. If the button has descriptive text, you don't need a label.
**Action:** When working on making `Pressable` elements accessible, carefully consider if the contents should be read by a screen reader. If they should, avoid adding an `accessibilityLabel` directly to the `Pressable`, but you can still add an `accessibilityRole="button"` if appropriate.

## 2024-05-23 - Avoid Modifying Encapsulated UI Components Piecemeal
**Learning:** If a standard UI primitive (like a `Button` component) is missing a default accessibility role, adding the role manually to every single call site is an anti-pattern that bloats the codebase and fragments accessibility implementations.
**Action:** Always attempt to apply accessibility defaults at the component definition level (e.g., inside `components/ui/button.tsx`) rather than modifying individual instances. If the core component already has the proper defaults, ensure you are not redundantly targeting those components.

## 2024-05-23 - Accessibility Labels for TextInputs
**Learning:** TextInputs need an `accessibilityLabel` for screen readers to properly announce their purpose. If `accessibilityLabel` is missing, adding a dynamic fallback like `props.placeholder || "Input field"` in a custom `Input` wrapper can resolve widespread accessibility gaps.
**Action:** When creating form inputs, directly provide an `accessibilityLabel`. For core UI library wrappers like `<Input>`, implement a fallback mechanism based on the `placeholder` prop to ensure all consumers inherit a baseline level of accessibility automatically.

## 2024-05-23 - Clean Prop Destructuring for Default Fallbacks
**Learning:** When creating a higher-order wrapper component (like `<Input>`) that sets a default accessibility fallback (e.g., using a placeholder as an `accessibilityLabel`), relying on the trailing `{...props}` spread to overwrite the fallback is fragile. It breaks if a consumer explicitly passes an `undefined` value for the prop.
**Action:** Always destructure the props you intend to provide fallbacks for directly in the function arguments, evaluate the fallback securely (e.g., `accessibilityLabel={accessibilityLabel || placeholder}`), and explicitly omit them from the `...props` rest parameter to ensure robust behavior.
