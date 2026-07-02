## 2024-07-02 - Missing Accessibility Roles on Inline Actions
**Learning:** Secondary inline actions (like Edit/Delete text links) often miss interactive roles, making screen readers misinterpret them.
**Action:** Ensure that any Pressable wrapping text for an action explicitly includes accessibilityRole="button" and a descriptive accessibilityLabel.
