# Database Restructuring TODO

## 📋 Overview

Restructuring local SQLite database from 9 tables to 6 tables with clearer separation between cloud-synced data and user-owned data.

---

## 🎯 Final Structure (6 Tables)

### Recipe Cache (3 tables)

1. ✅ `recipe` (was `recipes`)
2. ✅ `recipe_step` (was `recipe_steps`)
3. ✅ `recipe_ingredient` (was `recipe_ingredients`)

### Storage Instructions (1 table)

4. ✅ `steps_to_store` (kept, added `synced_at`)

### User Data (2 tables)

5. ✅ `stock` (no changes)
6. ✅ `cooking_history` (NEW)

### Removed Tables

- ❌ `base_ingredient`
- ❌ `ingredient_category`
- ❌ `ingredient_category_assignment`
- ❌ `users`

---

## 📝 Implementation Phases

### **Phase 1: Schema Update** ✅ COMPLETE

- [x] Update `schema.ts` to version 2
- [x] Rename: `recipes` → `recipe`
- [x] Rename: `recipe_steps` → `recipe_step`
- [x] Rename: `recipe_ingredients` → `recipe_ingredient`
- [x] Update `recipe` table: add `synced_at`, `is_favorite`
- [x] Update `steps_to_store` table: add `synced_at`
- [x] Add `cooking_history` table (NEW)
- [x] Remove: `base_ingredient`, `ingredient_category`, `ingredient_category_assignment`, `users`

### **Phase 2: Update Models** ✅ COMPLETE

- [x] Update `Recipe.ts` - add `syncedAt`, `isFavorite` fields
- [x] Update `RecipeStep.ts` - update table name and associations
- [x] Update `RecipeIngredient.ts` - update table name and associations
- [x] Update `StepsToStore.ts` - add `syncedAt` field, remove `base_ingredient` association
- [x] Keep `Stock.ts` as-is (no changes)
- [x] Create `CookingHistory.ts` model (NEW)
- [x] Delete: `BaseIngredient.ts`, `IngredientCategory.ts`, `IngredientCategoryAssignment.ts`, `User.ts`
- [x] Update `models/index.ts` - update exports

### **Phase 3: Update Repositories** ✅ COMPLETE

- [x] Update `RecipeRepository.ts`:
  - Update collection name to `recipe`
  - Add daily sync logic
  - Add favorite methods (`toggleFavorite`, `getFavorites`)
- [x] Keep `StockRepository.ts` as-is (collection name already `stock`)
- [x] Create `CookingHistoryRepository.ts` (NEW)
  - `recordCooking(recipeId, data)`
  - `getCookingHistory(limit?)`
  - `getRecentlyCookedRecipes(limit)`
  - `getMostCookedRecipes(limit)`
  - `getRecipeCookCount(recipeId)`
  - `updateCookingRecord(id, data)`
  - `deleteCookingRecord(id)`
- [x] Delete: `BaseIngredientRepository.ts`
- [x] Update `repositories/index.ts` - update exports
- [x] Update `DatabaseFacade.ts`:
  - Remove `ingredients` (BaseIngredientRepository)
  - Add `cookingHistory` (CookingHistoryRepository)
  - Update methods that referenced base_ingredient

### **Phase 4: Update Database Initialization**

- [ ] Update `database.ts` - update model list
- [ ] Update `init.ts` - remove base_ingredient initialization
- [ ] Update `seed.ts` - update for new schema (if needed)

### **Phase 5: UI Integration**

- [ ] Replace `RECIPE_COOKED_KEY` usage with cooking history:
  - `app/ingredient/(create)/create.tsx`
  - `store/RecipeStepsContext.tsx`
  - `components/Recipe/Details/BottomActionBar.tsx`
- [ ] Add "Record Cooking" flow:
  - After recipe completion
  - Photo capture capability
  - Rating input (1-5 stars)
  - Notes input
  - Servings made input
- [ ] Create "Recently Cooked" view
- [ ] Create "Cooking History" timeline view
- [ ] Add favorite button to recipe details
- [ ] Update recipe queries to show favorite status
- [ ] Storage instructions - fetch from local cache or cloud API

### **Phase 6: Cloud Integration Updates**

- [ ] Update Supabase queries to fetch base_ingredient when needed
- [ ] Implement daily recipe sync (background job)
- [ ] Implement on-demand storage steps sync
- [ ] Update ingredient autocomplete to use cloud API

### **Phase 7: Testing & Cleanup**

- [ ] Test all database operations
- [ ] Verify offline functionality
- [ ] Test cooking history features
- [ ] Test recipe favoriting
- [ ] Performance testing
- [ ] Clean up old code references

---

## 🔑 Key Changes Summary

### Added Fields

- `recipe.synced_at` - Track daily sync
- `recipe.is_favorite` - User can favorite recipes
- `steps_to_store.synced_at` - Track sync time

### New Table

- `cooking_history`:
  - Track when user cooks recipes
  - Store ratings, notes, photos
  - Enable "Recently Cooked", analytics

### Removed Dependencies

- No more local `base_ingredient` table
- Fetch ingredient details from cloud API when needed
- Simpler, cleaner schema

---

## 📅 Progress Tracking

**Started:** October 4, 2025
**Current Phase:** Phase 1 - Schema Update
**Status:** 🚧 In Progress

---

## 🎯 Goals

1. ✅ Store user's pantry items (`stock`)
2. ✅ Store recipes for fast loading (recipe cache)
3. ✅ Store cooking history (NEW feature)
4. ✅ Cleaner schema (6 tables instead of 9)
5. ✅ Clear data ownership (cloud vs local)
