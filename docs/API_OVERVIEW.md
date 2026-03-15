# Internal API Overview

This document provides a high-level overview of the internal APIs used by the DoneDish app to abstract data and business logic away from React components.

## The API Layer (`data/api/`)
The `data/api/` folder contains service modules that orchestrate operations between the local `DatabaseFacade` (WatermelonDB), Supabase APIs, and external inputs. These modules manage business rules, caching logic, and error handling before data reaches the UI.

### 1. `pantryApi` (`data/api/pantryApi.ts`)
Handles operations related to the user's local inventory and ingredient tracking.
- **`fetchAllPantryItems()`**: Retrieves all stock items currently in the user's pantry.
- **`addPantryItem(data)`**: Creates a new inventory record.
- **`updatePantryItem(id, data)`**: Updates an existing item's quantity, expiry date, etc.
- **`deletePantryItem(id)`**: Removes an item from inventory.

### 2. `recipeApi` (`data/api/recipeApi.ts`)
Manages recipe data, syncing recipes from Supabase to the local DB, and handling recipe interactions.
- **`getAvailableRecipes()`**: Returns recipes that can be made with the user's current pantry stock, including completion percentages.
- **`syncRecipes()`**: Fetches updated recipes from Supabase and syncs them into the local WatermelonDB instance.
- **`getRecipeDetails(id)`**: Fetches a single recipe, including its steps and ingredients.
- **`toggleFavorite(id)`**: Toggles the favorite status for a recipe.

### 3. `mealPlanApi` (`data/api/mealPlanApi.ts`)
Orchestrates meal planning operations.
- **`addRecipeToMealPlan(data)`**: Schedules a recipe for a specific date or meal time.
- **`getMealPlanItems(startDate, endDate)`**: Retrieves planned meals for a given time range.
- **`generateGroceryList()`**: Aggregates ingredients required for a meal plan against current pantry stock.

### 4. `recipeImportApi` (`data/api/recipeImportApi.ts`)
Deals with importing and parsing recipes from external sources.
- **`importFromUrl(url)`**: Uses serverless/AI capabilities to parse a webpage or YouTube video into a structured `CreateRecipeData` format.

---

## Contract and Usage
- **Do not bypass the APIs**: Components should invoke these APIs via React Query hooks (e.g., `usePantryQueries.ts`, `useRecipeQueries.ts`) rather than calling the API files directly, and never call the `DatabaseFacade` directly from a component.
- **See also**: Review `docs/REPOSITORY_PATTERN.md` to understand how the API layer delegates tasks to the `DatabaseFacade`.
