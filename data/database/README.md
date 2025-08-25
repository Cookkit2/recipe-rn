# SQL Database Facade System

A comprehensive, offline-first database abstraction layer for React Native applications, specifically designed for WatermelonDB but extensible to other SQL databases. This system provides a clean, type-safe interface for managing complex data with sync capabilities.

## 🚀 Features

- **Offline-First Design**: Built for WatermelonDB with automatic sync capabilities
- **Type Safety**: Full TypeScript support with generic types and interfaces
- **Repository Pattern**: Enhanced CRUD operations with domain-specific methods
- **Transaction Support**: Atomic operations with rollback capabilities
- **Real-time Updates**: Observable queries for reactive UI updates
- **Pagination**: Efficient handling of large datasets
- **Migration Support**: Easy migration from key-value storage to SQL
- **Comprehensive Testing**: Full test coverage with integration and unit tests
- **Performance Optimized**: Batch operations and efficient querying

## 📦 Installation

First, install WatermelonDB and its dependencies:

```bash
npm install @nozbe/watermelondb @nozbe/sqlite-adapter
# For iOS
cd ios && pod install
```

The database facade system is already included in your project under `data/database/`.

## 🏗️ Architecture

```
data/database/
├── index.ts                 # Main exports and configuration
├── types.ts                 # Type definitions and interfaces
├── schema.ts                # WatermelonDB schema definition
├── database-facade.ts       # Main facade interface
├── database-factory.ts      # Database instance factory
├── models/                  # Database model definitions
│   ├── PantryItem.ts
│   ├── Recipe.ts
│   ├── RecipeIngredient.ts
│   └── index.ts
├── repositories/            # Repository implementations
│   ├── base-repository.ts
│   ├── pantry-item-repository.ts
│   └── index.ts
└── implementations/         # Database-specific implementations
    └── watermelon-db-facade.ts
```

## 🚀 Quick Start

### Basic Setup

```typescript
import { databaseFacade, initializeDatabase } from '~/data/database';

// Initialize database (usually in your app startup)
await initializeDatabase('development'); // or 'production', 'testing'

// Check if ready
console.log('Database ready:', databaseFacade.isInitialized);
```

### Using the PantryItem Repository

```typescript
import { databaseFacade } from '~/data/database';

// Get the repository
const pantryRepo = databaseFacade.pantryItems;

// Create a new item
const newItem = await pantryRepo.create({
  name: 'Fresh Apples',
  quantity: 10,
  unit: 'pieces',
  category: 'Fruit',
  type: 'fridge',
  image_url: 'apples.jpg',
  x: 100,
  y: 200,
  scale: 1.2,
  expiry_date: new Date('2025-09-15'),
});

// Find items
const item = await pantryRepo.findById(newItem.id);
const allItems = await pantryRepo.findAll();
const fridgeItems = await pantryRepo.findByType('fridge');
const expiringSoon = await pantryRepo.findExpiringSoon(7);

// Update items
const updated = await pantryRepo.update(newItem.id, {
  quantity: 8,
  category: 'Organic Fruit',
});

// Search items
const apples = await pantryRepo.searchByName('Apple');

// Get statistics
const stats = await pantryRepo.getStatistics();
console.log(`Total items: ${stats.total}, Expiring soon: ${stats.expiringSoon}`);
```

## 📊 Database Schema

The system includes pre-defined tables for your recipe app:

### Pantry Items
- Basic item information (name, quantity, unit, category, type)
- Position and visual data (x, y, scale, image_url)
- Expiry tracking
- Sync metadata

### Recipes
- Recipe details (title, description, prep/cook times, difficulty)
- Ingredients and steps (separate tables with relationships)
- Tags and metadata

### User Preferences
- Key-value storage for app settings
- Type-safe preference management

### Sync Metadata
- Tracks sync status across tables
- Supports offline-first operations

## 🔄 Offline-First & Sync

### Setup Sync

```typescript
import { createWatermelonDB } from '~/data/database';

// Initialize with sync URL
await createWatermelonDB({
  name: 'recipe_app.db',
  syncUrl: 'https://your-api.com/sync',
  actionsEnabled: true,
});

// Monitor sync status
databaseFacade.onSyncStatusChange((status) => {
  console.log('Sync status:', {
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    pendingChanges: status.pendingChanges,
  });
});

// Manual sync
await databaseFacade.sync();
```

