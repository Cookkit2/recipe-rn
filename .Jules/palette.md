## 2026-10-07 - React Native Button Loading State
**Learning:** In React Native, ensure screen readers properly announce the loading state of an interactive component by explicitly setting `busy: true` (or an equivalent boolean variable) within the component's `accessibilityState` prop object, which correctly maps to `aria-busy`.
**Action:** Always include `busy: isLoading` inside `accessibilityState` alongside `disabled` when building interactive components.
