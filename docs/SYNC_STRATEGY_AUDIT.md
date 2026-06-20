# Household Sync & Conflict-Resolution Audit

> **Issue:** [#719 (P0-3)](https://github.com/Cookkit2/recipe-rn/issues/719) — Audit & document the sync/conflict-resolution strategy.
> **Decision record:** [`docs/adr/004-sync-conflict-resolution.md`](./adr/004-sync-conflict-resolution.md).
> **Feeds:** #735 (P3-5 household-sync hardening scope).
> **Type:** Read-only research/documentation. No production code changed in this issue.

---

## TL;DR

Cookkit's household sync is a **server-authoritative hybrid** — Supabase is the single source of truth for shared rows, WatermelonDB is the per-device offline cache, and conflict resolution is **last-writer-wins by `updated_at`**. This matches the Figma/Linear model recommended by research **[F11]**; we are **not** adopting a pure CRDT (see [What we will NOT do](#what-we-will-not-do)).

The current implementation is hybrid-by-shape but **internally inconsistent and partially unsafe**. Two highest-severity defects stand out:

1. **[HIGH] Irreversible deletes.** `HouseholdRealtimeService.handleDelete` calls `existing.destroyPermanently()` (`HouseholdRealtimeService.ts:193`) — a hard, non-recoverable delete with no tombstone, and the `stock` table has no soft-delete columns (`schema.ts:114-131`). A fat-finger delete on device A irreversibly removes the row on device B, with no undo.
2. **[HIGH] Silent local-edit clobber.** The batch pull path's `prepareUpdate` (`HouseholdSyncService.ts:99-114`) overwrites every local field with the remote value **without comparing `updated_at`** — unlike the realtime path, which does guard (`HouseholdRealtimeService.ts:150-157`). An offline edit followed by a full sync can be silently overwritten by a stale remote row.

> **Line-number note.** Issue #719 cites anchors from a pre-refactor snapshot. A "Bolt Performance Optimization" pass (full-table scans replaced with `Q.where('supabase_id', …)` indexed lookups) shifted several line numbers down by ~10-40. This audit cites the **current** line numbers at the PR's HEAD; both the cited behavior and the file:line anchors were verified by reading the files in this worktree, and the table below maps each to its issue anchor so reviewers can reconcile.

---

## 1. The two sync paths

Both paths read from / write to the same shared `stock` rows via the low-level Supabase surface `data/supabase-api/HouseholdApi.ts`. They differ in trigger, granularity, and — critically — in their conflict logic.

### 1.1 Batch path — `HouseholdSyncService`

`data/services/HouseholdSyncService.ts`

- `syncHousehold(householdSupabaseId)` (`:27`) runs `pushLocalChanges()` then `pullRemoteChanges()`, and advances the MMKV marker `household_last_sync_timestamp` **only on the success path** (`:31`).
- `pushLocalChanges()` (`:37`) fetches **all** local stock, filters in JS for `household_id === target && updatedAt > lastSync`, and upserts via `householdApi.upsertSharedStock` (`:71`). It stamps `updated_at: new Date().toISOString()` on the pushed row (`:68`) — client wall-clock time.
- `pullRemoteChanges()` (`:74`) calls `householdApi.getSharedStock(householdId, since)` with `since = lastSync` (`:76-78`), then in a single `database.write` batch builds a `Map` of existing rows by `supabase_id` (`:89-94`) and for each remote row either `prepareUpdate` (`:99-114`) or `prepareCreate` (`:116-129`).
- **The `prepareUpdate` block (`:99-114`) is the defect:** it unconditionally copies `name`, `quantity`, `unit`, `expiryDate`, `imageUrl`, `x`, `y`, `scale`, `householdId`, `addedByUserId` from the remote row onto the local record. There is **no `updated_at` comparison**. If the remote row is older than the local one, the local (fresher) edit is overwritten.

### 1.2 Realtime path — `HouseholdRealtimeService`

`data/services/HouseholdRealtimeService.ts`

- `subscribe(householdSupabaseId)` (`:13`) opens a Supabase channel `household-stock:<id>` filtered by `household_id=eq.<id>` (`:30-39`), dispatching on `INSERT` / `UPDATE` / `DELETE`.
- **Own-change suppression (`:43-46`):** every event is skipped if `recordUserId === userId`, where `recordUserId` is read from `added_by_user_id`. This is a **user-id** heuristic, not an "originated-on-this-device" token — two edits by the same user on two devices will both be suppressed on the wrong device, and a delete has no `added_by_user_id` provenance check.
- `handleInsert` (`:77`): targeted `Q.where('supabase_id', record.id)` lookup (`:94-96`), no-op if present, else create.
- `handleUpdate` (`:121`): targeted lookup (`:139-141`); if missing, delegates to `handleInsert`. **Otherwise guards:** computes `remoteUpdatedAt` and `localUpdatedAt` and `return`s if `remoteUpdatedAt <= localUpdatedAt` (`:150-157`). This is correct LWW.
- `handleDelete` (`:180`): targeted lookup (`:185-187`); if found, calls `existing.destroyPermanently()` (`:193`) inside `database.write`. **This is the irreversible-delete defect.** There is no soft-delete column to set, no tombstone, and no provenance check that the delete originated elsewhere.

### 1.3 What is NOT a sync trigger

`app/_layout.tsx` has **no** household-sync or realtime-subscribe call (verified — its only subscription-related import is `invalidateSubscriptionEntitlementsQuery`, an unrelated RevenueCat query). Sync runs **only** on explicit lifecycle actions invoked from `data/api/householdApi.ts`: `createHousehold` (`:141-142`), `joinHousehold` (`:208-209`), `leaveHousehold`/`dissolveHousehold` (unsubscribe only, `:222`/`:270`), `fetchCurrentHousehold` (subscribe only, `:36`), and `syncSharedStock` (`:346`). Between those explicit actions a device can show indefinitely stale data (see defect #6).

---

## 2. Classification against the [F11] taxonomy

[F11] frames three models:

| Model | Description | Cookkit? |
| --- | --- | --- |
| **Pure CRDT** | Decentralized; every replica merges without a central authority; conflict-free by construction; high perf/memory/engineering cost. | **No.** No CRDT library, no vector clocks, no merge tree. |
| **Server-authoritative** | One source of truth; client writes go through the server; no offline writes. | **Partially.** Supabase is authoritative, but Cookkit writes locally first (offline-capable), so it is not pure server-authoritative. |
| **Hybrid (local-first UX + server-authoritative sync)** | Optimistic local writes, offline-capable; server is the merge authority; LWW or simple field merge. This is what **Figma** and **Linear** ship per [F11]. | **Yes — this is Cookkit.** |

**Cookkit is the Figma/Linear-style hybrid.** Local WatermelonDB is the read source and accepts optimistic offline writes; Supabase is the merge authority for shared rows; conflict resolution is LWW by `updated_at` (correct in the realtime path, missing in the batch path). The ADR ([`004`](./adr/004-sync-conflict-resolution.md)) confirms and locks this classification.

---

## 3. Verified defects

Each defect was read out of the live code at the PR's HEAD. Severity rating in the right column is this audit's recommendation for P3-5 prioritization.

| # | Defect | Verified file:line (HEAD) | Issue anchor | Severity |
| --- | --- | --- | --- | --- |
| 1 | **Divergent conflict logic.** Batch pull `prepareUpdate` overwrites all fields with no `updated_at` guard; realtime `handleUpdate` does guard. Same row, two rules. | `HouseholdSyncService.ts:99-114` (no guard) vs `HouseholdRealtimeService.ts:150-157` (guards) | `:90-105` vs `:142-150` | **HIGH** (silent local-edit clobber) |
| 2 | **Irreversible cross-device delete.** `handleDelete` calls `destroyPermanently()`; no `is_archived`/`deleted_at` on `stock`; own-delete detection is by user-id only. | `HouseholdRealtimeService.ts:193`; `schema.ts:114-131`; own-change `:43-46` | `:182`; `:114-131` | **HIGH** (data loss, no undo) |
| 3 | **No `synced_at` / sync-status column on the synced model.** `stock` lacks `synced_at` while `recipe` and `ingredient_category` carry it — the column exists in the codebase but was not applied to the actual shared surface. | `schema.ts:114-131` (absent) vs `schema.ts:31` (`recipe.synced_at`) and `schema.ts:144` (`ingredient_category.synced_at`) | same | **MEDIUM** (per-record sync state unknowable; no retry-on-failure) |
| 4 | **Full-table fetches in per-item loops (partially mitigated).** Batch `pullRemoteChanges` now builds a `Map` once (`:89-94`, fixed from the O(rows×items) scan), but `pushLocalChanges` still fetches **all** stock and filters in JS (`:42-49`). The realtime handlers were already converted to indexed `Q.where('supabase_id', …)` lookups (`:94-96`, `:139-141`, `:185-187`). | `HouseholdSyncService.ts:42-49` (still full-scan); realtime handlers already indexed | `:87-88`; `:92-93,134-135,176-177` | **LOW** (mitigated in realtime; remains in `pushLocalChanges`) |
| 5 | **Single try/catch error swallow + marker advanced on partial success.** `syncHousehold` wraps push+pull in one `try/catch` that only `log.error`s (`:32-34`); realtime handler failures are caught and logged per-event (`:116-118`, `:175-177`, `:197-199`) with no retry. No telemetry distinguishes "synced with N conflicts" from "threw, data may diverge." | `HouseholdSyncService.ts:32-34`; `HouseholdRealtimeService.ts:116-118,175-177,197-199` | `:32-34` | **MEDIUM** (silent divergence; no observability) |
| 6 | **Sync only on explicit lifecycle actions.** No `_layout.tsx` foreground/reconnect trigger; a device can show stale shared pantry indefinitely between create/join/leave/member-add. | `app/_layout.tsx` (no sync call); triggers in `data/api/householdApi.ts:36,141-142,208-209,222,270,346` | same | **MEDIUM** (staleness, not corruption) |

> Note on defect #4: the realtime handlers were already optimized to indexed lookups (the "⚡ Bolt" comments are present in the file). The issue's original full-table-scan claim is **no longer fully accurate** for the realtime path; the residual full-scan is in `pushLocalChanges` (`HouseholdSyncService.ts:42-49`), which still fetches all stock rows. The audit records this correction so P3-5 scopes only the remaining hot spot.

---

## 4. Edge-case matrix

For each scenario: **observed current behavior** (with file:line) vs. **desired behavior** under the chosen ADR (server-authoritative hybrid, LWW by `updated_at`, soft delete with tombstone). Items marked _inferred from code; requires 2-device test in follow-up_ are behaviors that cannot be fully confirmed by code reading alone.

### (a) Concurrent edit on 2 devices

| | |
| --- | --- |
| **Observed** | Device A and B both edit the same row. Each writes locally, then pushes to Supabase. Supabase applies the second upsert and stamps its `updated_at`. The realtime path on the losing device receives the UPDATE and — if the winning row is genuinely newer — correctly skips (`HouseholdRealtimeService.ts:150-157`). **However**, if the losing device later runs a full `syncHousehold`, the batch `prepareUpdate` (`HouseholdSyncService.ts:99-114`) overwrites its local copy unconditionally, so the *winner* is whatever the batch pull happens to return last — which is server-authoritative but applied without a guard, masking the real ordering. Net: usually converges to server-authoritative state, but via inconsistent rules. _Inferred from code; requires 2-device test._ |
| **Desired** | One timestamp-comparing resolver on both paths; the row with the greater server-side `updated_at` wins on both devices deterministically. |

### (b) Delete-then-edit on different devices

| | |
| --- | --- |
| **Observed** | Device A deletes row X (no Supabase delete is wired through the realtime DELETE path from the app — `leaveHousehold`/`dissolveHousehold` clear `household_id` rather than deleting stock rows; a true row delete reaching Supabase would propagate). If a DELETE event reaches device B, `handleDelete` calls `existing.destroyPermanently()` (`HouseholdRealtimeService.ts:193`) — **device B's local copy, including any unsynced local edit to X, is destroyed irreversibly**, with no tombstone and no undo. Device B cannot recover X even if it had a fresher edit. _Inferred from code; requires 2-device test._ |
| **Desired** | Soft delete (`is_archived`/`deleted_at`) with a tombstone; a delete resolves on the same LWW basis, so a delete cannot clobber a strictly-fresher edit; the user can undo for a grace window. |

### (c) Member leaves household mid-sync

| | |
| --- | --- |
| **Observed** | `leaveHousehold` (`householdApi.ts:218`) first `unsubscribe()` (`:222`), then `removeMember` from Supabase (`:224`), then locally destroys the shared stock rows, the membership, and the household record (`:232-256`). If a realtime event is in flight when `unsubscribe` runs, it may still land and call `handleDelete`/`handleUpdate` on rows that `leaveHousehold` is about to destroy — a benign race (the targeted lookup no-ops if already gone). There is no transactional guarantee that the local teardown and the Supabase `removeMember` are atomic; a crash between them leaves a half-left state. |
| **Desired** | Local teardown should be idempotent and tolerate in-flight realtime events; consider a single `database.write` that also marks the household as "leaving" so straggler events are ignored. |

### (d) Member rejoins with stale local cache

| | |
| --- | --- |
| **Observed** | `joinHousehold` (`householdApi.ts:155`) creates fresh local `household` and `household_member` records, then calls `syncHousehold` (`:208`), which pulls `stock` rows with `since = lastSync`. **If the device's `household_last_sync_timestamp` is newer than the rows the household gained while the member was away, those rows are never pulled** (the `gt('updated_at', since)` filter in `householdApi.getSharedStock`, `HouseholdApi.ts:156-158`, excludes them). The rejoining member sees a stale pantry until a row is touched again. _Inferred from code; requires 2-device test._ |
| **Desired** | On (re)join, do a full pull (no `since` filter), or reset the local marker for that household. |

### (e) Device clock skew makes "last" writer wrong

| | |
| --- | --- |
| **Observed** | `pushLocalChanges` stamps `updated_at: new Date().toISOString()` from **client wall-clock** (`HouseholdSyncService.ts:68`). A device with a fast clock wins LWW comparisons it should lose. The realtime guard (`HouseholdRealtimeService.ts:150-157`) compares this client-stamped remote `updated_at` against the local `updatedAt`, propagating the skew. _Inferred from code; requires 2-device test._ |
| **Desired** | Treat server time as authoritative for `updated_at` on shared rows (e.g. let a Supabase trigger/default set `updated_at`, or ignore client-supplied `updated_at` on upsert). LWW by server time is skew-tolerant; LWW by client time is not. |

### (f) Offline edit then full sync

| | |
| --- | --- |
| **Observed** | Device is offline, edits row X locally (WatermelonDB `updated_at` advances). On reconnect, an explicit `syncHousehold` runs: `pushLocalChanges` pushes X (client `updated_at`), then `pullRemoteChanges` fetches rows newer than `lastSync`. If the remote X is older than the local X but still newer than `lastSync` (e.g. another device's edit landed just before the marker was last advanced), the batch `prepareUpdate` (`HouseholdSyncService.ts:99-114`) **overwrites the fresher local X with the staler remote X, with no guard.** This is the concrete realization of defect #1 and the second highest-severity finding. _Inferred from code; requires 2-device test._ |
| **Desired** | Batch pull applies the same `remoteUpdatedAt <= localUpdatedAt` guard as the realtime path; the fresher local edit is preserved. |

---

## 5. API layering (role clarity — not a duplicate)

Issue #719's draft once framed `data/api/householdApi.ts` and `data/supabase-api/HouseholdApi.ts` as parallel/duplicate modules. **They are layered and both live, by design:**

| Module | Role | Imported by |
| --- | --- | --- |
| `data/supabase-api/HouseholdApi.ts` | **Low-level raw Supabase surface.** Thin wrappers over `supabase.from('households' \| 'household_members' \| 'stock')` — insert/select/update/delete/upsert, no business logic. | `data/api/householdApi.ts:1`; `data/services/HouseholdSyncService.ts:2` (direct). |
| `data/api/householdApi.ts` | **High-level lifecycle orchestrator.** Composes the low-level API + both sync services + auth + WatermelonDB into household flows (create/join/leave/dissolve/regenerate/sync). | `hooks/queries/useHouseholdQueries.ts:3`. |

Verified at HEAD: `data/api/householdApi.ts` imports `householdApi` from `~/data/supabase-api/HouseholdApi` (`:1`) and both services (`:2-3`); `HouseholdSyncService.ts:2` imports the low-level API directly. Both modules export distinct, non-overlapping surface area (lifecycle functions vs. raw CRUD). Neither is a stale copy of the other.

**Recommendation (follow-up, not applied here):** add a one-line header comment to each module stating its tier (e.g. `// Low-level Supabase surface — wrapped by data/api/householdApi.ts; also imported directly by HouseholdSyncService`) and an index entry in `docs/AI_CONTEXT.md` so future readers and agents do not mistake one for a duplicate. This audit does **not** delete or merge either module.

---

## 6. What we will NOT do

Per **[F11]**, pure-CRDT adoption is explicitly **ruled out**:

- **No CRDT library** (Yjs, Automerge, or similar). The perf/memory and engineering cost is not justified at household scale (2-6 members, low concurrency).
- **No merge tree / per-field versioning** for stock rows. LWW by `updated_at` is sufficient for pantry fields (name/quantity/unit/expiry); field-level merge is the cost Figma/Linear pay for rich-document collaboration, which Cookkit does not have.
- **No decentralized merge.** Supabase remains the single merge authority for shared rows.
- **No scope expansion beyond the verified defects.** P3-5 hardening is restricted to the six items in [§3](#3-verified-defects).

The audit accepts the risk note from #719: at today's household scale the current strategy is _directionally good enough_, and the team should not over-engineer. Premature CRDT/merge-tree investment has real perf/memory cost ([F11]); the cheapest correctness floor is to **unify the two paths on one LWW resolver + soft delete**, not to change the model.

---

## 7. Follow-up issue candidates (do NOT file here)

These become the P3-5 scope for #735. Listed for reference only; this issue files none of them.

1. Add `synced_at` + `is_archived` (+ `deleted_at`) to `stock` + a schema migration (schema version bump), mirroring `recipe.synced_at`.
2. Unify the batch and realtime conflict paths on a single timestamp-comparing resolver (lift the `HouseholdRealtimeService.handleUpdate` guard into a shared helper; call it from `HouseholdSyncService.pullRemoteChanges.prepareUpdate`).
3. Replace `destroyPermanently()` in `HouseholdRealtimeService.handleDelete` with a soft delete (`is_archived = true`, `deleted_at = now`) + tombstone; reserve `destroyPermanently` for local-only teardown (`leaveHousehold`).
4. Replace `pushLocalChanges`' full-table scan + JS filter (`HouseholdSyncService.ts:42-49`) with an indexed `Q.where('household_id', …)` query (the column is already indexed, `schema.ts:126`).
5. Add an app-foreground / network-reconnect sync trigger (today sync runs only on explicit lifecycle actions; see defect #6).
6. Add Sentry breadcrumbs distinguishing sync outcomes (pushed N, pulled M, conflicts skipped K, threw) so "synced" and "threw, data may diverge" are distinguishable (defect #5).
7. Make `updated_at` server-authoritative on shared rows (Supabase trigger/default), so LWW is skew-tolerant (edge case (e)).
8. Reset/full-pull the local marker on (re)join so a returning member does not see a stale pantry (edge case (d)).

### Tests those follow-ups should add (not this issue)

- Unit tests under `data/services/__tests__/` for the unified conflict resolver.
- Integration test of two-device concurrent edit using a Supabase test project + two WatermelonDB instances.
- Regression test asserting `handleDelete` does **not** call `destroyPermanently()` after the soft-delete fix.

---

## Verification (how a reviewer confirms this audit)

- Every defect entry cites a real file:line at HEAD. `grep -n` each anchor:
  - `HouseholdSyncService.ts`: `prepareUpdate` no-guard at `:99-114`; single try/catch at `:32-34`; full-scan push at `:42-49`.
  - `HouseholdRealtimeService.ts`: `handleUpdate` guard at `:150-157`; `handleDelete` `destroyPermanently()` at `:193`; own-change heuristic at `:43-46`.
  - `schema.ts`: `stock` (`:114-131`) lacks `synced_at`/`is_archived`/`deleted_at`; `recipe.synced_at` at `:31`; `ingredient_category.synced_at` at `:144`.
  - `data/api/householdApi.ts:1` imports `~/data/supabase-api/HouseholdApi`; `HouseholdSyncService.ts:2` imports it directly; `app/_layout.tsx` has no sync call.
- The ADR's classification (server-authoritative hybrid, not CRDT) matches the code: one merge authority (Supabase), local-first optimistic writes, LWW by `updated_at`.
- Every edge case in [§4](#4-edge-case-matrix) maps to a code path that exists; the "desired" column for each is consistent with the ADR strategy.

---

## Research citations

- **[F11]** — Pure-CRDT cost rationale; Figma/Linear hybrid precedent. Used to justify declining CRDT and confirming the hybrid.
- **[F10]** — CozZo cloud decommission / late-2025 EOL build validates the WatermelonDB-first offline moat; credible only if sync correctness is owned.
- **[F9]** — AI-tier apps churn faster and refund more (category-agnostic A/B-test medians). Cited only as **directional** motivation for documenting sync correctness before scaling households; the figures do **not** directly apply to this research issue.
- **[F5]** — Monetization refund/churn medians. Category-agnostic; does not directly apply to a research/audit issue.

Recipe-manager / meal-planner competitor parity (Paprika, Mela, Plan to Eat, Mealime, Prepear) did not yield confirmed 3-vote sync-conflict claims in research, so this audit defines Cookkit's own correctness bar rather than chasing parity.