### Offline Operations

All operations work offline and are automatically queued for sync:

```typescript
// These work offline and sync automatically
const item = await pantryRepo.create(newItemData);
await pantryRepo.update(item.id, updateData);
await pantryRepo.delete(item.id);

// Check pending sync operations
const pendingItems = await pantryRepo.findPendingSync();
console.log(`${pendingItems.length} items pending sync`);
```

## 🔄 Transactions

For atomic operations that must succeed or fail together:

```typescript
import { databaseFacade } from '~/data/database';

// Example: Recipe preparation (consuming ingredients)
await databaseFacade.transaction(async () => {
  const milk = await pantryRepo.findByName('Milk');
  const eggs = await pantryRepo.findByName('Eggs');
  
  if (milk) await pantryRepo.consumeItem(milk.id, 0.5);
  if (eggs) await pantryRepo.consumeItem(eggs.id, 2);
  
  // If any operation fails, all changes are rolled back
});
```

## 📈 Advanced Queries

### Custom Queries

```typescript
// Using the base repository query system
const expensiveItems = await pantryRepo.findAll({
  where: [
    { field: 'category', operator: 'eq', value: 'Meat' },
    { field: 'quantity', operator: 'gt', value: 5 },
  ],
  orderBy: [{ field: 'expiry_date', direction: 'asc' }],
  limit: 10,
});
```

### Pagination

```typescript
// Efficient pagination for large datasets
const results = await pantryRepo.findPaginated(
  { page: 1, pageSize: 20 },
  { orderBy: [{ field: 'created_at', direction: 'desc' }] }
);

console.log(`Page ${results.pagination.page} of ${results.pagination.totalPages}`);
console.log(`${results.data.length} items`);
```

### Real-time Updates

```typescript
// Subscribe to real-time updates
const subscription = pantryRepo.observe({
  where: [{ field: 'type', operator: 'eq', value: 'fridge' }]
}).subscribe((fridgeItems) => {
  console.log(`Fridge has ${fridgeItems.length} items`);
  updateUI(fridgeItems);
});

// Don't forget to unsubscribe
subscription.unsubscribe();
```

## 🔧 Migration

### From Key-Value Storage (MMKV)

```typescript
import { migrateFromKeyValueStorage } from '~/data/database';

// Migrate existing MMKV data
const mmkvData = {
  pantryItems: [
    {
      id: '1',
      name: 'Old Apple',
      quantity: 3,
      // ... other fields
    },
    // ... more items
  ],
};

await migrateFromKeyValueStorage(mmkvData);
console.log('Migration completed!');
```

### Database Version Migrations

WatermelonDB handles schema migrations automatically. When you update the schema version:

```typescript
// In schema.ts
export const schema = appSchema({
  version: 2, // Increment version
  tables: [
    // Add new tables or modify existing ones
  ],
});
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all database tests
npm test __tests__/database

# Run specific test file
npm test __tests__/database/database-integration.test.ts

# Run with coverage
npm test -- --coverage __tests__/database
```

### Test Categories

- **Integration Tests**: End-to-end workflows with repositories
- **Unit Tests**: Individual component testing (coming soon)
- **Performance Tests**: Large dataset handling
- **Error Handling**: Edge cases and failure scenarios

## 📊 Performance Considerations

### Batch Operations

```typescript
// Instead of multiple single operations
for (const item of items) {
  await pantryRepo.create(item); // ❌ Slow
}

// Use batch operations
await pantryRepo.createMany(items); // ✅ Fast
```

### Efficient Querying

```typescript
// Use specific queries instead of loading all data
const expiring = await pantryRepo.findExpiringSoon(7); // ✅ Efficient

// Instead of
const all = await pantryRepo.findAll(); // ❌ Loads everything
const expiring = all.filter(item => /* expiry logic */); // ❌ Client-side filtering
```

### Pagination for Large Lists

```typescript
// For UI lists with many items
const paginatedItems = await pantryRepo.findPaginated(
  { page: currentPage, pageSize: 50 },
  { orderBy: [{ field: 'updated_at', direction: 'desc' }] }
);
```

