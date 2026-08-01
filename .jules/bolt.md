## 2026-08-01 - Avoid Fetch-All in Sync Operations
**Learning:** When syncing data with WatermelonDB (or any DB), using a generic `.query().fetch()` to load an entire collection into memory for manual O(1) lookups creates a massive bottleneck as the table grows.
**Action:** Always filter sync queries to fetch only the affected rows, using operators like `Q.oneOf()` with arrays of incoming IDs, or filtering by partitioning keys (like `household_id`), allowing the DB to do the heavy lifting.
