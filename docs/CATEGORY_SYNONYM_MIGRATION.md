# Category and Synonym Migration

## 📋 Overview

Migrated from storing categories and synonyms as JSON arrays in the `stock` table to separate normalized tables for better query performance and offline recipe matching.

**Date:** October 5, 2025  
**Schema Version:** 1 → 2

---

## 🎯 Changes Made

### **Database Schema Updates**

#### New Tables Added (3)

1. **`ingredient_category`**
   - Stores all available ingredient categories
   - Fields: `id`, `name`, `synced_at`, `created_at`, `updated_at`
   - Synced from Supabase for offline access

2. **`ingredient_synonym`**
   - Stores alternative names for stock items
   - Fields: `id`, `stock_id`, `synonym`, `created_at`, `updated_at`
   - Indexed on `stock_id` and `synonym` for fast matching

3. **`stock_category`**
   - Pivot table linking stock items to categories
   - Fields: `id`, `stock_id`, `category_id`, `created_at`, `updated_at`
   - Many-to-many relationship

#### Stock Table Updates

**Removed Fields:**

- ❌ `category` (JSON array) - moved to `stock_category` table
- ❌ `synonym` (JSON array) - moved to `ingredient_synonym` table

**Kept Fields:**

- ✅ `name`, `quantity`, `unit`, `expiry_date`, `storage_type`
- ✅ `image_url`, `background_color`, `x`, `y`, `scale`
- ✅ `created_at`, `updated_at`

---

## 🗂️ New Models

### IngredientCategory Model

```typescript
export default class IngredientCategory extends Model {
  @field("name") name!: string;
  @field("synced_at") syncedAt!: number;
  @children("stock_category") stockCategories!: Collection<StockCategory>;
}
```

### IngredientSynonym Model

```typescript
export default class IngredientSynonym extends Model {
  @field("stock_id") stockId!: string;
  @field("synonym") synonym!: string;
  @relation("stock", "stock_id") stock!: Stock;
}
```

### StockCategory Model

```typescript
export default class StockCategory extends Model {
  @field("stock_id") stockId!: string;
  @field("category_id") categoryId!: string;
  @relation("stock", "stock_id") stock!: Stock;
  @relation("ingredient_category", "category_id") category!: IngredientCategory;
}
```

### Updated Stock Model

```typescript
export default class Stock extends Model {
  // ... existing fields ...
  @children("ingredient_synonym") synonyms!: Collection<IngredientSynonym>;
  @children("stock_category") stockCategories!: Collection<StockCategory>;
}
```

---

## 📚 New Repository Methods

### IngredientCategoryRepository

- `findByName(name)` - Find category by name
- `getOrCreate(name)` - Get existing or create new category
- `searchCategories(options)` - Search with filters
- `getAllCategoryNames()` - Get all category names
- `syncFromSupabase(categories)` - Sync from Supabase

### IngredientSynonymRepository

- `findByStockId(stockId)` - Get all synonyms for a stock
- `findStockIdsBySynonym(synonym)` - Find stocks by synonym (for matching)
- `findExactMatch(synonym)` - Find exact synonym matches
- `addSynonym(stockId, synonym)` - Add synonym to stock
- `addSynonymsToStock(stockId, synonyms)` - Batch add synonyms
- `removeAllForStock(stockId)` - Remove all synonyms for stock
- `getAllUniqueSynonyms()` - Get all unique synonyms

### StockCategoryRepository

- `findByStockId(stockId)` - Get categories for stock
- `findByCategoryId(categoryId)` - Get stocks in category
- `findStockIdsByCategoryId(categoryId)` - Get stock IDs by category
- `addCategoryToStock(stockId, categoryId)` - Link category to stock
- `addCategoriesToStock(stockId, categoryIds)` - Batch add categories
- `removeAllForStock(stockId)` - Remove all categories for stock
- `replaceCategories(stockId, categoryIds)` - Replace all categories
- `hasCategory(stockId, categoryId)` - Check if stock has category

### Updated StockRepository

- `getStockByCategory(categoryId)` - Get stocks by category
- `getStockBySynonym(synonym)` - Get stocks by synonym (for matching)
- `findByNameOrSynonym(name)` - Find stock by name or synonym
- `isIngredientInStock(ingredientName, minQty)` - Check availability by name/synonym
- `createStockWithMetadata(data, { categoryIds, synonyms })` - Create with categories/synonyms
- `getStockWithCategories(stockId)` - Get stock with its categories
- `getStockWithSynonyms(stockId)` - Get stock with its synonyms

---

## 🔍 Why This Change?

### **Before (JSON Arrays)**

```typescript
// Stock table
{
  name: "Tomato",
  category: '["vegetable", "nightshade"]',  // JSON string
  synonym: '["roma tomato", "plum tomato"]' // JSON string
}
```

**Problems:**

- ❌ Can't query "all stocks in category 'vegetable'"
- ❌ Can't use SQL indexes on JSON contents
- ❌ Must load ALL stocks and loop in JavaScript
- ❌ Inefficient for recipe matching
- ❌ Slow for large datasets

