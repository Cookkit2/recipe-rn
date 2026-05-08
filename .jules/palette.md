## 2024-05-14 - Accessibility for standard TouchableOpacity
**Learning:** Found multiple standard un-wrapped `TouchableOpacity` components lacking proper accessibility roles. In this app, many core React Native buttons (`TouchableOpacity`, `Pressable`) are used directly instead of the generic `<Button>` wrapper.
**Action:** When working on UI/UX, verify if interactive primitives like `TouchableOpacity` implement basic accessibility traits such as `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityState`.

## 2024-05-15 - Missing Accessibility Labels & States on Core UI Components
**Learning:** Found that custom `<Button>` components do not automatically pass `disabled` state to the screen reader natively like `accessibilityRole="button"`, and icon-only buttons often lack `accessibilityLabel` out-of-the-box.
**Action:** Always ensure that custom generic components wrapping interactive elements (like `Pressable`) propagate or explicitly define `accessibilityState={{ disabled: props.disabled }}` and spread the rest of the accessibility state props, and ensure consumers of icon-only buttons pass `accessibilityLabel`.
## 2024-05-18 - Missing Accessibility Properties on Custom Pressable Components
**Learning:** Generic `Pressable` components acting as buttons (e.g., in `SlidingNumber.tsx` where tapping the number opens a modal) often lack explicit semantic roles, making them confusing for screen readers which won't announce them as interactive buttons.
**Action:** Always ensure that custom `Pressable` elements functioning as buttons include `accessibilityRole="button"`, a descriptive `accessibilityLabel`, and an appropriate `accessibilityHint` to clarify the resulting action.
