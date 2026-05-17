## 2024-05-14 - Accessibility for standard TouchableOpacity
**Learning:** Found multiple standard un-wrapped `TouchableOpacity` components lacking proper accessibility roles. In this app, many core React Native buttons (`TouchableOpacity`, `Pressable`) are used directly instead of the generic `<Button>` wrapper.
**Action:** When working on UI/UX, verify if interactive primitives like `TouchableOpacity` implement basic accessibility traits such as `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityState`.

## 2024-05-15 - Missing Accessibility Labels & States on Core UI Components
**Learning:** Found that custom `<Button>` components do not automatically pass `disabled` state to the screen reader natively like `accessibilityRole="button"`, and icon-only buttons often lack `accessibilityLabel` out-of-the-box.
**Action:** Always ensure that custom generic components wrapping interactive elements (like `Pressable`) propagate or explicitly define `accessibilityState={{ disabled: props.disabled }}` and spread the rest of the accessibility state props, and ensure consumers of icon-only buttons pass `accessibilityLabel`.

## 2026-05-17 - Adding accessibility attributes to interactive cards
**Learning:** Interactive cards wrapped in `Pressable` acting as buttons (e.g., navigating to another screen) often lack proper accessibility attributes like `accessibilityRole="button"` and a descriptive `accessibilityLabel`, preventing screen readers from identifying them correctly.
**Action:** When implementing or modifying an interactive card (especially those wrapping complex content like lists or icons), ensure the outer `Pressable` has `accessibilityRole="button"` and a concise `accessibilityLabel` that describes the action (e.g., 'View all achievements').
