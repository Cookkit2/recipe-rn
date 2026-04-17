## 2025-04-17 - WatermelonDB Batch Inserts vs Sequential Awaits in Loops
**Learning:** Sequential `await collection.create()` inside loops (N+1 inserts) causes enormous bridge traffic overhead and blocks the JS thread significantly.
**Action:** Always map loop data through `collection.prepareCreate()`, deduplicate via `Set` and `Q.oneOf`, push to a `batchOps` array, and commit all insertions simultaneously using a single `await database.batch(...batchOps)` within the `database.write()` block.
