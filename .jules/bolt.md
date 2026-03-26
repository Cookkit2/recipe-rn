## 2024-10-24 - [WatermelonDB Batch Processing Optimization]

**Learning:** Utilizing `for` loops combined with individual sequential fetches `collection.find(id)` and individual `.update()` / `.destroyPermanently()` actions inherently creates severe N+1 database querying and transactional bottlenecks when processing large data chunks in WatermelonDB repositories (e.g. `BaseRepository` and `UserChallengeRepository`).
**Action:** When updating or deleting many entities by IDs, always use `Q.where('id', Q.oneOf(ids))` to select entities simultaneously as a single query array, then loop via `.map()` applying `.prepareUpdate()` or `.prepareDestroyPermanently()`. Finally execute this mapped array via `await database.batch(...)`. This single transaction approach drastically minimizes main-thread blockage and SQLite load.

## 2025-03-17 - Optimize RegExp and Object allocation in frequently called utility functions

**Learning:** In the `isIngredientMatch` utility function, `RegExp` objects (with `/g` flags) and large static objects (`synonymMap` and its `Object.entries()`) were being recreated on every function invocation. This function is called heavily inside nested loops when processing ingredient matches against the pantry (resulting in tens of thousands of calls), and the repetitive object allocations caused a noticeable performance drag.
**Action:** Always extract static regular expressions and static map objects to the module scope so they are only initialized once. Also, optimize loops by short-circuiting as early as possible.

## 2025-03-25 - [Type Definition for Multi-Model Batch Operations]

**Learning:** When performing bulk `.prepareDestroyPermanently()` operations across multiple different model types (e.g. `mappings`, `steps`, `ingredients`, and `recipe`) and aggregating them into a single `batchOps` array for `database.batch(...)`, TypeScript struggles to infer a mixed union type for the array and throws a TS2345 type mismatch error.
**Action:** Always explicitly type the aggregated operations array as `const batchOps: import("@nozbe/watermelondb").Model[] = []` before pushing different Model types into it to appease the TypeScript compiler.
