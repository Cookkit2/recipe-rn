## 2024-10-24 - [WatermelonDB Batch Processing Optimization]

**Learning:** Utilizing `for` loops combined with individual sequential fetches `collection.find(id)` and individual `.update()` / `.destroyPermanently()` actions inherently creates severe N+1 database querying and transactional bottlenecks when processing large data chunks in WatermelonDB repositories (e.g. `BaseRepository` and `UserChallengeRepository`).
**Action:** When updating or deleting many entities by IDs, always use `Q.where('id', Q.oneOf(ids))` to select entities simultaneously as a single query array, then loop via `.map()` applying `.prepareUpdate()` or `.prepareDestroyPermanently()`. Finally execute this mapped array via `await database.batch(...)`. This single transaction approach drastically minimizes main-thread blockage and SQLite load.

## 2025-03-17 - Optimize RegExp and Object allocation in frequently called utility functions

**Learning:** In the `isIngredientMatch` utility function, `RegExp` objects (with `/g` flags) and large static objects (`synonymMap` and its `Object.entries()`) were being recreated on every function invocation. This function is called heavily inside nested loops when processing ingredient matches against the pantry (resulting in tens of thousands of calls), and the repetitive object allocations caused a noticeable performance drag.
**Action:** Always extract static regular expressions and static map objects to the module scope so they are only initialized once. Also, optimize loops by short-circuiting as early as possible.

## 2024-05-18 - Atomic Batch Fetches in Sync Logic

**Learning:** When optimizing N+1 "get or create" sync logic using `Q.oneOf` bulk fetches in WatermelonDB, the fetch operation must remain inside the `database.write(...)` transaction block. Moving it outside breaks atomicity and causes race conditions when concurrent syncs occur, resulting in SQLite UNIQUE constraint failures.
**Action:** When replacing N+1 `.find()` calls in sync functions with batched fetches, always ensure both the `.fetch()` and subsequent `.batch()` calls are wrapped inside the same `database.write()` block.
## 2024-03-30 - Optimize Sequential Auth DB Operations

**Learning:** Found an 'await waterfall' in `authStore.ts` where independent SQLite operations and SecureStore writes were being awaited sequentially during the critical auth path. In React Native apps, each of these `await` calls involves roundtrips over the JS-to-Native bridge.
**Action:** When performing multiple independent DB or storage writes (e.g., saving session, saving refresh token, writing to SecureStore after a user is created), always group them into a single `Promise.all` to parallelize the operations and significantly reduce total execution time across the bridge.
## 2026-04-01 - BaseRepository Loop Optimization
**Learning:** In the Bun/V8 environment for WatermelonDB repositories, iterating object properties using `for...in` with `Object.prototype.hasOwnProperty.call` is approximately 6x faster than using `Object.keys().forEach()`. This avoids intermediate array allocations and function scope overhead.
**Action:** Always prefer `for...in` loops over `Object.keys().forEach()` for simple property assignments in performance-critical execution paths like base repository transactions.
## 2024-05-24 - Batch Creation Optimization in WatermelonDB
**Learning:** Sequential `create` operations inside loops (`await repo.create(...)`) are significant performance bottlenecks in WatermelonDB.
**Action:** Replaced sequential awaits with `prepareCreate` and executed them via a single `database.batch(...)` array. This resulted in a measured ~65% speedup for metadata relationship creation. Always use `database.batch` for array-based entity creation.
