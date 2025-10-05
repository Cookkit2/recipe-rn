# Database Refactoring Plan - Simplified API

## Summary

Based on analyzing the entire codebase, I've identified exactly which database methods are actually used and created a refactored DatabaseFacade that:

1. Only exposes needed methods
2. Hides repository implementation details  
3. Provides a clean, simple API surface

## Current Issues Found

### ❌ Breaking Code

1. **pantryApi.ts** - References removed `databaseFacade.ingredients` repository:
   - Lines 55, 60: `databaseFacade.ingredients.findByName()` and `.create()`
   - Lines 135, 140: `databaseFacade.ingredients.createRaw()`
   - **Solution**: Remove these calls, use cloud API for ingredient lookup

2. **seed.ts** - References removed ingredients repository:
   - Lines 145, 255: `databaseFacade.ingredients.create()`
   - Line 335: `databaseFacade.ingredients.findAll()`
   - **Solution**: Update seed to use cloud-provided base_ingredient_ids

3. **RecipeRepository.ts** - Incorrect collection names:
   - Line 490: `recipe_steps` (should be `recipe_step`)
   - Line 499: `recipe_ingredients` (should be `recipe_ingredient`)

## Methods Actually Used in App

### From `databaseFacade` Direct Methods

- ✅ `isHealthy()`
- ✅ `clearAllData()`
- ✅ `getDatabaseStats()`
- ✅ `getAvailableRecipes()`
- ✅ `getShoppingListForRecipe(recipeId)`

### From `databaseFacade.stock`

- ✅ `count()`
- ✅ `findAll()`
- ✅ `create(data)`
- ✅ `findById(id)`
- ✅ `update(id, data)`
- ✅ `delete(id)`
- ❓ `getStockByIngredient(baseIngredientId)` - used internally by facade
- ❓ `searchStock(options)` - used internally by facade

### From `databaseFacade.recipes`

- ✅ `findAll()`
- ✅ `findById(id)`
- ✅ `searchRecipes(options)`
- ✅ `createRecipeWithDetails(data)`
- ✅ `delete(id)`
- ✅ `getRecipeWithDetails(id)`
- ❓ `clearAllRecipes()` - used in debug.tsx only
- ❓ `initialize()` - used internally by facade
- ❌ `toggleFavorite(id)` - not currently used but needed for favorites feature

### From `databaseFacade.cookingHistory`

- Currently NOT used in the app yet (new feature)
- Will need: `recordCooking()`, `getCookingHistory()`, `getRecentlyCookedRecipes()`

## Recommended New API

### Public Interface (DatabaseFacade)

```typescript
// Recipe Methods
getAllRecipes(): Promise<Recipe[]>
getRecipeById(id): Promise<Recipe | null>
getRecipeWithDetails(id): Promise<RecipeWithDetails | null>
searchRecipes(searchTerm?, options?): Promise<Recipe[]>
createRecipe(data): Promise<Recipe>
deleteRecipe(id): Promise<void>
toggleFavorite(recipeId): Promise<Recipe | null>
getFavoriteRecipes(): Promise<Recipe[]>

// Stock Methods
getAllStock(): Promise<Stock[]>
getStockCount(): Promise<number>
getStockById(id): Promise<Stock | null>
getStockByIngredient(baseIngredientId): Promise<Stock[]>
createStock(data): Promise<Stock>
updateStock(id, data): Promise<Stock | null>
deleteStock(id): Promise<void>
searchStock(searchTerm?, options?): Promise<Stock[]>
convertUnits(toUnitSystem): Promise<void>

// Cooking History Methods
recordCooking(recipeId, data?): Promise<CookingHistory>
getCookingHistory(limit?): Promise<CookingHistory[]>
getRecentlyCookedRecipes(limit?): Promise<RecentRecipe[]>
getMostCookedRecipes(limit?): Promise<PopularRecipe[]>
getRecipeCookCount(recipeId): Promise<number>
updateCookingRecord(id, data): Promise<CookingHistory | null>
deleteCookingRecord(id): Promise<void>

// Utility Methods
getAvailableRecipes(): Promise<AvailableRecipesResult>
getShoppingListForRecipe(recipeId): Promise<ShoppingListResult>
getDatabaseStats(): Promise<DatabaseStats>
clearAllData(): Promise<void>
exportAllData(): Promise<ExportData>
isHealthy(): Promise<boolean>
```

## Implementation Steps

### Step 1: Fix Breaking Code ✅ PRIORITY

1. Update `pantryApi.ts` to remove ingredients repository references
2. Update `seed.ts` to use cloud-provided ingredient IDs
3. Fix collection names in RecipeRepository.ts

### Step 2: Replace DatabaseFacade ✅

1. Backup current DatabaseFacade.ts
2. Replace with new simplified version
3. Make repositories private (`_recipes`, `_stock`, `_cookingHistory`)
4. Add wrapper methods for all needed operations

### Step 3: Update Exports ✅

1. Update `/data/db/index.ts` to ONLY export:
   - `databaseFacade` singleton
   - Types (Recipe, Stock, CookingHistory, etc.)
   - Remove repository exports
2. Update `/data/index.ts` documentation

### Step 4: Update Callers

1. Update `pantryApi.ts`: change `databaseFacade.stock.x()` → `databaseFacade.x()`
2. Update `recipeApi.ts`: change `databaseFacade.recipes.x()` → `databaseFacade.x()`
3. Update `debug.tsx`, `seed.ts`, `init.ts`

### Step 5: Test

1. Verify app compiles
2. Test basic CRUD operations
3. Test recipe search/filtering
4. Test stock management
5. Verify no broken imports

## Migration Guide

### Before (OLD API)

```typescript
// Direct repository access
const recipes = await databaseFacade.recipes.findAll();
await databaseFacade.stock.create(data);
const recipe = await databaseFacade.recipes.getRecipeWithDetails(id);
```

### After (NEW API)

```typescript
// Simplified facade methods
const recipes = await databaseFacade.getAllRecipes();
await databaseFacade.createStock(data);
const recipe = await databaseFacade.getRecipeWithDetails(id);
```

## Benefits

1. **Simpler API** - Less cognitive load, clear method names
2. **Better Encapsulation** - Implementation details hidden
3. **Easier to Change** - Can swap repository implementation without affecting callers
4. **Type Safety** - Clear interfaces for all operations
5. **Better Documentation** - Single source of truth for database operations
6. **Prevents Misuse** - Can't accidentally call internal repository methods

## Notes

- Keep `getDatabase()` for advanced use cases (migrations, raw queries)
- Console statements are linting errors but acceptable for database operations
- Some type issues to fix (UpdateStockData, cooking history interfaces)
- Need to add proper JSDoc comments to all public methods
