## 2023-10-27 - Loading states and accessibilityState
**Learning:** In React Native, ensure screen readers properly announce the loading state of an interactive component by explicitly setting `busy: true` (or an equivalent boolean variable) within the component's `accessibilityState` prop object, which correctly maps to `aria-busy`.
**Action:** Always include `busy` state in `accessibilityState` alongside `disabled` state when creating components with a loading state.
