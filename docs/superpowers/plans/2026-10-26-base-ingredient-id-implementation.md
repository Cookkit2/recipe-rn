# Preserve catalog ingredient IDs implementation plan

> Execute with subagent-driven development and test-first changes; retain the existing PR branch and keep implementation tasks in separate owned files.

**Goal:** Carry existing Supabase catalog IDs through pantry persistence, conservative identity matching, shared sync and an offline catalog dictionary without changing stock/batch identities.

**Architecture:** `Stock.baseIngredientId?: string | null` maps to an optional indexed `base_ingredient_id`; omitted updates preserve it and explicit null clears it. Resolve catalog identity before entering writers. Writers compare known IDs plus meaningful name/form attributes, retain separate batches, and clear stale references on food corrections. Shared DTOs carry the field through existing LWW flows. A separate Watermelon catalog cache publishes complete paginated snapshots atomically; a bounded background linker only links missing, uniquely resolved rows after rechecking the current identity.

**Stack:** TypeScript, WatermelonDB schema migrations/Loki tests, existing Supabase REST client, Jest, declared Bun 1.4.3.

## Tasks

- [x] Establish deployed/read-only catalog contract and inspect current storage/sync ADRs; record old-client-null rollout constraints.
- [x] Add migration 8→9, Stock/facade/repository/presentation field mapping with tests for reload, unrelated edits, explicit null and preservation of row/related metadata.
- [x] Replace fabricated helper IDs with explicit unresolved values and verify supplied metadata; round-trip create/update/batch/Result APIs and camera/manual/voice paths.
- [x] Extend Assistant real-database tests and implement ID-aware add/rename/merge while preserving category, variant, unit and batch safeguards.
- [x] Extend batch/realtime/shared-publication/queue serializers with tests; retain timestamp guards and document a safe old-client rollout rule.
- [x] Add cache tables in the next sequential migration, atomic paginated dictionary refresh, local-first exact/alias resolver, ambiguity handling and last-good-cache tests.
- [x] Add idempotent bounded background linking tests, including concurrent rename, invalid existing reference and failed/ambiguous/vague lookup; wire background startup without blocking UI.
- [x] Review spec compliance and code quality; run full tests/lint/typecheck and update the original handoff, docs and PR #1245 with actual results and device-check limitations.

## Verification

Run focused Jest via `npm exec --yes --package=bun@1.4.3 -- bun run test -- --runInBand <paths>`, then lint/typecheck and the full Jest suite. Check deployed cloud contract with read-only operations if configured; no cloud schema mutation or catalog writes. Device restart/two-device sync checks must be reported as unrun unless actually exercised.

## Outcome

Implemented both persistence/sync and offline dictionary phases in existing PR #1245. Review findings (variant aliases, nullable cloud aliases, stale UI metadata, delayed renames, mixed-reference batch destinations and lost storage steps) have regression tests. Device restart/native SQLite and two-device cloud-write E2E remain unrun; the handoff documents this and the old-client rollout constraint. Final verification: 205 Jest suites, 1,864 tests, `bun run lint` (formatting and strict TypeScript), and `git diff --check` passed.
