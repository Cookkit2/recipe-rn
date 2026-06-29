## 2024-05-14 - Accessibility for standard TouchableOpacity
**Learning:** Found multiple standard un-wrapped `TouchableOpacity` components lacking proper accessibility roles. In this app, many core React Native buttons (`TouchableOpacity`, `Pressable`) are used directly instead of the generic `<Button>` wrapper.
**Action:** When working on UI/UX, verify if interactive primitives like `TouchableOpacity` implement basic accessibility traits such as `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityState`.

## 2024-05-15 - Missing Accessibility Labels & States on Core UI Components
**Learning:** Found that custom `<Button>` components do not automatically pass `disabled` state to the screen reader natively like `accessibilityRole="button"`, and icon-only buttons often lack `accessibilityLabel` out-of-the-box.
**Action:** Always ensure that custom generic components wrapping interactive elements (like `Pressable`) propagate or explicitly define `accessibilityState={{ disabled: props.disabled }}` and spread the rest of the accessibility state props, and ensure consumers of icon-only buttons pass `accessibilityLabel`.

## 2024-05-18 - Missing Accessibility Roles on Highly Interactive List Items
**Learning:** Found that custom `AnimatedPressable` components used inside complex interactive lists (like `GroceryListItem`) often lack explicit `accessibilityRole="checkbox"` or `accessibilityRole="button"`, causing screen readers to miss their purpose and state.
**Action:** When working on complex interactive list items (like grocery lists or task lists), ensure the wrapping `Pressable` has the correct `accessibilityRole` (e.g., "checkbox") and explicitly passes its state via `accessibilityState={{ checked: isChecked }}` to properly announce to screen readers.
## 2024-05-20 - Grocery List Empty State missing clear guidance
**Learning:** Found that the empty state for the Grocery List lacked a call-to-action button, causing a dead end for users who might not know how to add items (which are added by planning meals).
**Action:** When working on empty states, always ensure there is clear guidance and an actionable CTA (like "Plan Meals") to help users discover features and continue their journey.
## 2024-06-07 - Accessibility for AnimatedPressable Action Buttons
**Learning:** Found that custom `AnimatedPressable` components acting as large visual action cards (like "Cooked Recipes" and "Grocery Lists" on the profile page) were missing explicit `accessibilityRole="button"` and `accessibilityLabel` properties, making them opaque to screen readers despite being highly interactive.
**Action:** When creating custom interactive cards or buttons using `Pressable` or `AnimatedPressable`, always explicitly assign `accessibilityRole="button"` and a descriptive `accessibilityLabel` so screen readers correctly identify their function.
## 2024-06-13 - Missing Accessibility Attributes on Visual Cards
**Learning:** Found that custom `AnimatedPressable` and `Pressable` wrapper components acting as visual cards (like `RecipeChip` containing an image and text) were missing explicit `accessibilityRole="button"` and `accessibilityLabel` properties, making them unidentifiable to screen readers.
**Action:** When creating visual, interactive cards or links using `Pressable`, explicitly add `accessibilityRole="button"` and build a descriptive `accessibilityLabel` (e.g., using the title prop) to ensure screen reader compatibility.
## 2024-06-14 - Accessibility for Cooked Recipe Profile Cards
**Learning:** Found that the `Pressable` wrapping `CookedRecipeCard` components lacked `accessibilityRole="button"` and `accessibilityLabel`, making it difficult for screen reader users to identify the card's purpose (viewing a recipe) and its dynamic contents (cook count, last cooked date).
**Action:** Always ensure that interactive elements wrapping complex data (like recipe history cards) explicitly set `accessibilityRole="button"` and provide a comprehensive `accessibilityLabel` that synthesizes the visual information (e.g., "View recipe for [Title]. Cooked [X] times. Last cooked [Date].").
## 2024-06-15 - Accessibility for gesture-driven list items
**Learning:** Found that custom `Pressable` components used inside complex drag-and-drop gesture handlers (like `MealPlanDragItem`) lacked explicit `accessibilityRole="button"` and `accessibilityLabel` properties. This prevented screen readers from recognizing the items as interactive or reading their dynamic contents (like recipe titles).
**Action:** When creating draggable or highly interactive items that wrap UI in a `<Pressable>` (even inside gesture detectors), always assign `accessibilityRole="button"` and a descriptive `accessibilityLabel` utilizing the underlying item's title or data to ensure screen reader users can interact with them properly.
## 2024-06-16 - Accessibility for Custom Carousels
**Learning:** Found that custom visual carousels using `Pressable` inside `LegendList` (like `RecipeCarousel`) often lack explicit `accessibilityRole="button"` and `accessibilityLabel` properties, making them opaque to screen readers despite being highly interactive to select items.
**Action:** When creating custom interactive carousels using `Pressable`, always explicitly assign `accessibilityRole="button"` and a descriptive `accessibilityLabel` (e.g., using the title prop) so screen readers correctly identify their function.
## 2024-06-22 - Accessibility Roles for Recipe Rating Modal
**Learning:** Found that custom `Pressable` components representing rating stars (like in `RateRecipeModal.tsx`) lacked `accessibilityRole="button"`, making it harder for screen reader users to identify them as interactive elements to set ratings.
**Action:** Always ensure that interactive elements intended to be tapped to set a value (like rating stars) have `accessibilityRole="button"`, a descriptive `accessibilityLabel`, and `accessibilityState` to properly convey their active/selected state.
## 2026-06-29 - Accessibility Attributes on Draggable Recipes
**Learning:** Found that the `Pressable` wrapping the recipe image inside `RecipeDraggable` lacked `accessibilityRole` and `accessibilityLabel`, which caused screen readers to not announce the element's purpose or the dynamic recipe title during drag-and-drop interactions in the meal plan calendar.
**Action:** When wrapping dynamic items in a `Pressable` component, even within a gesture detector context, always provide a clear `accessibilityRole=button` and a dynamic `accessibilityLabel` that incorporates the item's title or content.
