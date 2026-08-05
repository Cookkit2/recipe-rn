## 2025-03-01 - ⚡ Bolt: Cache DB derived values in MMKV
**Learning:** Checking achievements queries WatermelonDB counts (like `getIngredientsUsedBeforeExpiryCount`) frequently. Since WatermelonDB runs across a bridge, fetching it continuously causes latency.
**Action:** When a DB count is calculated, cache it in `storage.set` (MMKV) using a specific key. For subsequent reads, prefer `storage.get` which is significantly faster and doesn't incur bridge overhead. Ensure cache invalidation or updating occurs at the point of action (e.g., in `RecipeStepsContext`).
