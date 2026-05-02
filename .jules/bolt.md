## 2024-04-09 - N+1 Writing Bottleneck in WatermelonDB
**Learning:** Calling `await this.collection.create(...)` in a loop inside `database.write` is an N+1 query pattern that is doubly detrimental in WatermelonDB on React Native, as each creation crosses the JS/Native bridge sequentially.
**Action:** Always batch creations using `this.collection.prepareCreate(...)`, collect them into an array, and execute them concurrently via `await db.batch(...batchOps)`. When checking for existing items to avoid duplicates, use `Q.oneOf` to fetch them all beforehand rather than querying in the loop.

## 2024-04-10 - YOLO Array Allocation Bottleneck
**Learning:** In high-frequency operations like YOLO post-processing that run thousands of times per frame (e.g. 8400 iterations), using `const classScores = []` and `Math.max(...classScores)` causes massive array allocations and spread operator overhead, leading to severe garbage collection pressure and latency. Similarly, chaining `.map().filter()` creates unnecessary intermediate arrays.
**Action:** When iterating over raw tensor outputs, accumulate values using single-pass scalar variables (e.g. `let maxScore = 0`) instead of pushing to arrays. When filtering arrays, use a single `for` loop that conditionally pushes to a final array rather than chaining array methods.

## 2024-04-19 - Object.entries in Hot Paths
**Learning:** In highly repetitive data transformation functions (like `categorizeIngredient` used across grocery list generation), `Object.entries()` creates significant unnecessary overhead by allocating a new array of key-value pairs on every invocation.
**Action:** Extract static configuration objects into module-level arrays and pre-filter them. Then, use standard `for` loops (e.g., `for (let i = 0; i < arr.length; i++)`) rather than iterators (`for...of`) inside the hot path to eliminate allocation and garbage collection penalties completely.
## 2025-02-06 - Eliminate Closure Overhead in Nested Matching Loops
**Learning:** When converting \`Array.prototype.find()\` or similar array methods to a standard \`for\` loop to eliminate closure overhead in deeply nested paths, remember that accessing array elements by index (e.g., \`array[i]\`) can type as possibly \`undefined\` in strict TypeScript environments.
**Action:** Always include a truthiness check (e.g., \`if (item && ...)\`) before accessing element properties to prevent TS18048 errors during compilation checks.

## 2024-05-18 - Replacing O(N²) Arrays with O(N) Sets in Hot Paths
**Learning:** Checking for deletions by using `.some()` on an array inside a `for...of` loop creates an O(N²) bottleneck, particularly detrimental in React Native UI threads during save operations.
**Action:** When filtering or comparing two lists to find deleted/missing items, pre-compute a `Set` of the target IDs beforehand to turn the O(N²) check into an O(N) hash map lookup.
