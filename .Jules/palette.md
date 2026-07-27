## 2024-07-27 - Dialog Close Button Accessibility
**Learning:** Icon-only close buttons in Dialog primitives often lack proper ARIA labels and roles, making them unreadable to screen readers.
**Action:** Always ensure icon-only buttons like `<DialogPrimitive.Close>` have `accessibilityLabel` and `accessibilityRole="button"` explicitly set.
