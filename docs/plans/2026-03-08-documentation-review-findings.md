# Documentation Completeness and Accuracy Review

**Scope**: Full repository (DoneDish / fridgit).  
**Target areas**: `app/`, `components/`, `hooks/`, `data/`, `lib/`, `store/`, `utils/`, `constants/`, `types/`, `auth/`, `scripts/`, `docs/`.  
**Context**: Builds on prior Quality/Architecture and Security/Performance review findings (DatabaseFacade/repository pattern, notification system, error handling, security/performance items).

---

## 1. Inline Documentation

| Finding | Severity | What's Missing or Inaccurate | Recommendation |
|--------|----------|------------------------------|-----------------|
| **Core matching algorithm undocumented** | **High** | `utils/ingredient-matching.ts` exports `isIngredientMatch` with only a one-line comment. The function is central to recipe availability, grocery list, meal plan, and voice parsing; its behavior (direct match → synonym match → contains → keyword extraction → synonym map) and contract are not described. | Add JSDoc to `isIngredientMatch`: parameters, return value, matching order (direct → synonyms → contains → keyword/synonym map), and a short example. Optionally document in `docs/` for product/UX context. |
| **getAvailableRecipes algorithm** | **Medium** | `DatabaseFacade.getAvailableRecipes()` implements non-trivial logic (batch prefetch of synonyms/categories, lookup maps, batch processing of recipes, `isIngredientMatch`). Only a brief “Now includes synonym and category matching” comment exists. | Add a block comment above the method describing: two-phase flow (prefetch metadata → batch recipe evaluation), use of synonym/category lookups, batch size (10), and that matching uses `isIngredientMatch`. |
| **Facade’s direct DB usage** | **Medium** | `DatabaseFacade.getAvailableRecipes()` uses `database.get<IngredientSynonym>(...)`, `database.get<StockCategory>(...)`, `database.get<IngredientCategory>(...)` directly instead of repositories. REPOSITORY_PATTERN states “Only methods exposed here should be used” and “Direct repository access is private,” but does not describe this intentional use of `database.get` inside the facade for batch queries. | Document in REPOSITORY_PATTERN.md (or in DatabaseFacade JSDoc) that the facade may use `database.get()` for batch/aggregate reads where repositories do not expose a suitable API; application code must still use only the facade. |
| **Repository-internal DB access** | **Low** | Repositories (e.g. `StockRepository`, `RecipeRepository`, `TailoredRecipeMappingRepository`) use `this.collection.database.get(...)` or `database.collections.get(...)` internally. REPOSITORY_PATTERN says “Direct database access” is “BAD” with an example of `database.get('recipe')` from app code. | Clarify in REPOSITORY_PATTERN.md that the “no direct database access” rule applies to **application code** (components, hooks, API layer); **repositories** may use `database.get` / `collections.get` inside their implementation. |
| **api-error-handler / result** | **Low** | `utils/api-error-handler.ts` has strong JSDoc (overview, examples, options). `utils/result.ts` is minimal but clear. | No change required. |
| **Expiry notifications** | **Low** | `lib/notifications/expiry-notifications/expiry-notifications.ts` has a good block comment for `scheduleExpiryNotifications` (features, batching, type). | No change required. |

---

## 2. API Documentation

| Finding | Severity | What's Missing or Inaccurate | Recommendation |
|--------|----------|------------------------------|-----------------|
| **No internal API overview** | **Medium** | Internal APIs (`data/api/pantryApi.ts`, `recipeApi.ts`, `mealPlanApi.ts`, `recipeImportApi.ts`) have no dedicated API doc. Types and usage are discoverable only from code and REPOSITORY_PATTERN examples. | Add a short `docs/API_OVERVIEW.md` (or section in CLAUDE.md): list of API modules, main entry points (e.g. `pantryApi`, `recipeApi`), and “see DatabaseFacade + data/api for contracts.” Optionally add one or two request/response examples for the most used flows. |
| **Supabase API** | **Low** | `data/supabase-api/RecipeApi.ts` and `BaseIngredientApi` have method-level JSDoc. No separate document with request/response schemas or error contracts. | Keep current JSDoc; if Supabase usage grows, add a `docs/SUPABASE_API.md` with table/column references and example responses (or link to Supabase types). |
| **Notification service API** | **Low** | `docs/LOCAL_NOTIFICATIONS.md` provides a solid API reference for the notification module. | No change required for API surface; see §5 for missing **notification settings** behavior. |

