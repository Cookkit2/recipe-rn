# ADR 003: Three-Tier Storage

## Status

Accepted.

## Context

DoneDish needs offline-first behavior, fast key-value access for settings and auth, and optional cloud sync. No single backend fits all needs.

## Decision

Use three tiers:

1. **WatermelonDB** (SQLite): Primary source for relational app data (pantry/stock, recipes, meal plan, etc.). Single source of truth on device; reactive queries.
2. **MMKV / AsyncStorage** (key-value): Simple key-value storage via StorageFacade for preferences, auth tokens, feature flags. Encrypted storage for auth when available.
3. **Supabase**: Cloud sync for recipes and user data. Sync flows populate or update WatermelonDB; the app reads from the local DB for UI.

API layer (`data/api/`) and facades hide which tier backs each operation. See `CLAUDE.md` and `docs/REPOSITORY_PATTERN.md` for usage.

## Consequences

- Offline-first UX with optional sync.
- Clear separation: complex/relational → DB; simple/key-value → storage; cloud → Supabase.
