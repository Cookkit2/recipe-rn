# DoneDish (fridgit) – AI Context Document

> **Purpose**: This document provides comprehensive context for AI assistants to understand the project structure, architecture, business logic, and development patterns of the DoneDish mobile application.

---

## 📱 App Overview

**Cookkit** is a React Native mobile application built with Expo that helps users:
1. **Manage Ingredient Inventory** - Track pantry items with expiration dates, quantities, and storage locations
2. **Discover Recipes** - Get AI-powered recipe recommendations based on available ingredients
3. **Streamline Cooking** - Follow step-by-step cooking guidance with integrated ingredient tracking

### Core Value Proposition
- **Smart Pantry Tracking**: Visual inventory with expiration monitoring
- **Recipe Matching**: Recommends recipes based on what you have in stock
- **Offline Support**: Local database (WatermelonDB) synced with cloud (Supabase)
- **Modern UX**: Fluid animations, gesture interactions, and beautiful design

---

## 🏗️ Architecture Overview

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React Native with Expo SDK 55 |
| **Navigation** | Expo Router (file-based routing) |
| **State Management** | React Query (server/async) + React Context (UI state) |
| **Local Database** | WatermelonDB (SQLite) |
| **Cloud Backend** | Supabase (PostgreSQL + Auth + Storage) |
| **Key-Value Storage** | MMKV (primary) / AsyncStorage (fallback) |
| **Styling** | Tailwind CSS v4 via Uniwind |
| **Animations** | React Native Reanimated |
| **UI Components** | @rn-primitives (shadcn-style accessible components) |

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Components                             │
│    (components/Pantry/, components/Recipe/, etc.)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Query Hooks                             │
│    (hooks/queries/usePantryQueries.ts, useRecipeQueries.ts)     │
│    - Caching, background refresh, optimistic updates            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│    (data/api/pantryApi.ts, recipeApi.ts)                        │
│    - Data transformation, business logic                        │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   Local Database         │    │   Cloud API (Supabase)   │
│   (WatermelonDB)         │    │   (data/supabase-api/)   │
│   data/db/               │    │                          │
└──────────────────────────┘    └──────────────────────────┘
```

---

## 📁 Project Structure

```
recipe-rn/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                 # Main pantry screen
│   ├── (auth)/                   # Authentication screens
│   ├── ingredient/               # Ingredient detail screens
│   ├── onboarding/               # Onboarding flow
│   ├── preferences/              # User preferences
│   ├── profile/                  # User profile
│   └── recipes/                  # Recipe screens
│
├── auth/                         # Authentication system (Strategy Pattern)
│   ├── AuthStrategy.ts           # Interface contract
│   ├── SupabaseAuthStrategy.ts   # Production implementation
│   ├── MockAuthStrategy.ts       # Testing implementation
│   ├── AuthStore.ts              # Auth state
│   └── storage-integration.ts    # Auth token persistence (encrypted storage)
│
├── components/                   # React components
│   ├── ui/                       # Primitive UI components (shadcn-style)
│   ├── Pantry/                   # Pantry feature components
│   ├── Recipe/                   # Recipe feature components
│   ├── Ingredient/               # Ingredient components
│   ├── Camera/                   # Camera capture components
│   ├── Onboarding/               # Onboarding flow components
│   └── Shared/                   # Shared/common components
│
├── data/                         # Data layer
│   ├── index.ts                  # Main exports (storage, database)
│   ├── storage/                  # Key-value storage (MMKV/AsyncStorage)
│   │   ├── storage-facade.ts     # Unified storage API
│   │   ├── storage-factory.ts    # Storage implementation factory
│   │   └── implementations/      # MMKV, AsyncStorage implementations
│   ├── db/                       # WatermelonDB (local SQLite)
│   │   ├── DatabaseFacade.ts     # Database operations facade
│   │   ├── schema.ts             # Database schema definition
│   │   ├── models/               # WatermelonDB model classes
│   │   └── repositories/         # Repository pattern implementations
│   ├── api/                      # Internal API layer
│   │   ├── pantryApi.ts          # Pantry operations
│   │   └── recipeApi.ts          # Recipe operations
│   └── supabase-api/             # Supabase cloud API
│       ├── RecipeApi.ts          # Cloud recipe operations
│       └── BaseIngredientApi.ts  # Cloud ingredient data
│
├── hooks/                        # Custom React hooks
│   ├── queries/                  # React Query hooks
│   │   ├── usePantryQueries.ts   # Pantry data hooks
│   │   ├── useRecipeQueries.ts   # Recipe data hooks
│   │   └── useCookingHistoryQueries.ts
│   ├── animation/                # Animation hooks
│   └── supabase-queries/         # Direct Supabase query hooks
│
├── store/                        # State management contexts
│   ├── PantryContext.tsx         # Pantry UI state
│   ├── RecipeContext.tsx         # Recipe UI state
│   ├── CreateIngredientContext.tsx  # Ingredient creation flow
│   ├── RecipeDetailContext.tsx   # Recipe detail state
│   └── QueryProvider.tsx         # React Query provider
│
├── types/                        # TypeScript type definitions
│   ├── PantryItem.ts             # Pantry item types
│   ├── Recipe.ts                 # Recipe types
│   └── AuthTypes.ts              # Authentication types
│
├── constants/                    # App constants
│   ├── storage-keys.ts           # Storage key constants
│   ├── colors.ts                 # Theme colors
│   └── curves.ts                 # Animation curves
│
├── lib/                          # Utilities & external integrations
│   └── supabase/                 # Supabase client setup
│
├── utils/                        # Utility functions
│
└── docs/                         # Documentation
```

---

## 💾 Database Architecture

### Dual Database Strategy

The app uses a **hybrid database approach**:

1. **WatermelonDB (Local)** - SQLite-based local database
   - Stores user's pantry items (Stock)
   - Caches recipes for offline access
   - Stores cooking history
   - Fast, offline-first operations

2. **Supabase (Cloud)** - PostgreSQL backend
   - Master recipe database
   - Base ingredient reference data
   - User authentication
   - Syncs with local for offline support

### WatermelonDB Schema (Local)

```typescript
// Core Tables (data/db/schema.ts)

