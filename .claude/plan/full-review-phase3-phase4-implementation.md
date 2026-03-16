# Implementation Plan: Full-Review Phase 3 & Phase 4 (Testing, Docs, Best Practices, DevOps)

## Task Type
- [x] Fullstack (Testing, Documentation, Config, CI/CD)

## Scope

Address **Critical/High** and selected **Medium** findings from:
- `.full-review/03-best-practices-standards.md` (Language, Framework, Deprecations, Modernization, Package, Build)
- `.full-review/03-testing-documentation.md` (Test coverage + Documentation findings)
- `.full-review/03-testing-strategy-coverage.md` (Test strategy, pyramid, security/performance test gaps)
- `.full-review/04-best-practices.md` (Framework & language + CI/CD summary)
- `.full-review/04-devops-cicd-operations.md` (CI/CD, EAS, monitoring, incident response, env)

**Out of scope for this plan:** Phase 1/2 items already covered in `.claude/plan/fix-full-review-issues.md` (notifications, encryption key, bulk import perf, Sentry DSN source, Supabase init, expiry recommendation reuse, timeouts, @babel/runtime).

---

## Technical Solution (Synthesized)

1. **Scripts & CI** – Add `test`, `lint`, `typecheck` to `package.json`; add GitHub Actions workflow that runs install, lint, typecheck, test, optional `npx expo export` and `npm audit`; gate merge on passing CI.
2. **Testing** – Add test script; add critical/high tests (input sanitization, auth storage, bulk pantry import, recipe batch conversion, recipe import routing, expiry notifications); expand Jest `collectCoverageFrom` to `data/`, `lib/`, `auth/` with exclusions.
3. **Documentation** – Fix README test/lint references; add ADRs; update AI_CONTEXT.md; extend LOCAL_NOTIFICATIONS.md (user settings); add CHANGELOG.md; document isIngredientMatch and getAvailableRecipes; add .env.example; add runbooks/rollback and incident response docs.
4. **Best practices (code)** – Reduce `any` in StorageFacade (typed capability detection), typography `@ts-expect-error`, exhaustive switch where required; storage facade async/await; meal plan virtualized list (FlatList/FlashList); remove duplicate expo-font in app.json.
5. **DevOps** – Add and commit `eas.json`; document EAS env vars and rollback; Sentry docs (no real DSNs, alerting/on-call); optional env validation at startup.

---

## Implementation Steps

### Step 1: Add npm scripts and fix README
- **Deliverable**: `npm test`, `npm run lint`, `npm run typecheck` exist; README matches.
- In `package.json` scripts: add `"typecheck": "tsc --noEmit"`, `"lint": "prettier --check . && npx tsc --noEmit"` (or ESLint if adopted), `"test": "jest"`, optionally `"test:coverage": "jest --coverage"`.
- In README: Update "Testing" and "Code Style" to reference the actual script names; remove or qualify any claim that implies lint/test without scripts.
- Verify: `npm run typecheck` and `npm test` succeed (existing quantity-comparison test passes).

### Step 2: Input sanitization tests (Critical)
- **Deliverable**: Security-critical sanitization covered by tests.
- Create `utils/__tests__/input-sanitization.test.ts`: test `sanitizeForDatabase` (SQL-like inputs, maxLength, non-string), `sanitizeSearchTerm` (wildcards for LIKE), `sanitizeEmail` (valid/invalid). Follow example from `.full-review/03-testing-strategy-coverage.md` Section 6.
- Verify: All tests pass; no injection patterns in output.

### Step 3: Auth and secure storage tests (Critical)
- **Deliverable**: Session store/retrieve/clear and error paths tested with mocked storage.
- Create `auth/__tests__/StorageIntegration.test.ts` (or equivalent for AuthStorageManager): mock storage; test store session, get session, clear session, expired session (clear on get), get/set throws. Do not commit raw tokens; assert clearSession when get fails or data invalid.
- Verify: Tests pass with mocks; document migration steps if key change is ever required.

### Step 4: Bulk pantry import tests (High)
- **Deliverable**: addPantryItemsWithMetadata behavior covered; transaction and duplicate handling asserted.
- Add unit or integration tests for `data/api/pantryApi.ts` `addPantryItemsWithMetadata`: empty list, single item, duplicates (update vs create), one invalid item (rest succeed), all invalid. Assert returned list shape and that one failure does not prevent others.
- Prefer in-memory or mocked DB; after O(n²) refactor (from fix-full-review-issues plan), add check that no full-table fetch per item.
- Verify: Tests pass; transaction boundaries documented or asserted.

