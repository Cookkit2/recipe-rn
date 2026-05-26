## 2024-04-09 - N+1 Writing Bottleneck in WatermelonDB

**Learning:** Calling `await this.collection.create(...)` in a loop inside `database.write` is an N+1 query pattern that is doubly detrimental in WatermelonDB on React Native, as each creation crosses the JS/Native bridge sequentially.
**Action:** Always batch creations using `this.collection.prepareCreate(...)`, collect them into an array, and execute them concurrently via `await db.batch(...batchOps)`. When checking for existing items to avoid duplicates, use `Q.oneOf` to fetch them all beforehand rather than querying in the loop.

## 2024-04-10 - YOLO Array Allocation Bottleneck

**Learning:** In high-frequency operations like YOLO post-processing that run thousands of times per frame (e.g. 8400 iterations), using `const classScores = []` and `Math.max(...classScores)` causes massive array allocations and spread operator overhead, leading to severe garbage collection pressure and latency. Similarly, chaining `.map().filter()` creates unnecessary intermediate arrays.
**Action:** When iterating over raw tensor outputs, accumulate values using single-pass scalar variables (e.g. `let maxScore = 0`) instead of pushing to arrays. When filtering arrays, use a single `for` loop that conditionally pushes to a final array rather than chaining array methods.

## 2024-04-19 - Object.entries in Hot Paths

**Learning:** In highly repetitive data transformation functions (like `categorizeIngredient` used across grocery list generation), `Object.entries()` creates significant unnecessary overhead by allocating a new array of key-value pairs on every invocation.
**Action:** Extract static configuration objects into module-level arrays and pre-filter them. Then, use standard `for` loops (e.g., `for (let i = 0; i < arr.length; i++)`) rather than iterators (`for...of`) inside the hot path to eliminate allocation and garbage collection penalties completely.

## 2024-05-19 - Memory Filtering Bottleneck in WatermelonDB

**Learning:** Fetching all records from a table using `findAll()` and then applying JavaScript `.filter()` in-memory is highly inefficient in WatermelonDB, as it unnecessarily serializes, deserializes, and allocates thousands of unused objects across the React Native bridge.
**Action:** Always push filtering logic down to the native database layer using WatermelonDB query constraints (e.g., `Q.where("property", Q.lt(value))`) to only retrieve the specific models needed, significantly reducing memory footprint and processing latency.

## 2025-02-06 - Eliminate Closure Overhead in Nested Matching Loops

**Learning:** When converting `Array.prototype.find()` or similar array methods to a standard `for` loop to eliminate closure overhead in deeply nested paths, remember that accessing array elements by index (e.g., `array[i]`) can type as possibly `undefined` in strict TypeScript environments.
**Action:** Always include a truthiness check (e.g., `if (item && ...)`), before accessing element properties to prevent TS18048 errors during compilation checks.

## 2025-02-06 - Date Instantiation Bottleneck in Calendar Loops

**Learning:** Instantiating `new Date(dateString)` inside nested loops (like `Array.prototype.filter` or `.find` across an outer days loop) causes O(N*M) redundant object creations, which is computationally expensive for React Native date-grouped components.
**Action:** When mapping temporal data to calendar UI structures, perform a single O(N) pass to initialize a lookup Map keyed by a simple formatted string (e.g., `YYYY-MM-DD`). Then use O(1) Map lookups in the outer rendering loop to fetch the day's events, significantly reducing time complexity and allocation pressure.

## 2025-02-12 - Eliminate Array.find and Regex operations per item in lists

**Learning:** Calling `Array.prototype.find()` accompanied with `regex` operations in a `FlatList` component's child components (like `IngredientItem` nested in `IngredientsContent`) causes performance degradation due to O(N) lookup repeatedly executed per row.
**Action:** Lift the lookup operation up to the parent and pre-process the source list by generating an O(1) hash-map index (e.g., `useIngredientMatcher`). Pass the pre-processed `findMatch` method down to children to enable O(1) matching inside list items.

## 2025-02-12 - Eliminate Nested Array Mapping in Grocery List Hot Path

**Learning:** In `hooks/queries/useGroceryList.ts`, the loop allocating `pantryItem.synonyms?.map(...)` on every iteration of a doubly-nested loop mapping unmatched ingredients against pantry items causes massive array allocation penalties and GC pressure (e.g., thousands of times per generation).
**Action:** Lift the array transformation out of the inner loop, or modify the matching utility (`isIngredientMatch`) to accept the raw array of objects so mapping is completely avoided.

## 2024-05-20 - Eliminate N+1 and In-Memory Filtering in Sync Services

**Learning:** In `HouseholdSyncService` and `HouseholdRealtimeService`, using `.query().fetch()` to fetch all records and then calling `.filter()` or `.find()` in JS, especially inside loops, leads to severe N+1 memory allocation, redundant bridge crossing, and extreme GC pressure. Filtering by dates or syncing by comparing arrays shouldn't pull everything.
**Action:** Use native WatermelonDB queries like `Q.where("updated_at", Q.gt(lastSync))` to filter DB-side. When matching remote items to local items in a loop, fetch only the required IDs using `Q.where("supabase_id", Q.oneOf(remoteIds))` outside the loop, build a Map, and perform O(1) lookups inside the `database.write` batch block.
