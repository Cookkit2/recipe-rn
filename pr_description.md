💡 **What:**
Created a new optimized `getStocksByNamesOrSynonyms` method in `StockRepository.ts` that takes an array of ingredient names and queries the database for all matching stocks or synonyms in a single batch (2 queries). Updated `DatabaseFacade.getShoppingListForRecipe` to gather all ingredient names and use this new method, eliminating iterative queries in the `for` loop.

🎯 **Why:**
Previously, `getShoppingListForRecipe` iterated over each recipe ingredient and independently awaited `this.stocks.findByNameOrSynonym()`. For a recipe with 50 ingredients, this resulted in 50 concurrent or sequential database queries (the N+1 query problem). Consolidating this significantly reduces I/O delays and bridge overhead in React Native.

📊 **Measured Improvement:**
Using an artificial db-latency benchmark (`DatabaseFacade-perf.test.ts`), measuring a 50-ingredient recipe against a 500-item pantry:
- Baseline (N+1 queries): ~124ms
- Optimized (2 batched queries): ~8ms
- Improvement: ~93.5% reduction in execution time.
