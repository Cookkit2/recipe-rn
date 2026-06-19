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
## 2026-06-07 - [Avoid adding non-compatible native dependencies for benchmarks]
**Learning:** Adding 'better-sqlite3' to a React Native/Expo project for the sole purpose of running a local benchmark script can pollute the project and cause compilation failures.
**Action:** Mock necessary classes and dependencies rather than adding new native modules to the project.

## 2024-05-19 - Memory Filtering Bottleneck in WatermelonDB ChallengeRepository

**Learning:** When fetching active, expired, or upcoming challenges, fetching all records from the table using `.query().fetch()` and then applying JavaScript `.filter()` in-memory is highly inefficient in WatermelonDB, as it unnecessarily serializes, deserializes, and allocates thousands of unused objects across the React Native bridge.
**Action:** Always push filtering logic down to the native database layer using WatermelonDB query constraints (e.g., `Q.where("start_date", Q.lte(now))`) to only retrieve the specific models needed, significantly reducing memory footprint and processing latency.
## 2024-05-18 - Avoid Client-Side `.find()` After Full DB Fetch
**Learning:** In WatermelonDB services (like `HouseholdRealtimeService` or `HouseholdSyncService`), it is an anti-pattern to call `collection.query().fetch()` to load the entire table into memory and then use JavaScript's `array.find()` to locate a specific record by `supabaseId`. This causes a full table scan in SQLite and loads massive arrays into the JS thread.
**Action:** Use targeted database queries directly via `Q.where("column_name", value)` to delegate filtering to the native SQLite layer, or build a `Map` if processing batches in loops to avoid N+1 queries.
## 2024-06-20 - Batch Database Queries Inside Loop Iteration Bottleneck
**Learning:** Sequential WatermelonDB fetch queries within a loop (such as iterating over mappings to find associated steps and ingredients) significantly downgrade UI performance even if errors bypass the loop condition, blocking the JS thread for 50-100ms.
**Action:** When finding multiple relational entities inside a loop, always extract the database query outside the loop, use `Q.where('id', Q.oneOf(ids))` to perform a single batched fetch, construct in-memory Maps keyed by foreign IDs, and iterate over the local maps for O(1) retrieval.
## 2026-06-19 - Optimize O(N^2) array lookup in tailored recipe mapping repository
**Learning:** Converting an array to a Map outside a loop reduces inner lookups from O(N) to O(1), improving overall time complexity from O(N^2) to O(N). This is critical when iterating over large arrays inside database repository methods.
**Action:** Use a Map to cache items before looping when multiple lookups are required.

## 2026-06-17 - Optimize Array Reductions in Loops
**Learning:** Repeated calls to `Array.prototype.reduce()` allocating closure functions inside loops or mapping over arrays dynamically can cause noticeable performance overhead, allocating unnecessary intermediate garbage and causing excessive GC cycles. This is particularly problematic in computationally intensive contexts like nutrition calculations where numbers are aggregated across multiple recipes and items.
**Action:** When computing sums across lists (especially inside other render layers or data-heavy loops), replace multiple `Array.prototype.reduce()` calls with a single standard `for` loop that aggregates multiple scalar properties simultaneously. This eliminates closure allocations and dramatically reduces both memory allocations and total time complexity by traversing the array only once.
## 2026-06-14 - Optimize Sequential Upload Latency
**Learning:** Performing network uploads inside a `for...of` loop with `await` introduces significant latency due to sequential processing of I/O operations.
**Action:** When performing independent network uploads in a loop, always use `input.map(async () => ...)` to generate promises, and resolve them concurrently with `await Promise.all(...)`. Combining this with bulk inserting database records afterwards prevents N+1 queries.
## 2025-02-12 - Eliminate Array.filter and Array.find for DB Queries in Loops

**Learning:** When fetching records in API files like `householdApi.ts`, fetching an entire collection via `.query().fetch()` and then filtering them using JavaScript `Array.prototype.find()` or `.filter()` by `userId` or `householdId` requires excessive serialization over the bridge, loads enormous arrays into JS memory, and bypasses native SQLite querying optimizations.
**Action:** Always delegate filtering to the native SQLite layer using WatermelonDB query constraints `Q.where("column_name", value)` to retrieve only the specific records needed. Instead of accessing the array via index 0 (`members[0]`), fetch only specific components or records needed, avoiding N+1 querying.

## 2025-02-12 - Re-evaluating optimizations and dealing with overlaps

**Learning:** When addressing bottlenecks, occasionally those optimizations may already be partially or fully addressed by parallel feature/refactoring PRs (e.g., `#699`).
**Action:** When a PR comment indicates an overlap with an already merged PR, always cleanly rebase/merge the master branch, identify any remaining distinct optimizations that weren't covered, and implement *only* those to prevent merge conflicts.
