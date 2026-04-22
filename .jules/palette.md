## 2024-05-14 - Accessibility for standard TouchableOpacity
**Learning:** Found multiple standard un-wrapped `TouchableOpacity` components lacking proper accessibility roles. In this app, many core React Native buttons (`TouchableOpacity`, `Pressable`) are used directly instead of the generic `<Button>` wrapper.
**Action:** When working on UI/UX, verify if interactive primitives like `TouchableOpacity` implement basic accessibility traits such as `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityState`.

## 2024-05-15 - Missing Accessibility Labels & States on Core UI Components
**Learning:** Found that custom `<Button>` components do not automatically pass `disabled` state to the screen reader natively like `accessibilityRole="button"`, and icon-only buttons often lack `accessibilityLabel` out-of-the-box.
**Action:** Always ensure that custom generic components wrapping interactive elements (like `Pressable`) propagate or explicitly define `accessibilityState={{ disabled: props.disabled }}` and spread the rest of the accessibility state props, and ensure consumers of icon-only buttons pass `accessibilityLabel`.
## 2025-02-20 - React Native Pressable Map Rendering
**Learning:** When adding accessibility to `<Pressable>` components rendered dynamically via `.map()`, especially if there are derived state properties (e.g., `selectedRecipeTags.includes(tag)`), extracting the computation into a local block-scoped boolean (`const isSelected = ...`) significantly improves readability and ensures that `accessibilityState={{ selected: isSelected }}` stays perfectly synced with the component's visual styling without redundant computations.
**Action:** Extract condition checks into local variables when mapping over elements that require synchronized visual and accessibility states in React Native.