// User's pantry items
stock {
  id, name, quantity, unit, expiry_date,
  storage_type,  // "fridge" | "cabinet" | "freezer"
  image_url, background_color, x, y, scale
}

// Cached recipes from cloud
recipe {
  id, title, description, image_url,
  prep_minutes, cook_minutes, difficulty_stars, servings,
  source_url, calories, tags, is_favorite, synced_at
}

recipe_step {
  id, recipe_id, step, title, description
}

recipe_ingredient {
  id, recipe_id, name, quantity, unit, notes
}

// Ingredient metadata
ingredient_category { id, name, synced_at }
ingredient_synonym { id, stock_id, synonym }
stock_category { id, stock_id, category_id }

// User cooking history
cooking_history {
  id, recipe_id, cooked_at, rating, notes, photo_url
}
```

### Key Database Patterns

**Repository Pattern**: Each table has a repository class
```typescript
// data/db/repositories/StockRepository.ts
class StockRepository extends BaseRepository<Stock> {
  findAll(): Promise<Stock[]>
  create(data): Promise<Stock>
  update(id, data): Promise<Stock>
  delete(id): Promise<void>
  searchStock(options): Promise<Stock[]>
}
```

**Facade Pattern**: Single entry point for database operations
```typescript
// data/db/DatabaseFacade.ts
class DatabaseFacade {
  // Stock (Pantry) operations
  getAllStock(): Promise<Stock[]>
  createStock(data): Promise<Stock>
  updateStock(id, data): Promise<Stock>
  deleteStock(id): Promise<void>

  // Recipe operations
  getAllRecipes(): Promise<Recipe[]>
  getRecipeWithDetails(id): Promise<RecipeWithDetails>
  searchRecipes(term, options): Promise<Recipe[]>

