# ADR 001: Facade-Only Data Access

## Status

Accepted.

## Context

The app has multiple data sources: WatermelonDB (local SQLite), MMKV/AsyncStorage (key-value), and Supabase (cloud). Components and hooks should not depend on repository or storage implementation details.

## Decision

All data access goes through facades:

- **DatabaseFacade** (`data/db/DatabaseFacade.ts`): Single entry point for WatermelonDB. Components and API layer call `databaseFacade` only; they do not import repositories or `database` directly for application logic.
- **Storage** (`data/index.ts`): Key-value operations use the exported `storage` instance (backed by StorageFactory), not MMKV or AsyncStorage directly.

Repositories and `database.get()` remain internal to the data layer. The facade may use `database.get()` for batch reads (e.g. synonyms, categories) to avoid N+1 queries, but this is an implementation detail behind the facade API.

## Consequences

- Consistent API for readers and AI assistants.
- Easier testing via facade mocks.
- Clear boundary for future storage or backend changes.
