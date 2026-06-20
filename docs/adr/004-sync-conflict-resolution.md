# ADR 004: Sync & Conflict-Resolution Strategy

## Status

Accepted.

## Context

Cookkit supports multi-device household pantry sharing for Pro households. Two code paths mutate the local `stock` cache from Supabase, and both implement an undocumented, **internally inconsistent** last-writer-wins strategy:

- **Batch sync** (`HouseholdSyncService.syncHousehold`, `data/services/HouseholdSyncService.ts:27`) runs `pushLocalChanges()` then `pullRemoteChanges()`, gated by an MMKV `household_last_sync_timestamp`. The batch pull path's `prepareUpdate` (`HouseholdSyncService.ts:99-114`) overwrites every local field unconditionally — there is **no `updated_at` comparison**, so a stale remote row can clobber a fresher local edit.
- **Realtime sync** (`HouseholdRealtimeService`, `data/services/HouseholdRealtimeService.ts`) subscribes to Supabase `postgres_changes` on the `stock` table. Its `handleUpdate` (`HouseholdRealtimeService.ts:150-157`) **does** guard on `remoteUpdatedAt <= localUpdatedAt` and skips stale writes. Its `handleDelete` (`HouseholdRealtimeService.ts:193`) calls `existing.destroyPermanently()` — a hard, non-recoverable delete with no tombstone, and the `stock` table has no `is_archived` / `deleted_at` / `synced_at` columns (`data/db/schema.ts:114-131`).

These divergent behaviors are a correctness risk on a retention-critical Pro surface. The full edge-case matrix and verified defects are enumerated in `docs/SYNC_STRATEGY_AUDIT.md`. This ADR records the **decision** about Cookkit's sync model so P3-5 hardening (see #735) targets a fixed target rather than an open question.

Supabase is the single writer for shared rows (`households`, `household_members`, and `stock` rows where `household_id` is set). WatermelonDB is the per-device offline cache. On read, the UI always serves from the local DB; on write, local-first mutations are pushed to Supabase, which then propagates to other devices via batch sync and realtime.

Per research **[F11]**, fully decentralized CRDTs impose measurable performance and memory overhead and major engineering cost relative to single-authority systems, and production leaders with strong collaboration UX — **Figma** and **Linear** — ship a **hybrid**: local-first UX (optimistic, instant local writes; offline-capable) layered over **server-authoritative** sync. That is exactly the model Cookkit already has. Adopting a pure CRDT / merge-tree layer is therefore not warranted.

## Decision

Cookkit uses **server-authoritative hybrid sync** — **not** a pure CRDT.

1. **Authority.** Supabase is authoritative for all shared (`household_id`-bearing) rows. WatermelonDB is the per-device offline cache. There is exactly one source of truth for a shared row: the server copy.
2. **Conflict resolution.** **Last-writer-wins by `updated_at`**, resolved against the server-authoritative copy. The realtime path already implements this guard (`HouseholdRealtimeService.ts:150-157`); the batch path must be unified onto the **same** timestamp-comparing resolver (currently it does not — see audit defect #1).
3. **Deletes.** Deletes must become **soft deletes with a tombstone** (`is_archived` / `deleted_at`), resolvable on the same LWW basis. Hard `destroyPermanently()` on a synced row is rejected as a cross-device delete primitive; it remains valid only for local-only teardown (e.g. `leaveHousehold`).
4. **Scope of P3-5 hardening.** Restricted to the verified defects in `docs/SYNC_STRATEGY_AUDIT.md` (unify the conflict paths; replace `destroyPermanently`; add `synced_at`/soft-delete columns; indexed lookup instead of full-table scans; foreground/reconnect sync trigger; Sentry breadcrumbs on sync outcomes). No CRDT, no merge tree, no per-field conflict counters.

This explicitly cites **[F11]** and **declines** pure-CRDT adoption. The hybrid is the cheapest correctness floor that matches what Figma and Linear ship.

## Consequences

- **Positive.** Single source of truth keeps the model easy to reason about and test; conflict resolution is a one-line timestamp comparison, not a distributed-merge algorithm; no CRDT library, no tombstone-vector growth, no per-field versioning overhead.
- **Positive.** Aligns with the existing codebase shape (Supabase writes flow through `data/supabase-api/HouseholdApi.ts`; WatermelonDB serves reads), so P3-5 is incremental, not a rewrite.
- **Negative.** LWW by `updated_at` is vulnerable to clock skew — a device with a fast clock can win a write it should lose. This is accepted for household-scale (2-6 members, low concurrency, same broad timezone) and mitigated by treating server time, not client time, as authoritative on the `updated_at` column where feasible; the audit marks clock-skew cases as requiring a 2-device test in follow-up.
- **Negative.** LWW is field-level-lossy by design: two concurrent edits to the same row where each device changed a different field still resolve to a single winner, dropping the loser's field changes. For a pantry (name/quantity/unit/expiry), this is acceptable; it would not be acceptable for a document editor, which is precisely why Cookkit is not built as one.
- **Operational.** The audit becomes the known-bug record; until P3-5 lands, wider Pro rollout of households carries a churn/refund risk directionally consistent with **[F9]** (directional only — [F9] figures are category-agnostic A/B-test medians, not Cookkit-specific predictions).

## References

- `docs/SYNC_STRATEGY_AUDIT.md` — full defect inventory and edge-case matrix (this audit's companion document).
- **[F11]** — pure-CRDT cost rationale; Figma/Linear hybrid precedent.
- **[F10]** — CozZo cloud decommission / late-2025 EOL validates the WatermelonDB-first offline moat; credible only if sync correctness is owned.
- ADR 003 (Three-Tier Storage) — Supabase/WatermelonDB/MMKV layering this builds on.
