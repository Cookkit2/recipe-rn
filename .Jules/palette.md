## 2026-04-04 - Checkbox Accessibility in React Native
**Learning:** Custom Pressable components acting as checkboxes require explicit accessibilityRole="checkbox" and accessibilityState={{ checked: ... }} to be properly announced by screen readers, as implicit inference is insufficient.
**Action:** Always apply explicit accessibility role, state, and labels to toggleable Pressable components used as checkboxes.