### **After (Normalized Tables)**

```typescript
// Stock
{ id: "1", name: "Tomato" }

// IngredientSynonym
{ stock_id: "1", synonym: "roma tomato" }
{ stock_id: "1", synonym: "plum tomato" }

// StockCategory
{ stock_id: "1", category_id: "cat1" }
{ stock_id: "1", category_id: "cat2" }

// IngredientCategory
{ id: "cat1", name: "vegetable" }
{ id: "cat2", name: "nightshade" }
```

**Benefits:**

- ✅ Fast indexed queries: `WHERE synonym = 'roma tomato'`
- ✅ Efficient category filtering: `WHERE category_id = 'cat1'`
- ✅ Reusable category definitions
- ✅ Better for recipe matching (offline)
- ✅ Scalable for large datasets

---

## 🚀 Recipe Matching Example

### Matching Ingredients to Stock (Offline)

```typescript
// Recipe needs "roma tomatoes"
const recipIngredient = "roma tomatoes";

// OLD WAY (JSON) - Had to loop through all stocks
const allStocks = await stockRepo.findAll();
const match = allStocks.find(stock => {
  const synonyms = JSON.parse(stock.synonym || '[]');
  return synonyms.includes(recipIngredient.toLowerCase());
});

// NEW WAY (Indexed) - Direct SQL query
const stocks = await stockRepo.getStockBySynonym("roma tomatoes");
// Fast! Uses index on ingredient_synonym.synonym
```

---

## 📋 Migration Checklist

### Completed ✅

- [x] Update schema to version 2
- [x] Add 3 new tables to schema
- [x] Remove category/synonym fields from stock table
- [x] Create IngredientCategory model
- [x] Create IngredientSynonym model
- [x] Create StockCategory model
- [x] Update Stock model (remove fields, add relations)
- [x] Create IngredientCategoryRepository
- [x] Create IngredientSynonymRepository
- [x] Create StockCategoryRepository
- [x] Update StockRepository with new methods
- [x] Update model exports
- [x] Update repository exports

### TODO 📝

- [ ] Update DatabaseFacade to use new repositories
- [ ] Create migration script to convert existing data
- [ ] Sync categories from Supabase
- [ ] Update UI to use new repository methods
- [ ] Update seed data
- [ ] Test recipe matching with synonyms
- [ ] Test category filtering
- [ ] Performance testing

---

## 🔧 Usage Examples

### Adding Stock with Categories and Synonyms

```typescript
const stock = await stockRepo.createStockWithMetadata(
  {
    name: "Tomato",
    quantity: 5,
    unit: "pieces",
    storageType: "fridge"
  },
  {
    categoryIds: ["vegetable-id", "nightshade-id"],
    synonyms: ["roma tomato", "plum tomato", "fresh tomatoes"]
  }
);
```

### Finding Stock for Recipe Matching

```typescript
// Recipe calls for "plum tomato"
const stocks = await stockRepo.findByNameOrSynonym("plum tomato");
// Returns stock with name "Tomato" because it has synonym "plum tomato"

// Check if ingredient is in stock
const hasIt = await stockRepo.isIngredientInStock("roma tomatoes", 2);
// true if we have at least 2 tomatoes
```

### Getting Stocks by Category

```typescript
// Get all vegetables
const veggies = await stockRepo.getStockByCategory("vegetable-id");

// Get category info with stocks
const { stock, categories } = await stockRepo.getStockWithCategories(stockId);
```

### Managing Synonyms

```typescript
// Add synonyms to existing stock
await synonymRepo.addSynonymsToStock(stockId, [
  "cherry tomato",
  "grape tomato"
]);

// Find all synonyms for a stock
const synonyms = await synonymRepo.findByStockId(stockId);

// Search for stocks by synonym
const stockIds = await synonymRepo.findStockIdsBySynonym("cherry tomato");
```

---

## 🎯 Benefits for Recipe Recommendations

1. **Fast Offline Matching**: Query synonyms directly without loading all stocks
2. **Category-Based Suggestions**: "You have vegetables, here are veggie recipes"
3. **Smart Substitutions**: Match recipe ingredients to stock synonyms
4. **Scalable**: Works well with 100s of stock items
5. **Flexible**: Easy to add new synonyms/categories without schema changes

---

## 📊 Performance Comparison

| Operation | Before (JSON) | After (Normalized) |
|-----------|--------------|-------------------|
| Find by synonym | O(n) - scan all | O(log n) - index lookup |
| Get by category | O(n) - scan all | O(log n) - index lookup |
| Add synonym | Update stock record | Insert synonym row |
| Storage | More compact | Slightly more rows |
| Query flexibility | Limited | High |

---

## 🔗 Related Files

- **Schema**: `/data/db/schema.ts`
- **Models**: `/data/db/models/*.ts`
- **Repositories**: `/data/db/repositories/*.ts`
- **Documentation**: This file

---

**Next Steps**: Update DatabaseFacade and create data migration script.
