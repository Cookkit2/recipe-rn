## 2024-08-01 - Icon-only buttons lacking touch area
**Learning:** Found an icon-only `Pressable` for deleting ingredients (`IngredientDeleteButton`) lacking a minimum touch target (44x44 points) which makes tapping on mobile difficult.
**Action:** Always add `hitSlop` to icon-only `Pressable` components in React Native to ensure an accessible minimum touch target area.
