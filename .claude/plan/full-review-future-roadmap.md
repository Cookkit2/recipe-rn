# Further Plan: Full-Review Future Roadmap (P2 / P3 / Long-Term)

This document describes work to be done **after** the current implementation plans are complete:

- **Phase 1 & 2**: `.claude/plan/fix-full-review-issues.md` (notifications, encryption, bulk import, Sentry, Supabase, expiry recommendations, timeouts, @babel/runtime)
- **Phase 3 & 4**: `.claude/plan/full-review-phase3-phase4-implementation.md` (scripts, CI, tests, docs, best practices, DevOps)

---

## Task Type

- [x] Fullstack (Architecture, Types, Performance, Testing, Docs)

---

## 1. Next Sprint (P2 — Medium Priority)

### 1.1 DatabaseFacade complexity and N+1

- **Source**: Phase 1, 2; `.full-review/01-quality-architecture.md`, `02-security-performance.md`
- **Actions**:
  - Refactor `getAvailableRecipes` into smaller helpers (pantry metadata loading, per-batch availability computation).
  - Use `getRecipesWithDetails` batch consistently; avoid per-recipe detail fetches.
  - Have `DatabaseFacade.createRecipe` (or equivalent) return the created record with ID; use it in `recipeApi.addRecipe`/`addRecipeResult` instead of fetching all recipes and matching by title.
- **Optional**: Consider domain-specific sub-facades (e.g. `PantryFacade`, `RecipeFacade`, `GamificationFacade`) to keep the top-level facade thin.

### 1.2 DoneDishToolExecutor and StorageFacade `any`

- **Source**: Phase 1, 4; `.full-review/01-quality-architecture.md`, `04-best-practices.md`
- **Actions**:
  - Introduce explicit parameter/result types for all tool methods (e.g. `AddItemParams`, `GetInventoryResult` in `types/` or next to executor).
  - Typed storage capability detection (already partially in Phase 3/4 plan); ensure full removal of `(this.storage as any)` and repository `(record: any)` where not yet covered.
  - Use shared logging utility instead of `console.*` in DoneDishToolExecutor.

### 1.3 Sentry / Supabase config (if not done in Phase 1/2)

- **Source**: Phase 2, 4
- **Actions**: Env-based Sentry; lazy Supabase init or null when config missing (verify both are done in fix-full-review-issues plan).

### 1.4 Additional tests (beyond Phase 3/4 plan)

- **Source**: Phase 3
- **Actions**: Add unit/integration tests for notification service/settings, error handlers (`withErrorHandling`, `withArrayErrorHandling`, `withStructuredError`); unit tests for `unit-converter.ts`; document and optionally test Sentry/PII scrubbing.

### 1.5 JSDoc and API overview (if not fully done in Phase 3/4)

- **Source**: Phase 3
- **Actions**: Document `isIngredientMatch`, `getAvailableRecipes`, and facade use of `database.get`; add or expand `docs/API_OVERVIEW.md`.

### 1.6 Meal plan and timeouts (if not in Phase 1/2 or 3/4)

- **Source**: Phase 2, 4
- **Actions**: FlatList for meal plan recipe list; AbortController timeouts for Gemini and scraping (verify in fix-full-review-issues).

### 1.7 Framework/language

- **Source**: Phase 4
- **Actions**: async/await in storage facade (if not in Phase 3/4); exhaustive switch in remaining files; document reliance on unstable header APIs (`unstable_headerLeftItems`, `unstable_headerRightItems`).

---

## 2. Backlog (P3 — Low Priority)

### 2.1 Typography and small cleanups

- **Source**: Phase 4; `.full-review/05-final-report.md` P3
- **Actions**: Typography `@ts-ignore` → `@ts-expect-error` or web prop types (if not in Phase 3/4); `useModelPreloader` callbacks (refs or document `useCallback`); duplicate expo-font in app.json (if not removed in Phase 3/4); rem polyfill (14px) one-line note in README or design doc.

### 2.2 E2E and coverage scope

- **Source**: Phase 3
- **Actions**: Introduce Detox or Maestro for critical flows (sign-in, pantry list, recipe import); expand coverage collection and track in CI; optional coverage gates for critical paths.

### 2.3 Optional docs

- **Source**: Phase 3, 4
- **Actions**: Optional one-page `docs/ARCHITECTURE_OVERVIEW.md`; optional `docs/DEPLOYMENT.md` (env, EAS, Sentry, RevenueCat); dependency and audit hygiene in CI (Dependabot/Renovate, lockfile, `npm audit`).

---

## 3. Out of Scope from fix-full-review-issues (Follow-Up)

These remain as follow-up when capacity allows:

- Splitting `DatabaseFacade` into domain facades.
- Refactoring `DoneDishToolExecutor` and replacing all `any` types (beyond P2 steps above).
- Extracting `getAvailableRecipes` helpers and full N+1 elimination (beyond P2).
- Recipe creation returning created ID from facade (in P2 above).
- Adding unit tests for expiry notifications, availability, recommendation strategies (partially in Phase 3/4 plan).
- Typography `@ts-ignore` fix; StockRepository/other `any` cleanup (partially in Phase 3/4 / P3).
- Meal plan ScrollView → FlatList virtualization (in Phase 3/4 or P2).
- Stock schema indices for expiry/name (acceptable at current scale; revisit at larger scale).

---

## 4. Key Files (P2 / P3)

| Area | File(s) | Operation |
|------|---------|-----------|
| DatabaseFacade | `data/db/DatabaseFacade.ts`, `data/api/recipeApi.ts` | Refactor getAvailableRecipes; createRecipe return value; batch usage |
| DoneDishToolExecutor | `lib/function-gemma/DoneDishToolExecutor.ts` | Typed params/results; logging |
| Repositories | `data/db/repositories/*.ts` | Replace `(record: any)` with model types |
| Storage | `data/storage/storage-facade.ts` | async/await (if not in Phase 3/4) |
| Tests | `lib/notifications/*`, `utils/api-error-handler.ts`, `utils/unit-converter.ts` | New test files |
| Docs | `docs/API_OVERVIEW.md`, `docs/ARCHITECTURE_OVERVIEW.md`, `docs/DEPLOYMENT.md` | Create or expand |
| E2E | New (Detox/Maestro) | Configure and add critical flows |

---

## 5. Execution Order Suggestion

1. Complete **fix-full-review-issues.md** (P0/P1).
2. Complete **full-review-phase3-phase4-implementation.md** (scripts, CI, tests, docs, best practices, DevOps).
3. **P2 (next sprint)**: DatabaseFacade refactor and recipe return value; DoneDishToolExecutor types; any remaining tests/docs from Phase 3/4; meal plan FlatList and timeouts if not done.
4. **P3 (backlog)**: Typography, E2E, optional docs, dependency hygiene.

---

## References

- `.full-review/01-quality-architecture.md`
- `.full-review/02-security-performance.md`
- `.full-review/03-testing-documentation.md`, `03-testing-strategy-coverage.md`
- `.full-review/04-best-practices.md`, `04-devops-cicd-operations.md`
- `.full-review/05-final-report.md`
- `.claude/plan/fix-full-review-issues.md`
- `.claude/plan/full-review-phase3-phase4-implementation.md`