  // Smart features
  getAvailableRecipes(): Promise<AvailableRecipesResult>
  getShoppingListForRecipe(id): Promise<ShoppingListResult>
}
```

---

## 🔐 Authentication System

Uses **Strategy Pattern** for flexible auth implementations:

```typescript
// auth/AuthStrategy.ts - Interface contract
interface AuthStrategy {
  getCurrentUser(): Promise<User | null>
  signInWithEmail(credentials): Promise<AuthResult>
  signInWithProvider(config): Promise<AuthResult>  // Google, Apple, Facebook
  signInAnonymously(): Promise<AuthResult>
  signUpWithEmail(credentials): Promise<AuthResult>
  signOut(): Promise<AuthResult>
  linkAnonymousAccount(credentials): Promise<AuthResult>
  onAuthStateChange(callback): () => void
}

// Implementations
- SupabaseAuthStrategy.ts  // Production (Supabase Auth)
- MockAuthStrategy.ts      // Testing/Development
```

### Usage Pattern
```typescript
import { useAuth } from "~/auth";

function Component() {
  const { user, signIn, signOut, isLoading } = useAuth();
}
```

---

## 📦 State Management

### Three-Layer State Architecture

1. **React Query** - Server/async state (data fetching, caching)
2. **React Context** - UI state (selections, animations)
3. **Local Storage** - Persistence (preferences, tokens)

### React Query Pattern

```typescript
// hooks/queries/usePantryQueries.ts

// Fetching
export function usePantryItems() {
  return useQuery({
    queryKey: pantryQueryKeys.items(),
    queryFn: pantryApi.fetchAllPantryItems,
    staleTime: 30 * 1000,
  });
}

// Mutations
export function useAddPantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pantryApi.addPantryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryQueryKeys.all });
    },
  });
}
```

### Context Pattern (UI State Only)

```typescript
// store/PantryContext.tsx
interface PantryContextType {
  selectedItemType: ItemType;           // "all" | "fridge" | "cabinet" | "freezer"
  changeItemType: (type) => void;
  isRecipeOpen: boolean;
  translateY: SharedValue<number>;      // Animation values
  snapToExpanded: () => void;
}
```

---

## 🎨 Core Features

### 1. Pantry Management

**User Story**: Users can add ingredients to their virtual pantry, track quantities and expiration dates, and organize by storage location.

**Key Files**:
- `app/index.tsx` - Main pantry screen
- `components/Pantry/` - Pantry UI components
- `data/api/pantryApi.ts` - Pantry operations
- `hooks/queries/usePantryQueries.ts` - React Query hooks

**Data Type**:
```typescript
interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date?: Date;
  type: "fridge" | "cabinet" | "freezer";
  image_url?: string;
  background_color?: string;
  x, y, scale: number;  // Position in visual display
  categories?: Array<{ id: string; name: string }>;
  synonyms?: Array<{ id: string; synonym: string }>;
}
```

### 2. Recipe Discovery

**User Story**: Users can browse recipes, search by name/tag, and see which recipes they can make with current pantry items.

**Key Files**:
- `app/recipes/` - Recipe screens
- `components/Recipe/` - Recipe UI components
- `data/api/recipeApi.ts` - Recipe operations
- `data/supabase-api/RecipeApi.ts` - Cloud recipe fetching

**Key Feature**: `getAvailableRecipes()` matches pantry items against recipe ingredients using synonym matching.

### 3. Camera Ingredient Capture

**User Story**: Users can photograph ingredients, which are processed to identify and add to pantry.

**Key Files**:
- `components/Camera/` - Camera components
- `store/CreateIngredientContext.tsx` - Capture flow state

**Processing Queue** (Planned):
- Non-blocking background processing
- Users can continuously capture photos
- Skeleton placeholders while processing

### 4. Cooking History

**User Story**: Track when recipes were cooked, add ratings and notes.

**Key Files**:
- `data/db/models/CookingHistory.ts`
- `data/db/repositories/CookingHistoryRepository.ts`
- `hooks/queries/useCookingHistoryQueries.ts`

---

## 🔧 Development Patterns

### Import Aliasing
Always use `~/` alias:
```typescript
import { useAuth } from "~/auth";
import { PantryItem } from "~/types/PantryItem";
import { databaseFacade } from "~/data/db";
```

### Component Architecture

```typescript
// Feature component pattern
import { usePantryItems, useAddPantryItem } from "~/hooks/queries/usePantryQueries";
import { usePantryStore } from "~/store/PantryContext";

