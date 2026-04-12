
## 2024-05-18 - Batch Limits in WatermelonDB
**Learning:** In WatermelonDB on React Native, SQLite limits queries using `Q.oneOf(...)` to 999 parameters. When querying large data sets (like all recipes and their steps/ingredients to find matches), using `Q.oneOf(recipeIds)` where `recipeIds` contains thousands of IDs crashes the application.
**Action:** When making bulk fetches with unbounded arrays of IDs, always use a chunked batch fetch processing IDs in batches of 500 and resolving them concurrently with `Promise.all()`.
