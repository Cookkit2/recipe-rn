# `data/` — local DB, repositories, HTTP APIs

## Package identity

Offline-first **WatermelonDB** layer (`data/db/`), **repositories** per entity, **migrations/schema**, and **remote/sync-oriented API** modules (`data/api/`). Domain services (e.g. achievements) live under `data/services/`.

## Setup & run

```bash
bun install
bun run typecheck
bun test -- data/
```

DB is created at runtime (SQLite on native, LokiJS/IndexedDB on web) — see `data/db/database.ts`.

## Patterns & conventions

- **Single DB entry**: import `database` / facades from `~/data/db/database.ts` and `~/data/db/DatabaseFacade.ts` rather than re-instantiating adapters.
- **Repositories**: extend `data/db/repositories/BaseRepository.ts` for collection access, queries, and pagination helpers.
- **Models**: Watermelon `@Model` classes in `data/db/models/`; register in `data/db/models/index.ts` / schema.
- **Schema & migrations**: `data/db/schema.ts`, `data/db/migrations.ts` — bump version and add migrations for any new tables/columns.
- **API modules**: thin fetch/sync wrappers in `data/api/` (e.g. `recipeApi.ts`, `pantryApi.ts`) consumed by hooks in `~/hooks/queries/`.
- **✅ DO**: Mirror the repository pattern in `data/db/repositories/RecipeRepository.ts` and `data/db/repositories/StockRepository.ts` for new entities.
- **❌ DON’T**: Edit `data/db/database.ts` adapter options lightly (JSI, web adapter flags) — comments there document migration fragility; coordinate changes with tests and manual migration checks.

## Database (WatermelonDB)

- **Schema**: `data/db/schema.ts`
- **Migrations**: `data/db/migrations.ts` (never skip version steps)
- **Platform adapters**: `data/db/database.ts` (SQLite vs LokiJS)
- **Seeding** (dev/fixtures): `data/db/seed.ts`
- Jest **excludes** `data/db/database.ts` from coverage (`jest.config.js`) — exercise logic via repositories and facades in tests.

## Touch points / key files

- DB bootstrap: `data/db/database.ts`
- Facade for higher-level access: `data/db/DatabaseFacade.ts`
- Base CRUD/search: `data/db/repositories/BaseRepository.ts`
- Example large repository: `data/db/repositories/RecipeRepository.ts`
- HTTP: `data/api/recipeApi.ts`, `data/api/pantryApi.ts`

## JIT index hints

```bash
rg -n "extends BaseRepository" data/db/repositories
rg -n "@Table|@field|@relation" data/db/models
rg -n "tableSchema|schema" data/db/schema.ts data/db/migrations.ts
rg -n "fetch|supabase" data/api
```

## Common gotchas

- **Dynamic imports** inside `RecipeRepository.ts` break circular deps with `RecipeVersionRepository` — preserve that pattern when adding similar cycles.
- **Web**: IndexedDB quota and multi-tab behavior are handled in `database.ts` callbacks; log user-visible failures via `~/utils/logger` patterns already used there.

## Pre-PR checks

```bash
bun run typecheck && bun test -- data/
```
