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
## 2026-05-15 - Prevent React Native Hook Bottlenecks in FlatLists
**Learning:** Calling hooks that subscribe to global stores or execute data queries (like `usePantryItemsByType`) inside child components iteratively rendered by a `FlatList` creates a severe performance bottleneck with redundant hook executions and state subscriptions for every list item.
**Action:** Hoist these expensive hooks to the parent component level. If the child components require specific matched data from those hooks, use an O(1) index lookup (like `useIngredientMatcher`) in the parent and pass the resulting matched data down as standard React props.
