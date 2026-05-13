## 2024-05-14 - Accessibility for standard TouchableOpacity
**Learning:** Found multiple standard un-wrapped `TouchableOpacity` components lacking proper accessibility roles. In this app, many core React Native buttons (`TouchableOpacity`, `Pressable`) are used directly instead of the generic `<Button>` wrapper.
**Action:** When working on UI/UX, verify if interactive primitives like `TouchableOpacity` implement basic accessibility traits such as `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityState`.

## 2024-05-15 - Missing Accessibility Labels & States on Core UI Components
**Learning:** Found that custom `<Button>` components do not automatically pass `disabled` state to the screen reader natively like `accessibilityRole="button"`, and icon-only buttons often lack `accessibilityLabel` out-of-the-box.
**Action:** Always ensure that custom generic components wrapping interactive elements (like `Pressable`) propagate or explicitly define `accessibilityState={{ disabled: props.disabled }}` and spread the rest of the accessibility state props, and ensure consumers of icon-only buttons pass `accessibilityLabel`.
## 2026-05-13 - Improve form accessibility in Log Waste dialog
**Learning:** In React Native, the `accessibilityLabelledBy` prop on `TextInput` elements must exactly match the `nativeID` prop of the corresponding `Label` component to correctly associate the label with the input for screen readers. Using the web `id` prop on the `TextInput` does not establish this relationship.
**Action:** When adding accessibility to React Native forms, explicitly check for and match `accessibilityLabelledBy` to `nativeID` rather than relying on web-standard `htmlFor` or `id` relationships.
