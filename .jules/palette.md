## 2024-05-14 - Accessibility for standard TouchableOpacity
**Learning:** Found multiple standard un-wrapped `TouchableOpacity` components lacking proper accessibility roles. In this app, many core React Native buttons (`TouchableOpacity`, `Pressable`) are used directly instead of the generic `<Button>` wrapper.
**Action:** When working on UI/UX, verify if interactive primitives like `TouchableOpacity` implement basic accessibility traits such as `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityState`.

## 2024-05-15 - Missing Accessibility Labels & States on Core UI Components
**Learning:** Found that custom `<Button>` components do not automatically pass `disabled` state to the screen reader natively like `accessibilityRole="button"`, and icon-only buttons often lack `accessibilityLabel` out-of-the-box.
**Action:** Always ensure that custom generic components wrapping interactive elements (like `Pressable`) propagate or explicitly define `accessibilityState={{ disabled: props.disabled }}` and spread the rest of the accessibility state props, and ensure consumers of icon-only buttons pass `accessibilityLabel`.

## 2024-05-16 - Accessibility attributes on dynamically generated List Items
**Learning:** List items generated via `.map()` that function as toggle buttons or filters (e.g., RecipeCategoryButtonGroup) often miss critical accessibility attributes like `accessibilityRole` and `accessibilityState` to convey their active state to screen readers.
**Action:** Always verify that mapped interactive elements have `accessibilityRole="button"`, an appropriate `accessibilityLabel`, and explicitly convey their active/selected state using `accessibilityState={{ selected: isSelected }}`.
