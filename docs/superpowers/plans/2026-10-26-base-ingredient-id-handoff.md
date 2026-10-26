# Handoff: preserve existing base ingredient IDs in pantry stock

Date: 2026-10-26

**Goal:** Reuse the existing Supabase `base_ingredient.id` throughout local pantry persistence, matching, and sync. Do not create another ingredient ID system.

**Status:** Implemented in [PR #1245](https://github.com/Cookkit2/recipe-rn/pull/1245), including the offline dictionary follow-up. Automated verification and runtime limitations are recorded below. Original investigation notes are retained for context.

## Context and starting point

- [PR #1234](https://github.com/Cookkit2/recipe-rn/pull/1234) added Assistant name validation, conservative normalization/alias matching, atomic pantry mutations, and explicit legacy corrections. It is merged into `master`.
- That PR intentionally did not add local storage for catalog IDs. Its resolver returns `{ id, name, aliases }`, but pantry matching uses names and aliases rather than the returned `id`.
- The checkout used to write this handoff is on `codex/assistant-local-improvements`, which does not contain all of that merged work. Start implementation from the latest fetched `origin/master` in an appropriately isolated workspace; re-read the current files and schema version there.
- Preserve unrelated changes in the user's checkout. Read applicable `AGENTS.md` instructions before editing source.
- Follow ADR 003 (`docs/adr/003-three-tier-storage.md`) and ADR 004 (`docs/adr/004-sync-conflict-resolution.md`): local UI reads use WatermelonDB, shared rows remain server-authoritative, and existing sync conflict rules remain in force.

## What already exists

| Identifier                                   | Meaning                                   | Required behavior                                      |
| -------------------------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| `base_ingredient.id`                         | Canonical catalog ingredient, such as egg | Reuse as the food reference                            |
| Local `stock.id`                             | One pantry stock row or batch             | Preserve; separate batches can reference the same food |
| Local `stock.supabaseId` / remote `stock.id` | Shared pantry row identity                | Keep separate from the ingredient reference            |

Example: two cartons of eggs with different expiry dates may have different stock IDs and the same base ingredient ID. A common ingredient ID does not authorize merging their quantities automatically.

## Confirmed gaps

| Location                                       | Observed gap                                                                                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/db/schema.ts`, `data/db/models/Stock.ts` | Local stock has no persisted `base_ingredient_id` column or mapped model property. The inspected schema is version 8; use the actual latest version when implementing. |
| `types/PantryItem.ts`                          | `base_ingredient_id` already exists as optional presentation data, but that does not make it persistent.                                                               |
| `data/api/assistant-pantry.ts` from PR #1234   | Catalog resolution includes an ID; the writer retains canonical names and aliases but does not retain that ID.                                                         |
| `data/api/api-helpers.ts`                      | `resolveBaseIngredientId` can return a fabricated `temp_<name>` value. That is not an authoritative catalog ID.                                                        |
| `data/db/DatabaseFacade.ts`                    | Stock creation interfaces and `createStock` / `prepareCreateStock` mappings omit the base ingredient reference passed by helpers.                                      |
| `data/api/pantryApi.ts`                        | Stock-to-pantry conversion does not round-trip a persisted catalog reference. Audit batch and Result-based paths too.                                                  |
| `data/services/HouseholdSyncService.ts`        | Push currently assigns `base_ingredient_id: null`; pull mappings omit the remote ingredient reference.                                                                 |
| `data/services/HouseholdRealtimeService.ts`    | Insert/update mappings need to carry the reference too. Fixing batch sync alone is insufficient.                                                                       |

The cloud schema already exposes `stock.base_ingredient_id` and ingredient synonym relationships in `lib/supabase/supabase-types.ts`. Verify the deployed contract before changing backend behavior; a new cloud ID column is not assumed necessary.

## Scope and identity rules

1. Store a real catalog ID when resolution is unambiguous. Leave unresolved/custom foods without a catalog reference; do not store fabricated IDs in this field or create catalog entries automatically.
2. Keep the local stock ID and all batch metadata intact. Ingredient identity, unit compatibility, and batch selection remain separate decisions.
3. Two conflicting known catalog IDs must not be merged because their names resemble each other. If either ID is unknown, use the conservative matching policy from PR #1234 and promote to a known ID only after an unambiguous resolution.
4. The catalog must preserve meaningful differences such as milk/coconut milk and fresh/canned forms. If it uses a coarse shared ID for variants, retain explicit distinguishing attributes in the identity check; do not erase those differences merely because the ID matches.
5. Renaming to a different ingredient must replace the old reference with the newly resolved one, or clear it if the new identity remains unresolved. A quantity-only edit must preserve the reference.
6. Reject vague categories and keep existing clarification behavior. Catalog membership or an ID does not make a category such as "vegetables" a specific food.
7. No Elasticsearch, fuzzy auto-correction, auth redesign, sync architecture replacement, or automatic stock consolidation is required for this work.

## Phase 1: close the persistence and sync gap

### Task 1 — confirm the current base and map the data contract

- [x] Inspect the latest `origin/master`, PR #1234's merged behavior, applicable agent instructions, and the two storage/sync ADRs.
- [x] Trace the ingredient reference through Assistant, manual, camera, voice, batch import, stock conversion, household batch sync, and realtime sync. Record each write/read mapping that can drop it.
- [x] Confirm cloud ID format, nullability, foreign-key behavior, and whether variants have distinct IDs. Do not infer catalog equivalence from display names alone.

**Deliverable:** One agreed optional/nullable local field, `Stock.baseIngredientId` mapped to `base_ingredient_id`, referring exclusively to the existing catalog ID.

### Task 2 — add local persistence with a safe migration

Files: `data/db/schema.ts`, `data/db/migrations.ts`, `data/db/models/Stock.ts`.

- [x] Add a migration test first: upgrade the immediately preceding schema while preserving stock IDs, names, quantities, units, expiry dates, images, ownership, and related rows.
- [x] Add an optional indexed string column to `stock`; increment the actual current schema version and add only the corresponding migration delta.
- [x] Map the field on `Stock` and its input/update types. Support explicitly clearing a reference without confusing that with an omitted update field.
- [x] Verify a known ID survives a database reload and existing rows remain readable without one.

**Acceptance:** The database persists a catalog reference without forcing one onto custom or legacy stock.

### Task 3 — carry the reference through every pantry boundary

Files: `data/db/DatabaseFacade.ts`, `data/api/api-helpers.ts`, `data/api/pantryApi.ts`, `types/PantryItem.ts`, and the creation callers found in Task 1.

- [x] Add round-trip tests before changing mappings: create, prepared batch create, update, fetch, and Result-based APIs must return the same ID they saved.
- [x] Carry `baseIngredientId` through facade interfaces, preparation helpers, model writes, and pantry conversion. Keep camelCase model fields and snake_case API fields explicitly mapped.
- [x] Replace the fabricated `temp_<name>` fallback with an explicit unresolved result. Audit all callers before changing its return type.
- [x] Preserve already supplied, valid catalog references from camera/manual/voice metadata. Detect conflicting identity information instead of silently overwriting it.
- [x] Preserve the ID on unrelated edits; update or clear it deliberately when food identity changes.

**Acceptance:** No supported pantry entry path silently drops or fabricates a catalog reference.

### Task 4 — use the resolved ID in Assistant mutations

Files: `data/api/assistant-pantry.ts`, `data/api/pantryApi.ts`, `lib/agent/tools/local-pantry.ts`, and relevant agent/pantry types.

- [x] Extend the existing real-database tests in `data/api/__tests__/assistant-pantry.test.ts` before implementation.
- [x] Carry the resolver's existing `id` into new stock and unambiguously resolved legacy rows. Retain canonical names and approved aliases alongside it.
- [x] Prefer compatible known identity references for matching. Preserve the rule that conflicting known IDs cannot fall back to a name-only merge.
- [x] Keep current stock selection, compatibility checks, and writes inside the WatermelonDB writer. Keep catalog network operations outside it.
- [x] Cover rename and explicit merge: the surviving row must have the correct reference, with no stale ID or obsolete aliases after a food correction.
- [x] Preserve clarification, query invalidation, metadata retention, and the guard against guessed retries within a model turn.

**Acceptance:** "Egg" and "eggs" can resolve to the same existing catalog ID while separate pantry batches remain separate when required.

### Task 5 — preserve IDs through batch and realtime sync

Files: `data/services/HouseholdSyncService.ts`, `data/services/HouseholdRealtimeService.ts`, `data/supabase-api/HouseholdApi.ts`, `data/api/householdApi.ts`, and their tests.

- [x] Add tests for push payloads and both insert/update pull paths before changing production mappings.
- [x] Send the stored real ID instead of unconditional null. Populate the local reference from remote rows on both batch and realtime paths.
- [x] Check shared-stock publication, retry queues, household transitions, and DTO serialization for any additional mapping that drops the field.
- [x] Define missing-field versus explicit-clear behavior at serialization boundaries. Ordinary edits must not erase a known reference; a confirmed food change to an unresolved identity must be able to clear it.
- [x] Account for older deployed clients that still send unconditional null. Verify compatibility or provide a rollout rule before claiming end-to-end preservation.
- [x] Preserve the existing server-authoritative conflict policy and household access boundaries. Do not introduce per-field conflict counters or a new sync architecture.

**Acceptance:** A reference survives local edit, push, remote persistence, pull/realtime delivery, and restart on another device, without overwriting fresher data.

### Task 6 — link existing rows conservatively

- [x] Add idempotent backfill tests before implementing a bounded background linking operation.
- [x] Link only missing references with a unique exact normalized canonical-name or approved-alias match. Validate references already present; never manufacture replacements.
- [x] Leave vague names, ambiguous aliases, and unknown custom foods unresolved. Do not automatically rename, delete, or consolidate stock rows.
- [x] Run linking outside the schema migration and avoid blocking app startup. Preserve row IDs, quantities, units, expiry dates, and metadata.
- [x] Recheck the row before applying a delayed lookup result so a concurrent user rename cannot receive an obsolete ID.

**Acceptance:** Re-running linking does not change previously correct data or convert uncertainty into a false identity.

## Phase 2: cache the ingredient dictionary for offline resolution

This improves resolution coverage; it is a separate follow-up to carrying IDs that are already known.

- [x] Cache canonical catalog IDs, names, approved aliases, and normalized lookup keys in the local relational layer. Reuse existing structures only if they represent catalog identities; per-stock synonyms alone are not a complete catalog cache.
- [x] Fetch the catalog and aliases with pagination so server row limits do not silently truncate the dictionary. Publish a refresh atomically and retain the last good cache if refreshing fails.
- [x] Apply the same normalization to cached keys and queries. Represent aliases that map to multiple IDs as ambiguous, rather than selecting the first result.
- [x] Resolve against the local dictionary first. Use the cloud for cache misses when available; retain the explicit custom/unresolved path offline.
- [x] Test offline resolution of an alias the user has never previously added, cache refresh failure, conflicting aliases, and catalog-name updates without ID changes.

**Acceptance:** Offline resolution can recover a known catalog ID without depending on whether that alias was previously used in the pantry.

## Required regression cases

| Scenario                                                                 | Expected result                                                 |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `egg` / `eggs`, known catalog ingredient                                 | Same existing base ingredient ID                                |
| `aubergine` / `eggplant`, approved catalog alias                         | Same ID, including after restart                                |
| Milk / coconut milk                                                      | Distinct identity; no accidental merge                          |
| Two stock batches with the same ingredient ID and different expiry dates | Keep their stock IDs and quantities separate                    |
| Same display name but conflicting known IDs                              | Clarify or reject the merge                                     |
| Unknown specific custom food                                             | Remains usable without a fabricated catalog ID                  |
| "Vegetables"                                                             | Clarification; no invented specific food or ID                  |
| Quantity/image-only edit                                                 | Preserve the ingredient reference                               |
| Rename to another known food / unresolved custom food                    | Replace / explicitly clear the old reference                    |
| Batch sync and realtime update                                           | Both preserve the reference and respect existing conflict rules |
| Backfill lookup finishes after user renames the row                      | Do not apply the obsolete result                                |
| Dictionary refresh fails                                                 | Last good cache and existing stock remain intact                |

## Verification and handoff completion

Use Bun as declared by the latest `package.json`. For focused Jest runs use `bun run test -- ...`, not Bun's native `bun test` runner.

```bash
bun run typecheck
bun run lint
bun run test -- --runInBand
```

- [x] Migration, persistence round-trip, Assistant identity, batch/realtime sync, and conservative backfill tests pass.
- [x] Report device verification status: native device restart and two-device household round-trip were not run; see verification notes below.
- [x] Inspect new source, serializers, and fixtures for fabricated catalog IDs or unconditional null assignments. Preserve legitimate explicit unresolved values.
- [x] Document any unresolved catalog-variant or old-client compatibility constraint. Do not claim offline dictionary coverage until Phase 2 is implemented and tested.
- [x] Update the handoff with implementation PR links and actual verification results when that work is authorized and completed.

## Implementation notes — 2026-10-26

- Same branch and PR: `codex/assistant-intent-pantry-read`, [#1245](https://github.com/Cookkit2/recipe-rn/pull/1245), based on fetched `origin/master` (`f99d9e29`). The original working checkout remains untouched.
- Schema 9 adds optional indexed `stock.base_ingredient_id`; schema 10 adds canonical and alias cache tables. Real Loki tests upgrade persisted schema 8 directly through both migrations and preserve IDs, ownership, expiry, presentation and five related tables. A fresh adapter reload verifies persistence.
- Pantry APIs, facade, prepared creates, projections, Assistant and batch paths retain the existing catalog UUID. Unknown custom foods use null. Supplied conflicting/fabricated metadata is rejected. A supplied UUID from existing camera/manual metadata can be retained offline before the first complete dictionary; this is trusted caller metadata, not proof of cloud membership.
- Assistant stores/promotes uniquely resolved IDs, rejects conflicting known IDs, and preserves explicit food forms even when the catalog has one coarse ID. Whole eggs, whites and yolks remain separate. Variant detection also considers alternate names (chickpea/garbanzo bean/canned garbanzo bean).
- Detail and recognition corrections clear inherited identity metadata, recheck delayed results, and preserve new food forms. Regular API renames remove obsolete aliases atomically. Unrelated full-detail edits preserve unchanged IDs without requiring dictionary revalidation.
- Batch compatibility includes expiry, storage, image, positions, categories, aliases and storage instructions. Matching destinations are prepared once; different metadata stays in distinct rows. No background consolidation runs.
- Batch/realtime mappings preserve omitted fields and explicit clears. Publication delegates to these mappings. Upsert calls partition rows with/without references so PostgREST cannot fill an omitted field with null from another row's key set. A versioned validated queue preserves new clears and treats old unconditional queued nulls as omitted.
- New-client uploads omit migration nulls unless identity changed. Intentional clears, including null→null, record Watermelon's changed-column marker. This marker is historical metadata, not proof of local write provenance; existing manual sync does not reset it.
- Canonical/alias refresh reads stable 500-row pages and atomically publishes only a validated complete snapshot. Null-linked cloud aliases are excluded. Ambiguous normalized keys remain unresolved, and failed refreshes retain the last good dictionary. Tests cover a never-used offline alias after adapter reload and a canonical-name refresh with unchanged ID.
- Background linking runs after UI idle in batches of 50, retains an interruption cursor and rechecks name/reference/deletion inside the writer. It leaves vague/custom/ambiguous names alone, reports invalid existing references by count and does not rename or merge stock.

### Deployed contract and rollout limits

Read-only public Supabase requests verified `stock.base_ingredient_id` exists, UUID filtering is enforced, and embedding `base_ingredient` via `pantry_item_base_ingredient_id_fkey` works. The visible dictionary contained 379 canonical rows and 84 aliases at inspection. Nullability is confirmed by the generated nullable client contract; deployed OpenAPI introspection required elevated credentials and was not used. No cloud schema or catalog writes were performed.

The deployed catalog shares egg IDs across whites/yolks, and green-onion/scallion aliases can overlap different IDs. The client preserves food forms and refuses ambiguous dictionary keys.

**Rollout:** all household clients must upgrade before claiming durable ingredient-reference preservation. Older binaries still upload unconditional nulls; distinguishing them from intentional clears requires versioned server protection, which this PR does not deploy. Existing local timestamp guards remain; queued upserts have no server-side LWW guard, so stale queue replay remains an existing sync limitation. This PR does not replace the sync architecture.

### Verification

**Final automated run:** 205 Jest suites and 1,864 tests passed; `bun run lint` passed (Prettier plus strict TypeScript), and `git diff --check` passed. Commands used declared Bun 1.4.3 via `npm exec --yes --package=bun@1.4.3 -- bun ...`. Regression coverage includes persisted migration/reload, API/Assistant round-trips, concurrent rename protection, metadata-aware batches, explicit-null intent, batch/realtime omission and freshness guards, real PostgREST payload serialization, persisted retry queues, dictionary pagination/reload/failure/ambiguity and bounded linking races.

**Not run:** native SQLite/iOS migration and device restart, simulator UI E2E, or authenticated two-device cloud write/pull round-trip. Loki adapter reloads and mocked HTTP/sync tests provide automated evidence, not device or live-cloud end-to-end confirmation.

### Manual E2E checks

Keep IDs out of every UI surface; inspect references only in developer database tooling when needed.

1. Upgrade an installation with existing pantry data: check stock counts, quantities, expiry, images, ownership and storage instructions; restart the app and recheck.
2. Assistant: add eggs, then egg; confirm one compatible selected batch increments. Add a second expiry batch and confirm the Assistant asks which batch to update.
3. Add vegetables/spices: expect a specific-food question and no write. Answer carrots: preserve the pending amount and execute once.
4. Add whole eggs, egg whites and egg yolks: keep distinct forms despite the shared catalog ID. Repeat with milk/coconut milk and canned/fresh variants.
5. Edit only quantity/image/storage on a known item offline: preserve its reference. Rename to another known food, then a custom dish: replace then clear the reference, and never match old aliases afterward.
6. Correct a camera or voice candidate to a different/custom food before saving: no inherited-reference conflict. Change the name while metadata is loading: delayed results must not restore the old food.
7. Import equal foods with different expiry or storage instructions: keep separate batches and instructions. Same compatible batch with mixed known/unresolved metadata must save without a duplicate-operation error.
8. After an online cache refresh, restart offline and add a catalog alias never used in the pantry: resolve its known food reference. Unknown specific custom foods still save without a fabricated ID.
9. With both household clients upgraded, share a known item, edit quantity, sync and restart both; inspect reference survival through batch and realtime. Rename to a custom food on one device and confirm the explicit clear reaches the other. Reconnect after an offline failure and verify queued reference/clear behavior.
10. Ask “Describe my pantry,” follow up with corrections, and cause a failed read: no stock IDs in replies, choices, errors, cards or accessibility labels; the pantry read must not mutate stock.
