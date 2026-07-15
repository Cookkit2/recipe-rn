## 2024-07-14 - Optimize Sequential Image Prefetching

**Learning:** When fetching multiple batches of resources where order doesn't matter (like prefetching images), awaiting them sequentially in a loop blocks the subsequent requests unnecessarily, severely impacting performance as batches increase.
**Action:** Use `Promise.all` to fire all batch requests concurrently when strict sequential execution isn't required.
