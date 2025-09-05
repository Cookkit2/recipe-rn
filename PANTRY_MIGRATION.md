# Pantry Context Migration Guide

This document explains how to migrate from the old PantryContext database operations to the new React Query-based approach.

## 🚀 Quick Migration

### Before (Old PantryContext)

```tsx
import { usePantryStore } from '~/store/PantryContext';

function MyComponent() {
  const {
    filteredPantryItems,
    isLoading,
    error,
    refreshPantryItems,
    addPantryItem,
    updatePantryItem,
    deletePantryItem,
  } = usePantryStore();

  // Database operations
  const handleAdd = async () => {
    await addPantryItem(newItem);
  };

  const handleUpdate = async () => {
    await updatePantryItem(id, updates);
  };

  const handleDelete = async () => {
    await deletePantryItem(id);
  };

  const handleRefresh = async () => {
    await refreshPantryItems();
  };
}
```

### After (New React Query Hooks)

```tsx
import { usePantryStore } from '~/store/PantryContext'; // For UI state only
import {
  useAddPantryItem,
  useUpdatePantryItem,
  useDeletePantryItem,
  useRefreshPantryItems,
} from '~/hooks/usePantry';

function MyComponent() {
  // UI state (unchanged)
  const {
    filteredPantryItems, // Now comes from React Query
    isLoading,          // Now comes from React Query  
    error,              // Now comes from React Query
  } = usePantryStore();

  // Database operations (new React Query mutations)
  const addMutation = useAddPantryItem();
  const updateMutation = useUpdatePantryItem();
  const deleteMutation = useDeletePantryItem();
  const { refresh } = useRefreshPantryItems();

  const handleAdd = () => {
    addMutation.mutate(newItem);
  };

  const handleUpdate = () => {
    updateMutation.mutate({ id, updates });
  };

  const handleDelete = () => {
    deleteMutation.mutate(id);
  };

  const handleRefresh = () => {
    refresh();
  };

  // Access mutation states
  const isAdding = addMutation.isPending;
  const addError = addMutation.error;
}
```

## 📚 Available Hooks

### Data Fetching Hooks

- `usePantryItems()` - Get all pantry items
- `usePantryItemsByType(type)` - Get items filtered by type
- `useSearchPantryItems(query)` - Search items by name
- `useExpiringItems(days)` - Get items expiring within X days

### Mutation Hooks  

- `useAddPantryItem()` - Add new item
- `useUpdatePantryItem()` - Update existing item
- `useDeletePantryItem()` - Delete item
- `useRefreshPantryItems()` - Manual refresh

### Context Hook (UI State Only)

- `usePantryStore()` - Get UI state (selectedItemType, animations, etc.)

## 🔄 Migration Steps

1. **Replace database imports**:

   ```tsx
   // Remove old imports
   // const { addPantryItem } = usePantryStore();
   
   // Add new imports
   import { useAddPantryItem } from '~/hooks/usePantry';
   const addMutation = useAddPantryItem();
   ```

2. **Update function calls**:

   ```tsx
   // Old: await addPantryItem(item)
   // New: addMutation.mutate(item)
   ```

3. **Handle loading states**:

   ```tsx
   // Old: isLoading from context
   // New: addMutation.isPending, updateMutation.isPending, etc.
   ```

4. **Handle errors**:

   ```tsx
   // Old: error from context (string)
   // New: addMutation.error, updateMutation.error, etc. (Error objects)
   ```

## ✨ Benefits

- **Better Performance**: Automatic caching, background updates, deduplication
- **Offline Support**: Built-in offline/online state handling
- **Optimistic Updates**: UI updates before server confirmation
- **Error Handling**: Standardized error states and retry logic
- **Loading States**: Granular loading states per operation
- **Reusability**: Hooks can be used anywhere, not just in context children

## 🔧 Advanced Usage

### Custom Error Handling

```tsx
const addMutation = useAddPantryItem();

useEffect(() => {
  if (addMutation.error) {
    toast.error('Failed to add item: ' + addMutation.error.message);
  }
}, [addMutation.error]);
```

### Optimistic Updates

```tsx
const updateMutation = useUpdatePantryItem();

const handleOptimisticUpdate = (id: string, updates: Partial<PantryItem>) => {
  // Update UI immediately, rollback on error
  updateMutation.mutate(
    { id, updates },
    {
      onError: (error) => {
        // React Query automatically rolls back on error
        toast.error('Update failed: ' + error.message);
      },
    }
  );
};
```

### Manual Cache Management

```tsx
import { queryClient } from '~/store/QueryProvider';
import { pantryQueryKeys } from '~/hooks/usePantry';

// Invalidate specific queries
queryClient.invalidateQueries({
  queryKey: pantryQueryKeys.expiring(),
});

// Prefetch data
queryClient.prefetchQuery({
  queryKey: pantryQueryKeys.items(),
  queryFn: pantryApi.fetchAllPantryItems,
});
```
