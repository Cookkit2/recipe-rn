## 2025-02-20 - N+1 Query Fix
**Learning:** React Native + WatermelonDB applications face heavy bridge crossing overhead when executing loop-based N+1 Promise queries, like calling \`databaseFacade.getRecipeWithDetails\` within a map block.
**Action:** Always refactor sequential fetching of database models to batch fetch calls (\`databaseFacade.getRecipesWithDetails\`) avoiding repeated inter-process context switches and speeding up data resolution.