---

## 3. Architecture Documentation

| Finding | Severity | What's Missing or Inaccurate | Recommendation |
|--------|----------|------------------------------|-----------------|
| **No ADRs** | **High** | There is no Architecture Decision Records (ADR) directory or template. Decisions (e.g. facade-only data access, handler registry for notifications, three-tier storage) are described in REPOSITORY_PATTERN, CLAUDE.md, and LOCAL_NOTIFICATIONS but not as dated, context-rich ADRs. | Introduce `docs/adr/` (or `docs/architecture/decisions/`) and add an ADR template. Capture 2–3 key decisions first (e.g. “Use DatabaseFacade only for DB access,” “Notification handler registry,” “MMKV + WatermelonDB + Supabase split”). |
| **AI_CONTEXT.md stale** | **High** | `docs/AI_CONTEXT.md` contains outdated and incorrect information: project name “Cookkit” and “recipe-rn” paths; “React Native 0.81+ with Expo SDK 54”; “NativeWind v4”; “Zustand-style stores”; “data/api/pantryApi” and “hooks/queries/usePantryQueries” (paths exist but doc is otherwise inconsistent); “Adding a New Feature” references “data/api/” and “hooks/queries/”; “Current Development Focus” mentions “feat/expo-notification” and “January 2026.” | Update AI_CONTEXT.md: set app name to DoneDish (codename fridgit), align stack with README/CLAUDE (Expo 55, Uniwind/Tailwind, React Query + Context only), fix “Adding a New Feature” and “Quick Reference” to match current layout (e.g. `data/api/`, `store/`), and remove or refresh “Current Development Focus” and date. |
| **COOKKIT_APP_DOCUMENTATION branding** | **Medium** | `docs/COOKKIT_APP_DOCUMENTATION.md` uses “Cookkit” throughout. README and CLAUDE use “DoneDish.” | Add a one-line note at the top: “Product name: DoneDish (legacy internal name: Cookkit).” Or do a global replace to “DoneDish” and keep filename for history. |
| **SECURITY_IMPROVEMENTS naming** | **Low** | Document refers to “Recipe RN application.” | Replace with “DoneDish” (or “DoneDish (fridgit)”). |
| **Repository pattern & TECH_STACK** | **Low** | REPOSITORY_PATTERN.md and TECH_STACK.md are accurate and useful. TECH_STACK matches README (React Native 0.83+, Expo 55). | No change required. |
| **System diagrams** | **Low** | REPOSITORY_PATTERN and AI_CONTEXT include ASCII data-flow diagrams. No single “system context” or deployment diagram. | Optional: add a one-page `docs/ARCHITECTURE_OVERVIEW.md` with a high-level diagram (app → facades → DB/Supabase/storage) and pointer to REPOSITORY_PATTERN and CLAUDE. |

---

## 4. README Completeness

| Finding | Severity | What's Missing or Inaccurate | Recommendation |
|--------|----------|------------------------------|-----------------|
| **Test and lint commands wrong** | **Critical** | README “Testing” and “Code Style” imply `npm test` and `npm run lint`. `package.json` has no `test` or `lint` scripts (only `dev`, `android`, `ios`, `web`, `clean`). | Either add the missing scripts to `package.json` and document them, or update README to remove/inaccurate references and state “Testing/lint: see repo scripts” or “Not yet configured.” |
| **Setup and dev workflow** | **Low** | Prerequisites, installation, running (dev, ios, android, web, Expo Go), platform notes, and EAS build section are present and accurate. | No change required. |
| **Documentation links** | **Low** | README “Documentation” section links to AI_CONTEXT, COOKKIT_APP_DOCUMENTATION, VOICE_GUIDED_COOKING, SECURITY_IMPROVEMENTS, TROUBLESHOOTING, FAQ. All targets exist. | Fix README only after fixing the linked docs (AI_CONTEXT, COOKKIT naming). |
| **Deployment** | **Low** | EAS Build is described (configure, build ios/android). No env/secrets or release-checklist doc. | Optional: add a short “Deployment” subsection or link to a `docs/DEPLOYMENT.md` (env vars, EAS, Sentry, RevenueCat) if needed for maintainers. |

