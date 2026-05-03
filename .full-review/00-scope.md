# Review Scope

## Target

Entire **recipe-rn** codebase - A React Native/Expo recipe management application with features including:
- User authentication (Supabase)
- Recipe management and discovery
- Meal planning and grocery lists
- Voice-guided cooking
- Pantry inventory tracking
- YouTube recipe importing
- Analytics and achievements

## Technology Stack

- **Framework**: React Native 0.83.6, Expo 55
- **Language**: TypeScript (strict mode enabled)
- **Backend**: Supabase (auth, database)
- **Local Storage**: WatermelonDB, MMKV, Expo SecureStore
- **State Management**: React Query (TanStack Query), Zustand
- **UI**: Custom components with @rn-primitives, React Native Skia
- **Testing**: Jest, React Native Testing Library
- **CI/CD**: GitHub Actions (ci.yml, deploy.yml, security-scan.yml)

## Files and Directories

### Core Application
- `app/` - Expo Router file-based routing (screens and layouts)
- `src/` - Main source code
  - `components/` - Reusable UI components
  - `hooks/` - Custom React hooks
  - `lib/` - Utility libraries
  - `store/` - State management
  - `types/` - TypeScript type definitions
- `auth/` - Authentication system and strategies
- `components/` - Shared UI components
- `hooks/` - Additional custom hooks
- `types/` - Shared type definitions

### Key Feature Areas
- `src/components/Analytics/` - Analytics tracking
- `src/components/Camera/` - Camera functionality
- `src/components/Confirmation/` - Confirmation dialogs
- `src/components/GroceryList/` - Grocery list management
- `src/components/Ingredient/` - Ingredient handling
- `src/components/MealPlanCalendar/` - Meal planning
- `src/components/Onboarding/` - User onboarding flow
- `src/components/Pantry/` - Pantry inventory
- `src/components/Preferences/` - User preferences
- `src/components/Profile/` - User profile
- `src/components/Recipe/` - Recipe management
- `src/components/Search/` - Search functionality
- `src/components/Shared/` - Shared components
- `src/components/Timer/` - Cooking timers
- `src/components/VoiceCooking/` - Voice-guided cooking

### Backend Integration
- `src/lib/supabase/` - Supabase client and queries
- `src/lib/supabase-queries/` - Database query functions
- `src/contexts/` - React contexts
- `src/screens/` - Screen components
- `src/services/` - Business logic services

### Data Layer
- `data/` - Data management
- `store/` - State stores

### Configuration
- `constants/` - App constants and configuration
- `.github/workflows/` - CI/CD pipelines
- `test/` - Test utilities and mocks

### Testing
- Limited test coverage found:
  - `auth/__tests__/StorageIntegration.test.ts`
  - `constants/__tests__/camera.test.ts`
  - `hooks/__tests__/` (empty directory exists)

## Flags

- **Security Focus**: No (standard review)
- **Performance Critical**: No (standard review)
- **Strict Mode**: No (standard review)
- **Framework**: React Native/Expo (auto-detected)

## Review Phases

1. **Code Quality & Architecture** - Maintainability, complexity, design patterns
2. **Security & Performance** - Vulnerabilities, optimization opportunities
3. **Testing & Documentation** - Test coverage, documentation quality
4. **Best Practices & Standards** - Framework patterns, CI/CD practices
5. **Consolidated Report** - Prioritized findings and action plan

## Notes

- TypeScript strict mode enabled with additional strict checks (`noUncheckedIndexedAccess`)
- Uses modern React patterns (hooks, concurrent features)
- Monorepo structure with local dependencies (`.opencode/`)
- Husky hooks configured for git operations
- Sentry integration for error tracking
