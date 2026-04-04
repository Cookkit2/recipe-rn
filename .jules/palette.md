## 2024-04-02 - Hidden Search in Empty State
**Learning:** Found a UX anti-pattern in `app/recipes/favorites.tsx` where an empty list component was rendered alongside an active search bar that had no data to search.
**Action:** Always conditionally hide search and filter inputs when the underlying data source is completely empty (e.g., `!items || items.length === 0`) to prevent users from interacting with dead-end UI elements.
