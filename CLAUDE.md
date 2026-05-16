# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cookkit is an offline-first React Native app (Expo SDK 55, React 19, React Native 0.83) for pantry management and recipe discovery with voice-guided cooking. Uses WatermelonDB for local sync, Supabase for cloud backend, and TanStack Query for data orchestration.

## Common Commands

```bash
bun install               # Install dependencies
bun run dev               # Expo dev server with cache clear
bun run ios               # iOS simulator (requires macOS + Xcode)
bun run android           # Android emulator
bun run web               # Web browser
bun run typecheck         # TypeScript strict mode check
bun run lint              # Prettier check + typecheck
bun run lint:fix          # Prettier auto-format
bun test                  # Jest tests
bun run test:coverage     # Jest with coverage
```

## Architecture

### Layered Data Flow

```
UI Components → TanStack Query Hooks → Data Layer (Repositories) → WatermelonDB (local) / Supabase (cloud)
```

### Key Directories

| Directory     | Purpose                                     | Key Files                                                   |
| ------------- | ------------------------------------------- | ----------------------------------------------------------- |
| `app/`        | Expo Router file-based routes & layouts     | `_layout.tsx`, `(auth)/`, `recipes/[recipeId]/`             |
| `components/` | React UI components (primitives + features) | `ui/`, `Recipe/`, `Pantry/`, `auth/`                        |
| `data/`       | Offline-first DB layer, repositories, APIs  | `db/DatabaseFacade.ts`, `db/repositories/`, `supabase-api/` |
| `hooks/`      | TanStack Query hooks & custom React hooks   | `queries/useRecipeQueries.ts`, `queries/recipeQueryKeys.ts` |
| `lib/`        | Native integrations & platform glue         | `function-gemma/`, `image-cache.ts`, `notifications/`       |
| `store/`      | React Context providers                     | Auth, subscription contexts                                 |
| `utils/`      | Pure helper functions & parsers             | `subscription-utils.ts`, voice cooking utilities            |

### Important Patterns

- **Repository Pattern**: Data access goes through `data/db/repositories/BaseRepository.ts` extensions
- **Query Keys**: Centralize in `hooks/queries/*.ts` files (e.g., `recipeQueryKeys.ts`)
- **Dynamic Imports**: Use `await import()` for heavy native deps (see `lib/function-gemma/`)
- **Exhaustive Switches**: TypeScript unions/enums must handle all cases
- **Immutability**: Use spread operator; avoid direct mutation

### Database (WatermelonDB)

- Single instance from `~/data/db/database.ts`
- Facade for higher-level access: `~/data/db/DatabaseFacade.ts`
- Schema: `~/data/db/schema.ts`, Migrations: `~/data/db/migrations.ts`
- Models in `~/data/db/models/`, registered in `~/data/db/models/index.ts`

## Development Workflow

1. **Plan First**: Use planner agent for complex features
2. **TDD**: Write tests in `**/__tests__/**/*.test.ts(x)` before implementing logic
3. **Code Review**: Use code-reviewer agent after writing code
4. **Pre-commit**: `bun run typecheck && bun run lint` (via Husky hook)
5. **Commit**: Follow conventional commits format (`feat:`, `fix:`, `refactor:`)

## Environment & Secrets

- Copy `.env.example` → `.env.local` locally
- Client-visible keys use `EXPO_PUBLIC_*` prefix (treat as public)
- Never commit secrets
- Sentry configuration requires `SENTRY_AUTH_TOKEN` for native debug uploads

## Key Gotchas

- **WatermelonDB batch**: Pass operation arrays directly, not spread arguments
- **RevenueCat**: After purchase, invalidate subscription queries; active entitlement is `Cookkit Pro`
- **Query hooks**: Use `enabled: !!id` pattern for dependent queries
- **iOS Sandbox**: Xcode `ENABLE_USER_SCRIPT_SANDBOXING=NO` enforced via `./plugins/withIosDisableUserScriptSandbox.js`
- **Jest**: Use `bun run test -- ...` not plain `bun test -- ...` (Bun's runner fails on RN Flow syntax)
- **Dynamic imports**: Breaking circular deps in `RecipeRepository.ts` via dynamic imports — preserve this pattern

## Platform-Specific Notes

- **iOS**: Requires native build, New Architecture enabled, camera/mic permissions in `Info.plist`
- **Android**: Edge-to-edge enabled, permissions in `AndroidManifest.xml`
- **Web**: Limited native feature support (no camera, voice)

## TypeScript Configuration

- Strict mode enabled (`strict: true`)
- Path alias `~/` → repo root
- `verbatimModuleSyntax`, `noUncheckedIndexedAccess` enabled
