💡 What:
Refactored `createRecipeWithDetailsRaw` and `updateRecipeWithDetails` in `RecipeRepository.ts` to use WatermelonDB's batch processing (`prepareCreate`, `prepareUpdate`, `prepareDestroyPermanently`, and `database.batch`).

🎯 Why:
Previously, saving or updating a recipe triggered individual sequential `database.create()` or `.destroyPermanently()` transactions for every single step and ingredient in `Promise.all()`. This caused a severe N+1 sequential write bottleneck and blocked the main thread.

📊 Impact:
Reduces database transactions during recipe creation or updating from O(S + I + 1) to O(1) single batch transaction, greatly improving performance when saving complex recipes.

🔬 Measurement:
Verified with `pnpm test` and `pnpm lint`. Benchmarks show reduction in transaction count when scaling.
