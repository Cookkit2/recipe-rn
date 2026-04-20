## 2024-04-09 - N+1 Writing Bottleneck in WatermelonDB
**Learning:** Calling `await this.collection.create(...)` in a loop inside `database.write` is an N+1 query pattern that is doubly detrimental in WatermelonDB on React Native, as each creation crosses the JS/Native bridge sequentially.
**Action:** Always batch creations using `this.collection.prepareCreate(...)`, collect them into an array, and execute them concurrently via `await db.batch(...batchOps)`. When checking for existing items to avoid duplicates, use `Q.oneOf` to fetch them all beforehand rather than querying in the loop.

## 2024-04-10 - YOLO Array Allocation Bottleneck
**Learning:** In high-frequency operations like YOLO post-processing that run thousands of times per frame (e.g. 8400 iterations), using `const classScores = []` and `Math.max(...classScores)` causes massive array allocations and spread operator overhead, leading to severe garbage collection pressure and latency. Similarly, chaining `.map().filter()` creates unnecessary intermediate arrays.
**Action:** When iterating over raw tensor outputs, accumulate values using single-pass scalar variables (e.g. `let maxScore = 0`) instead of pushing to arrays. When filtering arrays, use a single `for` loop that conditionally pushes to a final array rather than chaining array methods.
## 2024-04-20 - Chained Array Methods Allocation Overhead\n**Learning:** In repository fetch methods, chaining  on arrays containing results from database queries creates multiple unnecessary intermediate arrays, adding overhead.\n**Action:** Combine chained array iterations into a single  loop pass that checks all conditions simultaneously, pushing valid items to a pre-allocated array instead.

## 2024-04-20 - Chained Array Methods Allocation Overhead
**Learning:** In repository fetch methods, chaining `.filter()` on arrays containing results from database queries creates multiple unnecessary intermediate arrays, adding overhead.
**Action:** Combine chained array iterations into a single `for` loop pass that checks all conditions simultaneously, pushing valid items to a pre-allocated array instead.
