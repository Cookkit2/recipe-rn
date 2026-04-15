
## 2024-05-24 - Accessibility labels on dynamic components
**Learning:** React Native's `<Pressable>` elements used for dynamic inputs (like the sliding number modal trigger) need explicit `accessibilityRole="button"` and `accessibilityLabel` to be usable by screen readers, as the content alone doesn't convey interactivity.
**Action:** Always add `accessibilityRole` and `accessibilityLabel` to generic interactive wrapper components.