### Step 5: Recipe API and batch conversion tests (High)
- **Deliverable**: convertDbRecipesToUIRecipesBatch and availability path covered.
- Unit tests for `convertDbRecipesToUIRecipesBatch`: empty recipeDetailsMap, missing IDs for some recipes, empty ingredients/steps; assert skipped recipes and correct count.
- Regression: availability uses batch API (no N+1).
- Verify: Tests pass.

### Step 6: Recipe import pipeline and expiry notifications tests (High)
- **Deliverable**: URL/validation and expiry grouping and “recommendation once per run” covered.
- Unit tests for `lib/recipe-scrapper/validation-utils.ts` (`isValidRecipe`) and URL analysis/routing in `data/api/recipeImportApi.ts` (invalid URL, unsupported type).
- Unit tests for `lib/notifications/expiry-notifications/expiry-notifications.ts`: mock `recipeApi.getRecipeRecommendationsForExpiring` and `scheduleNotification`; assert grouping, skip when past, and that recommendation is called once per run for multiple groups.
- Verify: All tests pass.

### Step 7: Jest coverage scope and CI workflow
- **Deliverable**: Coverage includes data/lib/auth; CI runs on push/PR.
- In `jest.config.js`: expand `collectCoverageFrom` to include `data/**`, `lib/**`, `auth/**` with exclusions for `*.d.ts`, `__tests__`, and heavy native/generated code as needed.
- Create `.github/workflows/ci.yml`: on push and pull_request to main (or default branch), checkout, install deps (`npm ci`), run `npm run typecheck`, `npm run lint`, `npm test`; optionally `npx expo export` and `npm audit --audit-level=high` (fail or warn). Gate merge on success.
- Verify: CI runs and passes; coverage report available if test:coverage added.

### Step 8: Documentation – README, ADRs, AI_CONTEXT, LOCAL_NOTIFICATIONS, CHANGELOG
- **Deliverable**: Docs accurate and key decisions recorded.
- README: Already updated in Step 1 for test/lint.
- Create `docs/adr/` (or `docs/architecture/decisions/`): add 2–3 ADRs (e.g. facade-only data access, notification handler registry, three-tier storage).
- Update `docs/AI_CONTEXT.md`: Set app name to DoneDish (fridgit); align stack with README/CLAUDE (Expo 55, Uniwind, React Query + Context); remove Cookkit, Zustand, NativeWind v4 references; fix "Current Development Focus", "Adding a New Feature", "Quick Reference".
- Update `docs/LOCAL_NOTIFICATIONS.md`: Add "User notification settings" (storage key, getSettings(), effect on scheduling); reference `app/profile/notification.tsx` and `hooks/useNotificationSettings.ts`.
- Add `CHANGELOG.md` (Keep a Changelog style); link from README.
- Add JSDoc for `utils/ingredient-matching.ts` `isIngredientMatch` (parameters, return, matching order, short example).
- Add block comment on `DatabaseFacade.getAvailableRecipes()` (two-phase flow, batch size, isIngredientMatch); clarify in REPOSITORY_PATTERN that facade may use database.get for batch reads.
- Optional: `docs/API_OVERVIEW.md` listing pantryApi, recipeApi, DatabaseFacade entry points.
- In `docs/COOKKIT_APP_DOCUMENTATION.md`: Add note "Product name: DoneDish (legacy: Cookkit)".
- Verify: New contributors can follow README and ADRs; LOCAL_NOTIFICATIONS describes settings.

### Step 9: Best practices – StorageFacade types, typography, exhaustive switch, list, app.json
- **Deliverable**: Less `any`; typography and switches type-safe; meal plan virtualized; single expo-font.
- **StorageFacade**: Replace `(this.storage as any)[methodName]` with typed capability: extend IStorage with optional `getAsync?`, `setAsync?` (or IStorageCapabilities); use `'getAsync' in this.storage` and narrow. Same for StorageFactory.storageSupportsMethod if used.
- **Typography**: In `components/ui/typography.tsx`, replace `@ts-ignore` for `role="blockquote"` and `role="code"` with `@ts-expect-error` and short comment, or Platform.select / conditional type for web.
- **Exhaustive switch**: In `utils/api-error-handler.ts`, `components/Recipe/Step/StepCard.tsx`, `data/services/ChallengeService.ts` (and any other union switches noted in review), add `default: { const _: never = x; return _; }` (or throw).
- **Meal plan**: In `app/meal-plan/index.tsx`, replace ScrollView + map with FlatList or FlashList; keyExtractor, renderItem for recipe list.
- **app.json**: Remove duplicate `"expo-font"` entry in plugins array; keep single entry with full font config.
- Verify: `npm run typecheck` passes; no new regressions.

