# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Created `docs/API_OVERVIEW.md` documenting the purpose and boundaries of internal API modules.
- Created `docs/adr/0001-facade-only-data-access.md` to officially document the architectural decision prohibiting direct repository access from application code.
- Created `docs/adr/0002-notification-handler-registry.md` to officially document the notification handler pattern.

### Changed
- Refactored `README.md` to indicate `pnpm` usage and direct users to `package.json` scripts rather than explicitly documenting test commands.
- Updated `docs/AI_CONTEXT.md` to reflect the app's actual name (DoneDish), correct the repo name (fridgit), and update React Native and Expo version references.
- Updated `docs/REPOSITORY_PATTERN.md` to clarify acceptable bulk/batch access patterns within the `DatabaseFacade`.
- Enabled access to the Notification Settings screen directly from the user profile UI by uncommenting the relevant button.
- Updated copy on the Notification Settings screen (`notification.tsx`) to match the "DoneDish" branding.

### Fixed
- Fixed TypeScript errors in `data/api/mealPlanApi.ts` stemming from shadowed variable names and property access mismatches on recipe queries.
- Fixed TypeScript errors in `hooks/useRecipeEdit.ts` related to the `EditableIngredient` and `EditableStep` interfaces by explicitly supplying required base fields.
