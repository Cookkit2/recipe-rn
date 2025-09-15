# Recipe Context Restructuring - Migration Guide

## Overview

The recipe context has been restructured to separate concerns and provide better performance, caching, and developer experience. Database operations are now handled by React Query hooks, while the context only manages UI state.

## Before vs After

### Before (Old Pattern)

```tsx
// All operations were mixed in context
const { 
  allRecipes, 
  isLoading, 
  error,
  addRecipe, 
  updateRecipe, 
  deleteRecipe,
  searchRecipes,
  getRecipeById,
  getAvailableRecipes,
  getShoppingListForRecipe,
  selectedRecipeTags,
  updateRecipeTag 
} = useRecipeStore();
```

### After (New Pattern)

```tsx
// Context only for UI state
const { selectedRecipeTags, updateRecipeTag, filteredRecipes } = useRecipeStore();

// Individual React Query hooks for data operations
const { data: recipes, isLoading, error } = useRecipes();
const { data: recipe } = useRecipe(recipeId);
const { data: searchResults } = useSearchRecipes(searchTerm, filters);
const { data: availableRecipes } = useAvailableRecipes();
const { data: shoppingList } = useShoppingList(recipeId);

// Mutation hooks
const addRecipeMutation = useAddRecipe();
const updateRecipeMutation = useUpdateRecipe();
const deleteRecipeMutation = useDeleteRecipe();
```

## Migration Examples

### 1. Loading All Recipes

```tsx
// Before
const { allRecipes, isLoading, error } = useRecipeStore();

// After
const { data: allRecipes = [], isLoading, error } = useRecipes();
```

### 2. Adding a Recipe

```tsx
// Before
const { addRecipe } = useRecipeStore();
await addRecipe(newRecipe);

// After
const addRecipeMutation = useAddRecipe();
addRecipeMutation.mutate(newRecipe, {
  onSuccess: () => {
    // Handle success
  },
  onError: (error) => {
    // Handle error
  }
});
```

### 3. Updating a Recipe

```tsx
// Before
const { updateRecipe } = useRecipeStore();
await updateRecipe(recipeId, updates);

// After
const updateRecipeMutation = useUpdateRecipe();
updateRecipeMutation.mutate({ id: recipeId, updates }, {
  onSuccess: () => {
    // Handle success
  }
});
```

### 4. Searching Recipes

```tsx
// Before
const { searchRecipes } = useRecipeStore();
const results = await searchRecipes(searchTerm, filters);

// After
const { data: searchResults, isLoading } = useSearchRecipes(searchTerm, filters);
```

### 5. Getting Available Recipes

```tsx
// Before
const { getAvailableRecipes } = useRecipeStore();
const available = await getAvailableRecipes();

// After
const { data: availableRecipes, isLoading } = useAvailableRecipes();
```

## Benefits

### 1. **Better Performance**

- Automatic caching with React Query
- Background refetching
- Stale-while-revalidate strategy
- Optimistic updates

### 2. **Better Developer Experience**

- Individual hooks for specific operations
- Better TypeScript support
- Consistent loading and error states
- No need to manually manage loading/error states

### 3. **Better Architecture**

- Separation of concerns
- Database operations separate from UI state
- Consistent pattern with pantry implementation
- Easier to test and maintain

### 4. **Advanced Features**

- Automatic cache invalidation
- Query deduplication
- Retry on failure
- Offline support (configurable)

## Available Hooks

### Query Hooks

- `useRecipes()` - Get all recipes
- `useRecipe(id)` - Get single recipe by ID
- `useSearchRecipes(searchTerm, filters)` - Search recipes
- `useAvailableRecipes()` - Get recipes that can be made with current pantry
- `useShoppingList(recipeId)` - Get shopping list for a recipe

### Mutation Hooks

- `useAddRecipe()` - Add new recipe
- `useUpdateRecipe()` - Update existing recipe
- `useDeleteRecipe()` - Delete recipe

### Utility Hooks

- `useRefreshRecipes()` - Manually refresh all recipe data
- `useRecipeStore()` - UI state (tags, filtering)

## Complete Component Example

```tsx
import React from 'react';
import { 
  useRecipes, 
  useAddRecipe, 
  useDeleteRecipe 
} from '~/hooks/queries/useRecipeQueries';
import { useRecipeStore } from '~/store/RecipeContext';

export function RecipeList() {
  // Data hooks
  const { data: recipes = [], isLoading, error } = useRecipes();
  const addRecipeMutation = useAddRecipe();
  const deleteRecipeMutation = useDeleteRecipe();
  
  // UI state hooks
  const { selectedRecipeTags, filteredRecipes } = useRecipeStore();

  const handleAddRecipe = (recipe: Omit<Recipe, 'id'>) => {
    addRecipeMutation.mutate(recipe, {
      onSuccess: () => {
        // Recipe automatically added to cache
        console.log('Recipe added successfully!');
      },
      onError: (error) => {
        console.error('Failed to add recipe:', error);
      }
    });
  };

  const handleDeleteRecipe = (id: string) => {
    deleteRecipeMutation.mutate(id, {
      onSuccess: () => {
        // Recipe automatically removed from cache
        console.log('Recipe deleted successfully!');
      }
    });
  };

  if (isLoading) return <div>Loading recipes...</div>;
  if (error) return <div>Error: {error}</div>;

  const recipesToShow = selectedRecipeTags.length > 0 ? filteredRecipes : recipes;

  return (
    <div>
      {recipesToShow.map(recipe => (
        <div key={recipe.id}>
          <h3>{recipe.title}</h3>
          <button 
            onClick={() => handleDeleteRecipe(recipe.id)}
            disabled={deleteRecipeMutation.isPending}
          >
            {deleteRecipeMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Files Changed

1. **Created**: `hooks/api/recipeApi.ts` - Pure API functions
2. **Created**: `hooks/queries/recipeQueryKeys.ts` - Query key management  
3. **Created**: `hooks/queries/useRecipeQueries.ts` - React Query hooks
4. **Modified**: `store/RecipeContext.tsx` - Simplified to UI state only

## Next Steps

1. Update components to use the new hooks
2. Remove any direct database calls in components
3. Take advantage of React Query features like optimistic updates
4. Consider adding more specific hooks for complex operations