### Step 10: DevOps – EAS config, .env.example, runbooks, rollback, Sentry docs
- **Deliverable**: EAS and env documented; incident/rollback and Sentry docs in place.
- Run `eas build:configure` and commit `eas.json`; document required EAS env vars in README or `docs/DEPLOYMENT.md` (e.g. EXPO_PUBLIC_*, SENTRY_AUTH_TOKEN).
- Add `.env.example`: list all `EXPO_PUBLIC_*` (and other) vars with placeholder values and short comments; document in README.
- Add `docs/runbooks/` or `docs/INCIDENT_RESPONSE.md`: severity definitions, who to contact, steps for "app crash spike", "bad OTA", "Supabase down", "Sentry DSN leak"; link to Sentry and TROUBLESHOOTING.
- Document rollback: EAS Update (revert to previous update or disable); store rollback (previous binary, when, data compatibility); who can execute.
- In `docs/SENTRY_SETUP.md`: Remove any real DSNs; document only env var names and placeholders; add alerting/on-call expectations (how Sentry alerts are routed, escalation, response for crash vs error rate); document PII/sampling and scrubbing.
- Optional: Env validation at build or app startup for required vars; clear error when missing in production.
- Verify: New dev can set up from .env.example; ops can follow runbook and rollback doc.

---

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `package.json` | Modify | Add test, lint, typecheck, test:coverage scripts |
| `README.md` | Modify | Fix test/lint references; link CHANGELOG; env/setup |
| `jest.config.js` | Modify | Expand collectCoverageFrom to data/, lib/, auth/ |
| `utils/__tests__/input-sanitization.test.ts` | Create | Sanitization unit tests |
| `auth/__tests__/StorageIntegration.test.ts` | Create | Auth storage tests with mocks |
| `data/api/pantryApi.ts` | Test | Tests for addPantryItemsWithMetadata (new test file) |
| `data/api/recipeApi.ts` / recipe conversion | Test | New test file for batch conversion |
| `lib/recipe-scrapper/validation-utils.ts` | Test | New test file for isValidRecipe |
| `data/api/recipeImportApi.ts` | Test | URL/routing tests |
| `lib/notifications/expiry-notifications/expiry-notifications.ts` | Test | New test file with mocks |
| `.github/workflows/ci.yml` | Create | CI: typecheck, lint, test, optional export, audit |
| `docs/adr/` | Create | 2–3 ADRs |
| `docs/AI_CONTEXT.md` | Modify | DoneDish, Expo 55, Uniwind, remove stale refs |
| `docs/LOCAL_NOTIFICATIONS.md` | Modify | User notification settings section |
| `CHANGELOG.md` | Create | Keep a Changelog style |
| `utils/ingredient-matching.ts` | Modify | JSDoc for isIngredientMatch |
| `data/db/DatabaseFacade.ts` | Modify | Block comment getAvailableRecipes |
| `docs/REPOSITORY_PATTERN.md` | Modify | Clarify facade batch reads |
| `docs/COOKKIT_APP_DOCUMENTATION.md` | Modify | DoneDish (legacy Cookkit) note |
| `data/storage/storage-facade.ts` | Modify | Typed capability detection, async/await |
| `data/storage/storage-types.ts` | Modify | Optional IStorage methods if needed |
| `components/ui/typography.tsx` | Modify | @ts-expect-error or web prop types |
| `utils/api-error-handler.ts` | Modify | Exhaustive switch default |
| `components/Recipe/Step/StepCard.tsx` | Modify | Exhaustive switch default |
| `data/services/ChallengeService.ts` | Modify | Exhaustive switch default |
| `app/meal-plan/index.tsx` | Modify | FlatList/FlashList |
| `app.json` | Modify | Remove duplicate expo-font |
| `eas.json` | Create | From eas build:configure |
| `.env.example` | Create | EXPO_PUBLIC_* and comments |
| `docs/runbooks/` or `docs/INCIDENT_RESPONSE.md` | Create | Severity, contacts, steps |
| `docs/DEPLOYMENT.md` | Create or modify | EAS env vars, rollback link |
| `docs/SENTRY_SETUP.md` | Modify | No real DSNs; alerting; PII/sampling |

---

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| New tests flaky (timers, async) | Use fake timers and fixed "now" for expiry; document mock boundaries (e.g. StorageFactory mocked, AuthStorageManager real). |
| CI too slow | Run typecheck and lint first; test in parallel if matrix needed; optional expo export as separate job. |
| EAS config differs per dev | Document that eas.json is canonical; secrets only in EAS dashboard or .env (gitignored). |
| Documentation drift | Link from README to CHANGELOG and ADRs; one-time pass to align AI_CONTEXT with CLAUDE. |

---

## SESSION_ID (for /ccg:execute use)

- CODEX_SESSION: (not used – codeagent-wrapper not available)
- GEMINI_SESSION: (not used – codeagent-wrapper not available)
