# Changelog

All notable changes to the recipe-rn project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive security audit (2026-05-03)
- SQL injection prevention in BaseIngredientApi
- Encryption key validation for secure storage
- Memory leak fixes in RecipeStepsContext
- Improved batch processing performance (batch size: 10 → 100)

### Changed

- Removed @ts-nocheck directives from critical files
- Improved type safety across storage layer
- Optimized database queries with larger batch sizes

### Fixed

- SQL injection vulnerability in BaseIngredientApi.ts
- Missing encryption key validation in production
- Memory leaks in context providers
- Type safety bypasses in type definitions

### Security

- Fixed 5 critical security vulnerabilities
- Added input sanitization improvements
- Enhanced error message sanitization

## [1.1.0] - 2026-04-XX

### Added

- Meal planning calendar
- Voice-guided cooking
- YouTube recipe importing
- Analytics and achievements system
- Grocery list management
- Pantry inventory tracking

### Changed

- Upgraded to Expo SDK 55
- Upgraded to React Native 0.83.6
- Migrated to TypeScript 5.9.2
- Improved error handling throughout the app

### Fixed

- Camera processing queue overflow
- Timer service performance issues
- Recipe scaling calculations

## [1.0.0] - 2026-03-XX

### Added

- Initial release of recipe-rn
- Recipe management and discovery
- User authentication (Supabase)
- Ingredient matching
- Recipe search and filtering
- Cooking timers

### Security

- Implemented Supabase authentication
- Added secure token storage
- Input sanitization utilities

---

## Migration Guides

### v1.1.0 → v1.2.0

#### Encryption Key Requirements

**Breaking Change**: Encryption keys are now required in all environments.

```bash
# Before (v1.1.0)
EXPO_PUBLIC_MMKV_ENCRYPTION_KEY was optional in development

# After (v1.2.0)
EXPO_PUBLIC_MMKV_ENCRYPTION_KEY must be set in all environments
# Minimum length: 32 characters
# Recommended: Use a strong, randomly generated key
```

#### Storage API Changes

**Breaking Change**: Direct storage access patterns have changed.

```typescript
// Before
import { storage } from "~/data/storage/storage-config";
const data = storage.get("key");

// After
import { databaseFacade } from "~/data/db/DatabaseFacade";
const data = await databaseFacade.getStoredData("key");
```

---

## Version Numbering

- **Major** (X.0.0): Breaking changes, major features
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, security patches

---

## Release Schedule

We aim to release:

- **Major versions**: Annually
- **Minor versions**: Monthly
- **Patch versions**: As needed (security fixes, critical bugs)

For planned features and upcoming releases, see our [GitHub Roadmap](https://github.com/Cookkit2/recipe-rn/milestones).
