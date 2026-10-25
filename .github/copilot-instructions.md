# Recipe RN AI Coding Instructions

## Architecture Overview

This is an **Expo React Native** app with a **strategy pattern authentication system**, **storage abstraction layer**, and **Zustand state management**. Key architectural decisions:

- **Auth Strategy Pattern**: `auth/AuthStrategy.ts` defines the contract, with `SupabaseAuthStrategy` and `MockAuthStrategy` implementations
- **Storage Facade**: `data/storage/` provides a unified interface over MMKV, AsyncStorage, SQLite, and other backends
- **Repository Pattern**: `data/pantry-repository.ts` shows the data access pattern using the storage facade
- **Provider Chain**: App wrapped in multiple providers (Auth, Theme, Overlay, Scale) in `app/_layout.tsx`

## Critical File Paths & Patterns

### Authentication System

```typescript
// Use this pattern for auth-aware components
import { useAuth } from "~/auth";
const { user, signIn, signOut } = useAuth();
```

- Main module: `auth/index.ts` exports everything needed
- Context: `auth/AuthContext.tsx` provides React hooks
- Store: `auth/AuthStore.ts` for Zustand-based state management
- **Key Pattern**: Strategy injection in `app/_layout.tsx` - AuthProvider uses SupabaseAuthStrategy

### Storage Architecture

```typescript
// Use the facade, not direct storage implementations
import { storageFacade } from "~/data/storage";
await storageFacade.set("key", data);
```

- Facade: `data/storage/storage-facade.ts` - single entry point
- Factory: `data/storage/storage-factory.ts` - creates storage instances
- **Key Pattern**: Repository classes use storageFacade, never direct MMKV/AsyncStorage

### State Management (Zustand)

```typescript
// Standard store pattern
export const useStoreNameStore = create<StoreInterface>((set, get) => ({
  // State properties
  // Actions that call repositories then syncFromDatabase()
}));
```

- Example: `store/pantry-store.tsx` shows the standard pattern
- **Key Pattern**: Actions call repository methods, then `syncFromDatabase()` to refresh state

## Development Workflows

### Scripts by Context

```bash
# Development
npm run dev              # Start Expo with cache clear
npm run dev:android      # Android-specific development
npm run ios             # iOS-specific development

# Code Quality (ESLint v9 Flat Config)
npm run lint:dev        # Development (allows 100 warnings)
npm run lint:check      # CI/CD (zero warnings tolerance)
npm run lint:fix        # Auto-fix issues

# Testing Strategy
npm run test:storage    # Test storage abstraction layer
npm run test:coverage   # Full coverage report
```

### Component Architecture

- **UI Components**: Use `components/ui/` shadcn-style primitives from `@rn-primitives`
- **Feature Components**: Organized by domain (`components/Pantry/`, `components/Recipe/`)
- **Styling**: NativeWind v4 (Tailwind CSS) with `~/global.css` entry point

### Import Aliasing

Always use `~/` alias for imports:

```typescript
import { useAuth } from "~/auth"; // Not "../auth"
import { PantryItem } from "~/types/PantryItem";
```

## Project-Specific Conventions

### Error Handling Pattern

```typescript
// Repository methods return boolean success indicators
const success = pantryRepository.add(item);
if (success) {
  get().syncFromDatabase();
}
```

### Type Organization

- Domain types in `types/` (e.g., `PantryItem.ts`, `RecipeRackItem.ts`)
- Auth types in `auth/types.ts`
- Storage types in `data/storage/types.ts`

### Testing Strategy

- Storage layer has high coverage requirements (60%+ branches/lines)
- Auth system has comprehensive integration tests in `__tests__/auth/`
- Mock implementations for testing (see `auth/MockAuthStrategy.ts`)

### Platform-Specific Handling

- Android navigation bar theming: `lib/android-navigation-bar.ts`
- Image optimization: Use `expo-image` not React Native's Image
- Animations: React Native Reanimated 3 with Moti for declarative animations

## Integration Points

### Supabase Integration

- Client: `auth/supabase-client.ts`
- Types: `auth/supabase-types.ts`
- Auth strategy: `auth/SupabaseAuthStrategy.ts`

### External Dependencies

- **UI**: `@rn-primitives/*` for accessible components
- **Storage**: `react-native-mmkv` as primary storage backend
- **Navigation**: Expo Router with React Navigation themes
- **Animation**: Reanimated 3 + Moti + React Native Redash

### Data Flow

1. UI components call Zustand store actions
2. Store actions call repository methods
3. Repositories use storage facade
4. Storage facade routes to appropriate implementation (MMKV/AsyncStorage)
5. Store calls `syncFromDatabase()` to refresh state

## Development Approach

### Always Plan Before Coding

Before writing any code, always:

1. **Understand the Request**: Break down the feature/fix into smaller, concrete steps
2. **Map Dependencies**: Identify which files, components, and systems will be affected
3. **Consider Patterns**: Determine which architectural patterns apply (Auth Strategy, Storage Facade, Repository, etc.)
4. **Plan Testing**: Identify what tests need to be written or updated
5. **Sequence Work**: Order tasks to minimize breaking changes (types → repositories → stores → UI)

### Implementation Checklist

- [ ] Types defined in `types/`
- [ ] Repository methods implemented using `storageFacade`
- [ ] Zustand store actions call repositories then `syncFromDatabase()`
- [ ] UI components use existing primitives from `components/ui/`
- [ ] Tests written/updated for storage and auth changes
- [ ] ESLint passes with `npm run lint:check`

## Quick Start for AI Agents

1. **New Feature**: Start with types in `types/`, add repository in `data/`, create Zustand store in `store/`
2. **Auth Changes**: Extend `AuthStrategy` interface, implement in both Supabase and Mock strategies
3. **Storage Changes**: Modify `storage-facade.ts`, ensure all repository tests pass
4. **UI Changes**: Use existing primitives from `components/ui/`, follow NativeWind patterns
5. **Testing**: Run `npm run test:storage` for storage changes, full test suite for auth changes
