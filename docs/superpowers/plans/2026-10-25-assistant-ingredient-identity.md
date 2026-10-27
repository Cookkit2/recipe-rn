# Assistant ingredient identity implementation plan

**Goal:** Reject vague Assistant pantry additions, resolve grammatical duplicates safely, and completely remove the legacy ingredient matcher.

**Architecture:** A pure ingredient identity module owns English noun normalization and explicit aliases. Recipe matching allows only full normalized names and explicit synonyms, with preparation words removed; dietary containment and voice query matching have separate policies. An Assistant-specific pantry mutation service resolves catalog names outside the writer and checks current stock inside a WatermelonDB writer before adding/updating. It returns clarification without mutations for vague names or ambiguous stock selection. Existing general pantry APIs keep their manual-entry semantics.

**Tech stack:** TypeScript, pluralize, WatermelonDB, Jest, AI SDK/Zod, TanStack Query.

## Decisions

- Reject category-only names, including modified categories such as fresh vegetables; allow explicit food mixtures and specific custom ingredients.
- Preserve variety, source and storage/preparation distinctions in identity. Display names need not be singular.
- Resolve catalog canonical names and approved aliases when online; use the same local grammar rules and per-stock synonyms offline. Native stock has no base-ingredient-ID column: do not introduce a schema migration solely for this fix.
- Add quantities only for equivalent units. Different units can be separate stock. Multiple matching stock rows require an explicit stockId before mutation.
- Preserve all metadata on quantity updates. Do not automatically rewrite/delete old vague records. Offer explicit rename by stockId after asking what the record contains.
- Removal by a name resolves plurals but asks which row if several match. Explicit stockId permits removing old vague records.
- Rename preserves metadata and does not silently consolidate existing batches. Compatible legacy duplicates can be consolidated by explicit user instruction; otherwise request clarification rather than losing metadata.
- Tool clarification is ordinary conversation, never a success activity or generic error. A tool result supplies the question even if the model finishes without prose.

## Task 1: Pure policies (red, green)

- [x] Add `utils/__tests__/ingredient-identity.test.ts` and `utils/__tests__/recipe-ingredient-match.test.ts` covering plural pairs, uncountables, multiword names, full-name aliases, categories, food mixtures, false positives and meaningful variants.
- [x] Run `bun run test -- --runInBand utils/__tests__/ingredient-identity.test.ts utils/__tests__/recipe-ingredient-match.test.ts`; confirm missing behavior.
- [x] Implement `utils/ingredient-identity.ts`, `utils/recipe-ingredient-match.ts`; keep allergen phrase containment separate from identity.
- [x] Replace every production import of the legacy matcher, remove it and its old permissive tests, and update active documentation. Remove category-as-synonym matching from recipe availability and stale fuzzy fallbacks where they would undo the replacement policy.
- [x] Re-run pure and affected recipe/voice tests.

## Task 2: Atomic pantry mutations (red, green)

- [x] Add real in-memory WatermelonDB tests for vague input, same-name/plural/alias updates, concurrent additions, quantities/units, metadata, existing duplicates, unknown custom names, rename and removal clarification.
- [x] Run tests before implementation and confirm missing mutation API.
- [x] Implement `data/api/assistant-pantry.ts` with injectable database/catalog resolution and structured result types. Resolve known catalog canonical names/aliases without network calls inside the database writer. Perform all stock reads/decisions/mutations in the writer.
- [x] Wire through `pantryApi`, local agent adapter, tool schema/action, instructions. Add stockId disambiguation and explicit rename.
- [x] Re-run mutation, local adapter, actions and agent integration tests.

## Task 3: Conversation feedback (red, green)

- [x] Add hook tests proving clarification shows the question, no success activity and no error; verify updated/added labels reflect confirmed writes.
- [x] Handle structured results in `hooks/useCookingAgentChat.ts` and carry clarification context into subsequent turns.
- [x] Re-run hook tests and provider integration tests.

## Task 4: Verify and publish

- [x] Run `bun run typecheck`, `bun run lint`, and `bun run test -- --runInBand`.
- [x] Check deleted matcher references in active code, inspect the diff and request independent code review. Address material findings with tests.
- [ ] Commit, push `codex/assistant-ingredient-identity`, create a PR targeting `master` using `gh`, and attach the PR to this chat.

## Baseline

- Fresh branch from fetched `origin/master`.
- 4 focused suites, 41 tests passed before implementation.
- Dependencies installed with Bun 1.4.3 via npm exec because shell Bun 1.2.5 cannot parse the repository lockfile.

## Verification results

- Independent matching and pantry reviews completed; material findings have regression tests and fixes.
- Full Jest run, typecheck, lint, and the verified dependency audit passed before final publication.
- Simulator E2E was updated for the confirmed activity label but not executed.
