# Database Usage Analysis

## Current Usage Patterns

### From `pantryApi.ts`

**Stock Methods Used:**

- `databaseFacade.stock.count()` - Get count of stock items
- `databaseFacade.stock.findAll()` - Get all stock items
- `databaseFacade.stock.create(data)` - Create new stock item
- `databaseFacade.stock.createRaw(data)` - Create stock item in transaction
- `databaseFacade.stock.findById(id)` - Find stock by ID
- `databaseFacade.stock.update(id, data)` - Update stock item
- `databaseFacade.stock.delete(id)` - Delete stock item

**Ingredients Methods Used (NO LONGER EXISTS):**

- `databaseFacade.ingredients.findByName(name)` ❌ REMOVE
- `databaseFacade.ingredients.create(data)` ❌ REMOVE
- `databaseFacade.ingredients.createRaw(data)` ❌ REMOVE

### From `recipeApi.ts`

**Recipe Methods Used:**

- `databaseFacade.recipes.findAll()` - Get all recipes
- `databaseFacade.recipes.findById(id)` - Find recipe by ID
- `databaseFacade.recipes.searchRecipes(options)` - Search recipes
- `databaseFacade.recipes.createRecipeWithDetails(data)` - Create recipe
- `databaseFacade.recipes.delete(id)` - Delete recipe
- `databaseFacade.recipes.getRecipeWithDetails(id)` - Get recipe with steps & ingredients

### From `DatabaseFacade.ts` (Methods called by app)

**High-Level Methods:**

- `getAvailableRecipes()` - Get recipes user can make with current stock
- `getShoppingListForRecipe(recipeId)` - Get missing ingredients
- `convertUnits(unitSystem)` - Convert all stock units
- `getDatabaseStats()` - Get database statistics
- `searchEverything(searchTerm)` - Search all tables
- `clearAllData()` - Clear all data
- `exportAllData()` - Export all data
- `isHealthy()` - Health check

### From `seed.ts`

- `databaseFacade.ingredients.create()` ❌ REMOVE
- `databaseFacade.stock.create()`
- `databaseFacade.recipes.createRecipeWithDetails()`
- `databaseFacade.ingredients.findAll()` ❌ REMOVE
- `databaseFacade.stock.findAll()`
- `databaseFacade.recipes.findAll()`

---

## Proposed Simplified API

### Core Methods (Keep in DatabaseFacade)

#### Recipe Methods

```typescript
// Basic CRUD
async getAllRecipes(): Promise<Recipe[]>
async getRecipeById(id: string): Promise<Recipe | null>
async getRecipeWithDetails(id: string): Promise<RecipeWithDetails | null>
async searchRecipes(searchTerm: string, options?: SearchOptions): Promise<Recipe[]>
async createRecipe(data: RecipeData): Promise<Recipe>
async deleteRecipe(id: string): Promise<void>

// Favorite feature
async toggleFavorite(recipeId: string): Promise<Recipe | null>
async getFavoriteRecipes(): Promise<Recipe[]>

// High-level features
async getAvailableRecipes(): Promise<AvailableRecipesResult>
async getShoppingListForRecipe(recipeId: string): Promise<ShoppingList>
```

#### Stock (Pantry) Methods

```typescript
// Basic CRUD
async getAllStock(): Promise<Stock[]>
async getStockById(id: string): Promise<Stock | null>
async createStock(data: StockData): Promise<Stock>
async updateStock(id: string, data: Partial<StockData>): Promise<Stock | null>
async deleteStock(id: string): Promise<void>

// Utility
async getStockByIngredient(baseIngredientId: string): Promise<Stock[]>
async convertUnits(unitSystem: 'si' | 'imperial'): Promise<void>
```

#### Cooking History Methods (NEW)

```typescript
// Record cooking
async recordCooking(recipeId: string, data?: CookingData): Promise<CookingHistory>

// Query history
async getCookingHistory(limit?: number): Promise<CookingHistory[]>
async getRecentlyCookedRecipes(limit?: number): Promise<RecentRecipe[]>
async getMostCookedRecipes(limit?: number): Promise<PopularRecipe[]>
async getRecipeCookCount(recipeId: string): Promise<number>

// Update/delete
async updateCookingRecord(id: string, data: Partial<CookingData>): Promise<CookingHistory | null>
async deleteCookingRecord(id: string): Promise<void>
```

#### Utility Methods

```typescript
async getDatabaseStats(): Promise<DatabaseStats>
async clearAllData(): Promise<void>
async exportAllData(): Promise<ExportData>
async isHealthy(): Promise<boolean>
```

---

## Methods to REMOVE

### From Recipes

- ❌ `importRecipes()` - Unused
- ❌ `applySorting()` - Internal method, should be private
- ❌ `buildSearchQuery()` - Internal method, should be private

### From Stock

- ❌ `getAllCategories()` - No longer using categories locally
- ❌ `searchStock()` - Can be simplified to basic search in getAllStock
- ❌ `createRaw()` - Not needed externally, internal only

### From Ingredients (ENTIRE REPOSITORY)

- ❌ Entire `BaseIngredientRepository` - Removed, using cloud API

### From CookingHistory

- ❌ `getCookingStats()` - Can be computed from other methods if needed
- ❌ `getAverageRating()` - Can be computed from getCookingHistory

---

## Recommended Changes

### 1. Simplify DatabaseFacade API

Only expose simple, high-level methods that the app actually uses.

### 2. Hide Repository Details

Don't expose repositories directly (`databaseFacade.recipes`, `databaseFacade.stock`).
Instead, expose methods on DatabaseFacade itself.

### 3. Update pantryApi.ts

Remove all references to `databaseFacade.ingredients` since we removed that table.
When creating stock, just use the cloud `base_ingredient_id` directly.

### 4. Update seed.ts

Remove ingredient creation, use cloud-provided base_ingredient IDs.

### 5. Update exports

Only export `databaseFacade` singleton, not individual repositories.

---

## Next Steps

1. ✅ Create simplified DatabaseFacade with only needed methods
2. ✅ Remove unused repository methods
3. ✅ Update pantryApi.ts to not use ingredients
4. ✅ Update data/db/index.ts to only export databaseFacade
5. ✅ Update data/index.ts documentation
