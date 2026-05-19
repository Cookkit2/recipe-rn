## 2024-05-14 - Accessibility for standard TouchableOpacity
**Learning:** Found multiple standard un-wrapped `TouchableOpacity` components lacking proper accessibility roles. In this app, many core React Native buttons (`TouchableOpacity`, `Pressable`) are used directly instead of the generic `<Button>` wrapper.
**Action:** When working on UI/UX, verify if interactive primitives like `TouchableOpacity` implement basic accessibility traits such as `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityState`.

## 2024-05-15 - Missing Accessibility Labels & States on Core UI Components
**Learning:** Found that custom `<Button>` components do not automatically pass `disabled` state to the screen reader natively like `accessibilityRole="button"`, and icon-only buttons often lack `accessibilityLabel` out-of-the-box.
**Action:** Always ensure that custom generic components wrapping interactive elements (like `Pressable`) propagate or explicitly define `accessibilityState={{ disabled: props.disabled }}` and spread the rest of the accessibility state props, and ensure consumers of icon-only buttons pass `accessibilityLabel`.

## 2024-05-18 - Missing Accessibility Roles on Highly Interactive List Items
**Learning:** Found that custom `AnimatedPressable` components used inside complex interactive lists (like `GroceryListItem`) often lack explicit `accessibilityRole="checkbox"` or `accessibilityRole="button"`, causing screen readers to miss their purpose and state.
**Action:** When working on complex interactive list items (like grocery lists or task lists), ensure the wrapping `Pressable` has the correct `accessibilityRole` (e.g., "checkbox") and explicitly passes its state via `accessibilityState={{ checked: isChecked }}` to properly announce to screen readers.
