## 2024-05-18 - Batch Database Writes to avoid N+1 Queries
**Learning:** Sequential database operations (`await database.method()` inside a loop) can severely block the UI thread and cause extended database lock contention in React Native.
**Action:** Always batch related SQLite/WatermelonDB writes. Prepare operations using `collection.prepareCreate` or `model.prepareUpdate` outside the lock/loop, and execute them as an array using a single `database.batch(operations)` call to reduce overhead to O(1).

## 2026-07-31 - Batch Database Writes to avoid N+1 Queries
**Learning:** Sequential database operations (`await database.method()` inside a loop) can severely block the UI thread and cause extended database lock contention in React Native.
**Action:** Always batch related SQLite/WatermelonDB writes. Prepare operations using `collection.prepareCreate` or `model.prepareUpdate` outside the lock/loop, and execute them as an array using a single `database.batch(operations)` call to reduce overhead to O(1).