function PantryList() {
  // Data from React Query
  const { data: items, isLoading } = usePantryItems();
  const addMutation = useAddPantryItem();

  // UI state from Context
  const { selectedItemType } = usePantryStore();

  // Filter locally
  const filteredItems = items?.filter(item =>
    selectedItemType === "all" || item.type === selectedItemType
  );
}
```

### Error Handling

```typescript
// Repository methods use try-catch
try {
  const result = await databaseFacade.createStock(data);
  return result;
} catch (error) {
  log.error("Failed to create stock:", error);
  throw error;
}
```

### Styling (Uniwind / Tailwind)

```tsx
<View className="flex-1 bg-background p-4">
  <Text className="text-lg font-semibold text-foreground">
    {item.name}
  </Text>
</View>
```

---

## 🧪 Testing Strategy

### Test Files Location
- `utils/__tests__/` - Utility tests (e.g. input sanitization, quantity comparison)
- `auth/__tests__/` - Auth storage integration tests
- `data/api/__tests__/` - API tests (pantry, recipe, import)
- `lib/recipe-scrapper/__tests__/` - Recipe validation tests
- `lib/notifications/expiry-notifications/__tests__/` - Expiry notification tests

### Scripts
```bash
npm test                 # Run all tests
npm run test:coverage    # Coverage report
npm run typecheck        # TypeScript check
npm run lint             # Prettier + typecheck
```

---

## 🚀 Key Scripts

```bash
# Development
npm run dev              # Start Expo with cache clear
npm run ios              # Run on iOS
npm run android          # Run on Android
npm run web              # Run in browser

# Code Quality
npm run typecheck        # TypeScript check
npm run lint             # Prettier check + typecheck
npm test                 # Run Jest tests
npm run test:coverage     # Tests with coverage
```

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| `COOKKIT_APP_DOCUMENTATION.md` | Full app design system & features |
| `DATABASE_REFACTORING_PLAN.md` | Database API simplification |
| `PANTRY_MIGRATION.md` | Migration to React Query |
| `RECIPE_MIGRATION.md` | Recipe context restructuring |
| `CATEGORY_SYNONYM_MIGRATION.md` | Normalized categories/synonyms |
| `CAMERA_BACKGROUND_PROCESSING_PLAN.md` | Camera queue system |

---

## ⚡ Quick Reference

### Adding a New Feature

1. **Types** → Define in `types/`
2. **Database** → Add model in `data/db/models/`, repository in `data/db/repositories/`; expose via `DatabaseFacade` only
3. **API Layer** → Add operations in `data/api/` (pantryApi, recipeApi, etc.)
4. **React Query** → Create hooks in `hooks/queries/`
5. **Context** (if needed) → UI state in `store/`
6. **Components** → Feature components in `components/`
7. **Screens** → Route files in `app/` (Expo Router)

### Common Operations

```typescript
// Fetch pantry items
const { data, isLoading } = usePantryItems();

// Add pantry item
const mutation = useAddPantryItem();
mutation.mutate(newItem);

// Search recipes
const { data: recipes } = useSearchRecipes(searchTerm, filters);

// Get available recipes (based on pantry)
const available = await databaseFacade.getAvailableRecipes();

// Auth operations
const { user, signIn, signOut } = useAuth();
```

---

## 🔄 Current Development Focus

See `CLAUDE.md` and the repo README for up-to-date setup and commands. Key areas:

- **Data access**: Use `databaseFacade` and `storage` only; see `docs/REPOSITORY_PATTERN.md` and `docs/adr/`.
- **Notifications**: Local notifications with handler registry; user settings in profile. See `docs/LOCAL_NOTIFICATIONS.md`.
- **Testing**: Jest for unit/integration tests; run `npm test` and `npm run test:coverage`.

---

*Last Updated: March 2026*
