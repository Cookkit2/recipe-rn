# Recipe-n Project Structure

## Technology Stack
- **Framework:** React Native (0.72+)
- **iOS Platform:** iOS 15.0+
- **Android Platform:** Android 8.0+ (API 26+)
- **Language:** TypeScript
- **Database:** SQLite (iOS) / Room (Android)
- **State Management:** Zustand or Redux
- **Navigation:** React Navigation 6
- **Testing:** Jest + Detox

## Directory Structure

```
recipe-rn/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── RecipeCard.tsx
│   │   ├── RecipeDetail.tsx
│   │   ├── TimerComponent.tsx
│   │   ├── VoiceAssistant.tsx
│   │   └── SearchBar.tsx
│   ├── screens/           # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── RecipeDetailScreen.tsx
│   │   ├── CookingModeScreen.tsx
│   │   ├── FavoritesScreen.tsx
│   │   ├── MealPlanScreen.tsx
│   │   ├── ShoppingListScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── navigation/        # Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   └── TabNavigator.tsx
│   ├── services/          # API and data services
│   │   ├── api/
│   │   │   ├── recipeService.ts
│   │   │   └── userService.ts
│   │   ├── database/
│   │   │   ├── initDatabase.ts
│   │   │   ├── recipeRepository.ts
│   │   │   ├── ingredientRepository.ts
│   │   │   ├── instructionRepository.ts
│   │   │   ├── userRepository.ts
│   │   │   └── migration.ts
│   │   ├── ai/
│   │   │   ├── ingredientSubstitution.ts
│   │   │   └── voiceAssistant.ts
│   │   └── sync/
│   │       ├── offlineManager.ts
│   │       └── conflictResolver.ts
│   ├── hooks/             # Custom React hooks
│   │   ├── useDatabase.ts
│   │   ├── useRecipes.ts
│   │   ├── useCookingMode.ts
│   │   ├── useTimer.ts
│   │   └── useOfflineSync.ts
│   ├── store/             # State management
│   │   ├── slices/
│   │   │   ├── recipeSlice.ts
│   │   │   └── userSlice.ts
│   │   ├── store.ts
│   │   └── persistStore.ts
│   ├── types/             # TypeScript types
│   │   ├── recipe.types.ts
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   ├── utils/             # Utility functions
│   │   ├── dateUtils.ts
│   │   ├── formatUtils.ts
│   │   └── validation.ts
│   └── constants/         # App constants
│       ├── api.ts
│       └── storage.ts
├── android/                # Android native code
│   ├── app/src/main/
│   └── build.gradle
├── ios/                   # iOS native code
│   ├── Recipe-n/
│   │   ├── AppDelegate.swift
│   │   ├── SceneDelegate.swift
│   │   └── Info.plist
│   └── Podfile
├── __tests__/            # Test files
│   ├── components/
│   ├── screens/
│   └── utils/
├── package.json
├── tsconfig.json
├── jest.config.js
└── detox.config.js
```

## Phase 1 Implementation Order

### Sprint 1: Core Infrastructure (Week 1-2)
1. **Database Setup**
   - [ ] Initialize SQLite/Room database
   - [ ] Create tables from schema
   - [ ] Implement migration system
   - [ ] Add indexes for performance
   - [ ] Create repository pattern

2. **API Client Setup**
   - [ ] Create base API client
   - [ ] Implement error handling
   - [ ] Add request/response interceptors
   - [ ] Implement retry logic

3. **Navigation Setup**
   - [ ] Configure React Navigation 6
   - [ ] Create stack navigators
   - [ ] Set up tab navigation
   - [ ] Add deep linking

### Sprint 2: Core Screens (Week 3-4)
1. **Home Screen**
   - [ ] Recipe card component
   - [ ] Recipe list with pagination
   - [ ] Loading states
   - [ ] Error handling

2. **Search Screen**
   - [ ] Search bar with debouncing
   - [ ] Filter options
   - [ ] Search results display
   - [ ] History tracking

3. **Recipe Detail Screen**
   - [ ] Recipe information display
   - [ ] Ingredients list
   - [ ] Instructions stepper
   - [ ] Add to favorites

4. **Favorites Screen**
   - [ ] Saved recipes list
   - [ ] Remove from favorites
   - [ ] Filter and sort

### Sprint 3: MVP Features (Week 5-6)
1. **Cooking Mode (Basic)**
   - [ ] Instruction stepper
   - [ ] Step-by-step navigation
   - [ ] Timer integration
   - [ ] Progress tracking

2. **Timer Component**
   - [ ] Multiple timers
   - [ ] Notifications
   - [ ] Timer controls

3. **Shopping List (Basic)**
   - [ ] Add items
   - [ ] Check off items
   - [ ] Delete items
   - [ ] Basic sorting

4. **Social Sharing**
   - [ ] Share to WhatsApp
   - [ ] Share to Messages
   - [ ] Share to Email
   - [ ] Recipe URL sharing

## Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.1.0",
    "@reduxjs/toolkit": "^2.0.1",
    "react-native-voice": "^3.3.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-fast-image": "^8.6.0",
    "react-native-sqlite-storage": "^6.0.1",
    "react-native-background-timer": "^2.4.0"
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "jest": "^29.7.0",
    "detox": "^20.12.0",
    "@testing-library/react-native": "^12.4.0"
  }
}
```

## Key Implementation Notes

### Offline-First Strategy
1. All API calls wrapped in try-catch
2. Fallback to local database if offline
3. Queue writes when offline
4. Sync when connection restored

### Performance Targets
- App launch: <2 seconds
- Recipe load: <1 second
- Search: <300ms
- Database query: <100ms

### Testing Strategy
- Unit tests: 80% coverage minimum
- E2E tests: Critical user journeys
- Integration tests: Database operations

---

**Version:** 1.0
**Last Updated:** 2026-03-16
**Status:** Ready for Sprint 1