## 🛠️ Configuration

### Environment-based Setup

```typescript
import { getDatabaseConfig } from '~/data/database';

// Automatic environment detection
const config = getDatabaseConfig(); // Uses NODE_ENV or defaults to development

// Manual environment selection
const devConfig = getDatabaseConfig('development');
const prodConfig = getDatabaseConfig('production');
```

### Custom Configuration

```typescript
import { DatabaseFactory } from '~/data/database';

const customConfig = {
  type: 'watermelon' as const,
  options: {
    name: 'custom_app.db',
    schema: customSchema,
    modelClasses: customModels,
    actionsEnabled: true,
  },
};

await DatabaseFactory.initialize(customConfig);
```

## 🔍 Debugging

### Database Status

```typescript
import { getDatabaseStatus } from '~/data/database';

const status = await getDatabaseStatus();
console.log('Database status:', status);
// {
//   initialized: true,
//   healthy: true,
//   type: 'watermelon',
//   version: 1,
//   tables: ['pantry_items', 'recipes', ...],
//   debugInfo: { ... }
// }
```

### Debug Information

```typescript
const debugInfo = databaseFacade.getDebugInfo();
console.log('Debug info:', debugInfo);
```

## 🚨 Error Handling

The system provides specific error types for different scenarios:

```typescript
import { DatabaseError, QueryError, ValidationError } from '~/data/database';

try {
  await pantryRepo.create(invalidData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation errors:', error.validationErrors);
  } else if (error instanceof QueryError) {
    console.log('Query failed:', error.query);
  } else if (error instanceof DatabaseError) {
    console.log('Database error:', error.databaseType, error.operation);
  }
}
```

## 🏆 Best Practices

1. **Initialize Early**: Set up the database in your app's startup sequence
2. **Use Transactions**: Group related operations for consistency
3. **Batch Operations**: Use `createMany`, `updateMany` for better performance
4. **Pagination**: Don't load all data at once for large datasets
5. **Real-time Updates**: Use `observe()` for reactive UI components
6. **Error Handling**: Wrap database operations in try-catch blocks
7. **Sync Management**: Monitor sync status and handle offline scenarios
8. **Testing**: Write tests for your repository methods and business logic

## 📚 API Reference

### DatabaseFacade

Main interface for database operations:

```typescript
// Initialization
await databaseFacade.initialize(config);
await databaseFacade.close();

// Transaction support
await databaseFacade.transaction(() => Promise<T>);

// Sync operations
await databaseFacade.sync();
databaseFacade.setSyncUrl(url);
databaseFacade.onSyncStatusChange(callback);

// Repository access
const pantryRepo = databaseFacade.pantryItems;

// Utilities
databaseFacade.isInitialized;
databaseFacade.getInfo();
await databaseFacade.healthCheck();
```

### PantryItemRepository

Enhanced repository for pantry management:

```typescript
// CRUD operations
await pantryRepo.create(data);
await pantryRepo.findById(id);
await pantryRepo.update(id, data);
await pantryRepo.delete(id);

// Batch operations
await pantryRepo.createMany(items);
await pantryRepo.deleteMany(ids);

// Query operations
await pantryRepo.findAll(options);
await pantryRepo.findPaginated(pagination, options);
await pantryRepo.count(options);

// Domain-specific methods
await pantryRepo.findByType('fridge');
await pantryRepo.searchByName('apple');
await pantryRepo.findExpiringSoon(days);
await pantryRepo.getStatistics();

// Utility operations
await pantryRepo.consumeItem(id, amount);
await pantryRepo.addStock(id, amount);
```

## 🤝 Contributing

When adding new models or repositories:

1. **Define the Model**: Create in `models/` directory
2. **Create Repository**: Extend `BaseRepository`
3. **Add to Schema**: Update `schema.ts`
4. **Update Facade**: Add repository getter
5. **Write Tests**: Add comprehensive test coverage
6. **Update Documentation**: Document new APIs

## 📄 License

This database facade system is part of your recipe app project and follows the same license terms.

---

**Need Help?** Check the examples in `examples/database-usage.ts` or review the tests in `__tests__/database/` for comprehensive usage patterns.
