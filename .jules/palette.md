## 2024-05-10 - Screen Reader Field Labelling
**Learning:** React Native's `accessibilityLabelledBy` prop expects the target label to use the `nativeID` prop. For elements without explicit separate label components (like a secondary inline unit input), `accessibilityLabel` should be explicitly used.
**Action:** When connecting inputs to labels for a11y, verify `nativeID` exists on the target `<Label>`, and explicitly provide `accessibilityLabel` for trailing or icon-only buttons/inputs.
