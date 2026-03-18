## 2024-10-24 - [WatermelonDB Batch Processing Optimization]

**Learning:** Utilizing `for` loops combined with individual sequential fetches `collection.find(id)` and individual `.update()` / `.destroyPermanently()` actions inherently creates severe N+1 database querying and transactional bottlenecks when processing large data chunks in WatermelonDB repositories (e.g. `BaseRepository` and `UserChallengeRepository`).
**Action:** When updating or deleting many entities by IDs, always use `Q.where('id', Q.oneOf(ids))` to select entities simultaneously as a single query array, then loop via `.map()` applying `.prepareUpdate()` or `.prepareDestroyPermanently()`. Finally execute this mapped array via `await database.batch(...)`. This single transaction approach drastically minimizes main-thread blockage and SQLite load.

## 2025-02-12 - [WatermelonDB Lookup Optimization]
**Learning:** Calling `.getAchievements()` to fetch all records and sequentially traversing the array with `.find((a) => a.id === id)` creates an O(N) memory and compute bottleneck for simple lookups.
**Action:** Replace `fetch-all + .find()` operations with `repository.findById(id)` to utilize WatermelonDB's internal O(1) indexed lookups, significantly reducing overhead during frequent individual entity requests.
