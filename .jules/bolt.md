## 2024-05-30 - Minimizing DB Transaction Lock Time in WatermelonDB
**Learning:** Fetching relational data (`.fetch()`) inside a `database.write()` transaction increases the overall lock duration, blocking concurrent operations unnecessarily.
**Action:** When updating or synchronizing graphs of data, perform asynchronous queries and `prepareUpdate/Create/Destroy` generation outside of the `database.write()` block. Pass the array of prepared models directly into a single `database.batch()` operation inside the lock to minimize blocking time.