---

## 5. Accuracy (Documentation vs Implementation)

| Finding | Severity | What's Missing or Inaccurate | Recommendation |
|--------|----------|------------------------------|-----------------|
| **Local notifications and settings** | **High** | `docs/LOCAL_NOTIFICATIONS.md` does not describe notification **user settings**. Implementation uses `notificationSettingsService` (`utils/notification-settings.ts`): `scheduleNotification` checks `settings.enabled` and `notificationSettingsService.isNotificationDataEnabled(payload)`; `scheduleExpiryNotifications` checks `settings.enabled` and `settings.ingredientExpiry`. Constants include `NOTIFICATION_SETTINGS_KEY`. Doc describes scheduling and handlers but not opt-out or per-type toggles. | Update LOCAL_NOTIFICATIONS.md: add a “User notification settings” section (storage key `NOTIFICATION_SETTINGS_KEY`, `notificationSettingsService.getSettings()`, effect on `scheduleNotification` and `scheduleExpiryNotifications`), and reference `app/profile/notification.tsx` / `hooks/useNotificationSettings.ts` where applicable. |
| **REPOSITORY_PATTERN custom transactions** | **Low** | REPOSITORY_PATTERN “Transaction Handling” shows `createRaw`/`updateRaw` and states they are “illustrative” and to use “concrete repository methods.” This is intentionally generic. | No change required; consider adding a single sentence that not all repositories expose `createRaw`/`updateRaw` and to check the specific repository. |
| **DATABASE_REFACTORING_PLAN / DATABASE_USAGE_ANALYSIS** | **Low** | These docs refer to “databaseFacade.ingredients” and “databaseFacade.stock.x()” / “databaseFacade.recipes.x()” as past or proposed states. Current code uses the simplified facade API. | Add a short “Status” or “Superseded by” note at the top of each: e.g. “Implemented; facade no longer exposes .stock / .recipes; use facade methods only.” |

---

## 6. Changelog / Migration Guides

| Finding | Severity | What's Missing or Inaccurate | Recommendation |
|--------|----------|------------------------------|-----------------|
| **No CHANGELOG** | **High** | Repository has no `CHANGELOG.md` (or equivalent). Breaking changes and release notes are not centralized. | Add `CHANGELOG.md` (Keep a Changelog style or simple “Version / Date / Changes”) and document recent or upcoming breaking changes (e.g. facade-only API, notification settings). |
| **Migration guides exist but scattered** | **Medium** | Migration content exists in REPOSITORY_PATTERN (Migration Guide), PANTRY_MIGRATION, RECIPE_MIGRATION, DATABASE_REFACTORING_PLAN, SECURITY_IMPROVEMENTS. No index. | Add a “Migrations & breaking changes” subsection in README or `docs/README.md` linking to these guides and to CHANGELOG when added. |
| **Plans vs migrations** | **Low** | `docs/plans/` holds design/implementation plans (e.g. notification settings, neverthrow, grocery list). These are forward-looking; they are not migration guides for end users. | Keep as-is; ensure plan filenames or intros distinguish “plan” vs “migration guide” to avoid confusion. |

---

## Summary Table

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Inline documentation | 0 | 1 | 2 | 3 |
| API documentation | 0 | 0 | 1 | 2 |
| Architecture documentation | 0 | 2 | 1 | 3 |
| README completeness | 1 | 0 | 0 | 2 |
| Accuracy | 0 | 1 | 0 | 2 |
| Changelog / migration | 0 | 1 | 1 | 1 |

**Suggested order of work**

1. **Critical**: Fix README test/lint references (add scripts or correct text).
2. **High**: Update AI_CONTEXT.md; add notification settings to LOCAL_NOTIFICATIONS.md; introduce CHANGELOG and ADR practice; add JSDoc for `isIngredientMatch`.
3. **Medium**: Document getAvailableRecipes and facade/repository DB usage; add internal API overview; unify COOKKIT/SECURITY naming; add migration index.
4. **Low**: Remaining inline and accuracy clarifications; optional architecture diagram and deployment doc.

---

*Review date: 2026-03-08. Target codebase: fridgit (DoneDish) at repository root.*
