# Repository Pattern Documentation

This document provides comprehensive documentation for the Repository Pattern implementation in DoneDish, including architecture, usage patterns, and best practices.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Repositories (WatermelonDB)](#database-repositories-watermelondb)
- [Storage Facade (MMKV)](#storage-facade-mmkv)
- [Usage Patterns](#usage-patterns)
- [Best Practices](#best-practices)
- [Testing](#testing)
- [Migration Guide](#migration-guide)

---

## Overview

### What is the Repository Pattern?

The Repository Pattern provides a clean abstraction layer between the application's business logic and data sources. In our architecture, repositories serve as this **abstraction layer**, while higher-level facades (such as `DatabaseFacade`) provide simplified APIs built on top of them. Repositories:

1. **Encapsulate** data access logic
2. **Standardize** operations across different data sources
3. **Simplify** complex queries and relationships
4. **Protect** against implementation changes

### Why Use It?

- **Separation of Concerns**: Business logic doesn't need to know about WatermelonDB, Supabase, or MMKV internals
- **Testability**: Easy to mock repositories for unit testing
- **Maintainability**: Data access logic is centralized in one place
- **Flexibility**: Can swap storage implementations without changing application code

The facade may use `database.get()` (or repository internals) for batch reads (e.g. fetching synonyms or categories in bulk) to avoid N+1 queries. Callers still use only the facade API; batch behavior is an implementation detail.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                        │
│  (React Components, Hooks, Contexts, Services)                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ Uses
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Facade Layer                           │
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │   DatabaseFacade         │  │   StorageFacade          │   │
│  │   (Unified DB API)       │  │   (Unified KV API)       │   │
│  └──────────┬───────────────┘  └──────────┬───────────────┘   │
└─────────────┼───────────────────────────────┼────────────────────┘
              │                               │
              │ Delegates to                  │ Delegates to
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│   Repository Layer      │     │   Storage Implementation        │
│  (WatermelonDB models)  │     │   (MMKV, AsyncStorage, etc.)   │
│  ┌──────────────────┐   │     │                                 │
│  │ BaseRepository   │   │     │                                 │
│  ├──────────────────┤   │     │                                 │
│  │ RecipeRepository │   │     │                                 │
│  │ StockRepository  │   │     │                                 │
│  │ ... more         │   │     │                                 │
│  └──────────────────┘   │     │                                 │
└──────────┬──────────────┘     └─────────────────────────────────┘
           │
           │ Queries
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WatermelonDB Database                       │
│              (SQLite with Reactive Queries)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Data Layer Structure

The data layer is organized into three tiers:

**1. Complex Data - WatermelonDB** (`data/db/`)
- Relational data with queries, relationships, and reactive updates
- Schema: `data/db/schema.ts` (version 5)
- Models: `data/db/models/` with decorators
- Repositories: `data/db/repositories/` for data access
- Entry Point: `DatabaseFacade` (`data/db/DatabaseFacade.ts`)

**2. Simple Key-Value - StorageFacade** (`data/storage/`)
- Fast key-value storage via unified API
- Factory pattern for storage backend selection
- Storage implementations: `data/storage/implementations/`
- Entry Point: `storage` from `data/index.ts`

**3. Cloud Sync - Supabase APIs** (`data/supabase-api/`)
- Cloud operations for recipes and ingredients
- Auto-generated types in `lib/supabase/supabase-types.ts`
- Recipes sync from Supabase to local WatermelonDB

---

## Database Repositories (WatermelonDB)

### Repository Hierarchy

```
BaseRepository<T>
    ├── RecipeRepository
    ├── StockRepository
    ├── CookingHistoryRepository
    ├── IngredientCategoryRepository
    ├── IngredientSynonymRepository
    ├── StockCategoryRepository
    ├── MealPlanRepository
    ├── GroceryItemCheckRepository
    └── TailoredRecipeMappingRepository
```

### BaseRepository

The `BaseRepository` provides common CRUD operations for all repositories:

**Location:** `data/db/repositories/BaseRepository.ts`

**Core Methods:**

```typescript
abstract class BaseRepository<T extends Model> {
  // Find by ID
  async findById(id: string): Promise<T | null>

  // Get all records with pagination
  async findAll(options?: PaginationOptions): Promise<T[]>

  // Count records
  async count(): Promise<number>

  // Create a record
  async create(data: Partial<T>): Promise<T>

  // Update a record
  async update(id: string, data: Partial<T>): Promise<T>

  // Delete a record
  async delete(id: string): Promise<void>

  // Delete multiple records
  async deleteMany(ids: string[]): Promise<void>

  // Protected helpers for subclasses
  protected buildSearchQuery(query: Query<T>, searchTerm: string, fields: string[]): Query<T>
  protected applySorting(query: Query<T>, sortBy?: string, sortOrder?: 'asc' | 'desc'): Query<T>
}
```

**Search Options:**

```typescript
interface PaginationOptions {
  limit?: number;
  offset?: number;
}

interface SearchOptions extends PaginationOptions {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchTerm?: string;
}
```

### Repository Example: StockRepository

```typescript
import { databaseFacade } from '~/data';

// Get all stock items
const allStock = await databaseFacade.getAllStock();

// Get stock by ID
const item = await databaseFacade.getStockById('abc-123');

// Create new stock
const newItem = await databaseFacade.createStock({
  name: 'Tomatoes',
  quantity: 5,
  unit: 'pieces',
  storageType: 'fridge',
});

// Update stock
await databaseFacade.updateStock('abc-123', {
  quantity: 3,
  expiryDate: Date.now() + 86400000,
});

// Delete stock
await databaseFacade.deleteStock('abc-123');

// Search with filters
const results = await databaseFacade.searchStock('tomato', {
  storageType: 'fridge',
  sortBy: 'expiry_date',
  sortOrder: 'asc',
});
```

### Custom Repository Methods

Each repository can extend the base with domain-specific methods:

```typescript
class RecipeRepository extends BaseRepository<Recipe> {
  // Domain-specific search with filters
  async searchRecipes(options: RecipeSearchOptions): Promise<Recipe[]> {
    let query = this.collection.query();

    if (options.searchTerm) {
      query = this.buildSearchQuery(query, options.searchTerm, ['title', 'description']);
    }

    if (options.tags?.length) {
      const tagConditions = options.tags.map(tag =>
        Q.where('tags', Q.like(`%"${tag}"%`))
      );
      query = query.extend(Q.or(...tagConditions));
    }

    if (options.maxPrepTime) {
      query = query.extend(Q.where('prep_minutes', Q.lte(options.maxPrepTime)));
    }

    return await query.fetch();
  }

  // Get recipe with related data
  async getRecipeWithDetails(id: string): Promise<{
    recipe: Recipe;
    steps: RecipeStep[];
    ingredients: RecipeIngredient[];
  } | null> {
    const recipe = await this.findById(id);
    if (!recipe) return null;

    const [steps, ingredients] = await Promise.all([
      recipe.steps.query().fetch(),
      recipe.ingredients.query().fetch(),
    ]);

    return { recipe, steps, ingredients };
  }
}
```

### WatermelonDB Relationships

Repositories handle WatermelonDB's `@relation` decorators:

```typescript
// Model with relations
class Recipe extends Model {
  @children('recipe_step') steps
  @children('recipe_ingredient') ingredients
}

// Access through repository
const { recipe, steps, ingredients } = await databaseFacade.getRecipeWithDetails(id);
```

---

## Storage Facade (MMKV)

The StorageFacade provides a unified API for key-value storage with automatic backend detection.

### Architecture

```
StorageFacade (Unified API)
         │
         │ Uses
         ▼
StorageFactory (Backend Selection)
         │
         ├── MMKVStorageImpl (Primary)
         └── AsyncStorageImpl (Fallback - deprecated)
```

### Basic Usage

```typescript
import { storage } from '~/data';

// Simple get/set
const token = storage.get('auth_token');
storage.set('auth_token', 'abc123');

// With type safety
const settings = storage.get<UserSettings>('settings');
storage.set('settings', { theme: 'dark', language: 'en' });

// Delete
storage.delete('auth_token');

// Check existence
if (storage.contains('onboarding_completed')) {
  // User has completed onboarding
}

// Get all keys
const keys = storage.getAllKeys();

// Get storage size
const size = storage.size();
```

### Batch Operations

```typescript
// Get multiple values
const values = storage.getBatch(['key1', 'key2', 'key3']);

// Set multiple values
storage.setBatch({
  key1: 'value1',
  key2: 'value2',
  key3: 'value3',
});

// Delete multiple keys
storage.deleteBatch(['key1', 'key2', 'key3']);
```

### Utility Methods

```typescript
// Check if storage is empty
if (storage.isEmpty()) {
  // First time user
}

// Get with default value
const theme = storage.getWithDefault('theme', 'light');

// Set only if key doesn't exist
storage.setIfNotExists('install_id', generateId());

// Update only if key exists
const updated = storage.update('theme', 'dark');
```

### Storage Keys

All storage keys are centralized in `constants/storage-keys.ts`:

```typescript
export const ONBOARDING_COMPLETED_KEY = 'onboarding:completed';
export const VOICE_COOKING_SETTINGS_KEY = 'voice:cooking_settings';
export const USER_PREFERENCES_KEY = 'user:preferences';

// Usage
storage.set(ONBOARDING_COMPLETED_KEY, true);
const settings = storage.get(VOICE_COOKING_SETTINGS_KEY);
```

### Storage Implementation

**Location:** `data/storage/storage-facade.ts`

The facade provides:
- **Auto-detection** of sync vs async operations
- **Fallback support** for missing methods
- **Batch operations** for efficiency
- **Type-safe** generics support

### StorageFactory

**Location:** `data/storage/storage-factory.ts`

Used for advanced scenarios:

```typescript
import { StorageFactory } from '~/data/storage/storage-factory';

// Initialize with specific config
const storage = StorageFactory.initialize({
  type: 'mmkv',
  options: {
    id: 'user-data',
    // In production, use a strong, randomly generated key from secure storage (env vars, Keychain, etc.).
    encryptionKey: process.env.MMKV_ENCRYPTION_KEY,
  },
});

// Check capabilities
if (StorageFactory.supportsAsync()) {
  const value = await storage.getAsync('key', true);
}

if (StorageFactory.supportsBatch()) {
  storage.setBatch(data); // Synchronous batch
}

// Migrate between storage backends
await StorageFactory.migrateStorage(
  { type: 'mmkv' },
  { type: 'mmkv', options: { id: 'new-storage' } }
);
```

---

## Usage Patterns

### Accessing Data

**Recommended:** Always use the facade, never access repositories directly.

```typescript
// ✅ GOOD - Use facade
import { databaseFacade } from '~/data';

const recipes = await databaseFacade.getAllRecipes();

// ❌ BAD - Direct repository access
import { recipeRepository } from '~/data/db/repositories';
const recipes = await recipeRepository.findAll();
```

### React Query Integration

Combine repositories with React Query for server state:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databaseFacade } from '~/data';

// Query hook
function useStockItems() {
  return useQuery({
    queryKey: ['stock'],
    queryFn: () => databaseFacade.getAllStock(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Mutation hook
function useCreateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStockData) => databaseFacade.createStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}
```

### WatermelonDB Reactive Queries

For real-time UI updates:

```typescript
import { useCollection } from '~/data/db';
import Stock from '~/data/db/models/Stock';
import { Q } from '@nozbe/watermelondb';

function useExpiringStock() {
  return useCollection(Stock, collection =>
    collection
      .query(Q.where('expiry_date', Q.gt(Date.now())))
      .fetch()
  );
}
```

### Transaction Handling

Repositories handle transactions automatically:

```typescript
// Single operation - auto-transaction
await databaseFacade.createStock(data);

// Multiple related operations - use facade methods
const recipe = await databaseFacade.createRecipe({
  title: 'Pasta',
  description: 'Delicious pasta',
  steps: [...],
  ingredients: [...],
});
// Facade wraps steps and ingredients in the same transaction
```

For custom transactions, use `database.write()`:

```typescript
import { database } from '~/data/db/database';

await database.write(async () => {
  await repository1.createRaw(data1);
  await repository2.createRaw(data2);
  await repository3.updateRaw(id, data3);
});
```

> Note: `createRaw` and `updateRaw` in this example are illustrative low-level repository methods used for demonstration. In your implementation, use the concrete repository methods that your repositories expose when performing custom transactions.
---

## Best Practices

### 1. Use Facade Methods Only

```typescript
// ✅ GOOD
const recipes = await databaseFacade.getAllRecipes();
const recipe = await databaseFacade.getRecipeWithDetails(id);

// ❌ BAD - Direct database access
import { database } from '~/data/db/database';
const recipes = await database.get('recipe').query().fetch();
```

### 2. Sanitize User Input

The `BaseRepository` automatically sanitizes search terms:

```typescript
// Automatic sanitization for SQL injection prevention
const results = await repository.searchRecipes({
  searchTerm: userInput, // Sanitized internally
});
```

### 3. Handle Errors Gracefully

```typescript
try {
  const recipe = await databaseFacade.getRecipeById(id);
  if (!recipe) {
    // Handle not found
    return <NotFound />;
  }
} catch (error) {
  // Log error and show fallback UI
  log.error('Failed to fetch recipe:', error);
  return <ErrorFallback />;
}
```

### 4. Use Type-Safe Interfaces

```typescript
// Import types from facade
import type { CreateStockData, UpdateStockData, RecipeWithDetails } from '~/data';

const data: CreateStockData = {
  name: 'Tomatoes',
  quantity: 5,
  unit: 'pieces',
};
```

### 5. Batch Operations for Performance

```typescript
// ✅ GOOD - Batch insert
await database.write(async () => {
  for (const item of items) {
    await repository.createRaw(item);
  }
});

// ❌ BAD - Individual transactions
for (const item of items) {
  await repository.create(item); // Opens transaction each time
}
```

### 6. Storage Keys Centralization

```typescript
// ✅ GOOD - Use constants
import { ONBOARDING_COMPLETED_KEY } from '~/constants/storage-keys';
storage.set(ONBOARDING_COMPLETED_KEY, true);

// ❌ BAD - String literals
storage.set('onboarding_completed', true); // Typo risk
```

### 7. Avoid Circular Dependencies

The facade prevents circular dependencies by hiding repository implementation:

```typescript
// ✅ GOOD - One-way dependency
Component → Facade → Repository → Database

// ❌ BAD - Circular dependency
Component → Repository → Component (via imports)
```

---

## Testing

### Mocking the Facade

```typescript
import { databaseFacade } from '~/data';

// Mock the facade
jest.mock('~/data', () => ({
  databaseFacade: {
    getAllRecipes: jest.fn(),
    getRecipeById: jest.fn(),
    createRecipe: jest.fn(),
  },
}));

// Use in tests
describe('RecipeList', () => {
  it('displays recipes', async () => {
    (databaseFacade.getAllRecipes as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Pasta' },
    ]);

    // ... test code
  });
});
```

### Repository Unit Tests

```typescript
import { RecipeRepository } from '~/data/db/repositories';

describe('RecipeRepository', () => {
  let repository: RecipeRepository;

  beforeEach(() => {
    repository = new RecipeRepository();
  });

  it('should search recipes by term', async () => {
    const results = await repository.searchRecipes({
      searchTerm: 'pasta',
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toContain('pasta');
  });
});
```

---

## Migration Guide

### Migrating from Direct WatermelonDB Access

**Before (Direct Access):**
```typescript
import { database } from '~/data/db/database';
import Recipe from '~/data/db/models/Recipe';

const recipes = await database.get<Recipe>('recipe').query().fetch();
const recipe = await database.get<Recipe>('recipe').find(id);
```

**After (Facade):**
```typescript
import { databaseFacade } from '~/data';

const recipes = await databaseFacade.getAllRecipes();
const recipe = await databaseFacade.getRecipeById(id);
```

### Migrating from AsyncStorage

**Before (AsyncStorage):**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('key', 'value');
const value = await AsyncStorage.getItem('key');
```

**After (StorageFacade):**
```typescript
import { storage } from '~/data';

storage.set('key', 'value'); // Sync, no await needed
const value = storage.get('key');
```

### Adding a New Repository

1. **Create the repository class:**

```typescript
// data/db/repositories/MyEntityRepository.ts
import { BaseRepository } from './BaseRepository';
import MyEntity from '../models/MyEntity';

export class MyEntityRepository extends BaseRepository<MyEntity> {
  constructor() {
    super('my_entity');
  }

  // Add custom methods
  async findByCustomField(value: string): Promise<MyEntity[]> {
    return await this.collection
      .query(Q.where('custom_field', Q.like(`%${value}%`)))
      .fetch();
  }
}
```

2. **Export from index:**

```typescript
// data/db/repositories/index.ts
export { MyEntityRepository } from './MyEntityRepository';
export let myEntityRepository: MyEntityRepository | null = null;

export function initializeRepositories() {
  // ...
  if (!myEntityRepository) {
    myEntityRepository = new MyEntityRepository();
  }
  return {
    // ...
    myEntityRepository,
  };
}
```

3. **Add to DatabaseFacade:**

```typescript
// data/db/DatabaseFacade.ts
export class DatabaseFacade {
  private myEntities: MyEntityRepository;

  constructor() {
    const repositories = initializeRepositories();
    this.myEntities = repositories.myEntityRepository!;
  }

  // Public methods
  async getAllMyEntities(): Promise<MyEntity[]> {
    return await this.myEntities.findAll();
  }
}
```

---

## Related Documentation

- **Tech Stack:** See `TECH_STACK.md` for WatermelonDB and MMKV configuration
- **Project Overview:** See `CLAUDE.md` for architecture overview
- **Database Schema:** See `data/db/schema.ts` for table definitions
- **Storage Keys:** See `constants/storage-keys.ts` for all storage key constants

---

## Glossary

- **Facade:** A unified interface that hides complex subsystems
- **Repository:** A data access layer that encapsulates storage logic
- **Model:** WatermelonDB class representing a database table
- **Collection:** WatermelonDB query builder for a table
- **Reactive Query:** Query that auto-updates UI when data changes
- **Transaction:** Group of operations that succeed or fail together
- **Batch Operation:** Multiple operations executed efficiently together

---

## Resources

### Official Documentation
- [WatermelonDB Docs](https://nozbe.github.io/WatermelonDB/)
- [WatermelonDB Relationships](https://nozbe.github.io/WatermelonDB/Relations.html)
- [MMKV Documentation](https://github.com/microsoft/react-native-mmkv)

### Design Patterns
- [Repository Pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/repository.html)
- [Facade Pattern (Gang of Four)](https://refactoring.guru/design-patterns/facade)

### DoneDish Specific
- `data/db/DatabaseFacade.ts` - Main entry point for database operations
- `data/storage/storage-facade.ts` - Main entry point for key-value operations
- `CLAUDE.md` - Project architecture overview
- `TECH_STACK.md` - Technology stack documentation
