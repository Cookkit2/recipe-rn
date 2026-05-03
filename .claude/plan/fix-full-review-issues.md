# Implementation Plan: Fix Full-Review Issues (Quality, Architecture, Security, Performance)

## Task Type

- [x] Fullstack (Backend + Frontend + Config)

## Enhanced Requirement (from Phase 1)

Address all **Critical/High** and selected **Medium** findings from:

- `.full-review/01-quality-architecture.md` (Code Quality & Architecture)
- `.full-review/02-security-performance.md` (Security & Performance)

**Scope**: Notification type consistency, encryption key security, bulk pantry import performance, Sentry/config security, Supabase init robustness, expiry notification recommendation reuse, network timeouts, duplicate notification handlers, and dependency verification. Excludes large refactors (e.g. DatabaseFacade split, DoneDishToolExecutor split) and test additions in this plan; those can be follow-up work.

---

## Technical Solution (Synthesized)

1. **Notification types** – Standardize on the handler type names (`achievement_unlocked`, `challenge_completed`) everywhere: scheduling payloads, handler registration, and notification-settings mapping. Use a single shared constants module and remove duplication.
2. **Single ingredient_expiry handler** – Keep one registration (in the component that has router access and full deep-link logic). Remove the duplicate registration that only navigates to "/".
3. **Encryption key** – Source key from environment or from a secure runtime source (e.g. `expo-secure-store` for a per-device key). Do not read from a hard-coded string in production; fail fast or disable encrypted storage if key is missing.
4. **Bulk pantry import** – Pre-fetch stocks, categories, synonyms once; build lookup maps; confine `database.write` to synchronous creates/updates; move conversions and logging outside the transaction. Prefer facade/repository API where possible.
5. **Sentry** – Load DSN and options from env; set `sendDefaultPii: false` by default; lower production `tracesSampleRate` and `profilesSampleRate`; document log scrubbing.
6. **Supabase** – Avoid import-time throw. Lazy-initialize or check at runtime and export a getter that returns client or null; document graceful degradation for dependent features.
7. **Expiry notifications** – Call `getRecipeRecommendationsForExpiring` once per `scheduleExpiryNotifications` run and reuse the result for all groups.
8. **Network timeouts** – Add `AbortController`-based timeout to Gemini API and website scraper `fetch` calls.
9. **@babel/runtime** – Confirm resolved version ≥ 7.26.10; add override in package.json if needed.

---

## Implementation Steps

### Step 1: Notification type constants and handler alignment

- **Deliverable**: One source of truth for notification types; deep links work for achievement/challenge.
- Create or extend a single module (e.g. `lib/notifications/notification-types.ts` or keep `notification-handler.ts`) that exports:
  - `ACHIEVEMENT_UNLOCKED_TYPE = "achievement_unlocked"`
  - `CHALLENGE_COMPLETED_TYPE = "challenge_completed"`
  - `INGREDIENT_EXPIRY_TYPE = "ingredient_expiry"`
  - (and any other types used in scheduling/handlers).
- In `lib/notifications/achievement-notifications.ts`: Use the above constants for `notificationData.type` (replace `"achievement_unlock"` / `"challenge_complete"`).
- In `app/_layout.tsx`: Register handlers using the same constants (already using `"achievement_unlocked"` and `"challenge_completed"`; switch to imported constants for consistency).
- In `utils/notification-settings.ts`: In `mapTypeToChannel`, map `achievement_unlocked` and `challenge_completed` to the same channels as before (achievements / challenges), so settings UI and scheduling stay aligned.
- Verify: Tap on achievement/challenge notifications navigates to profile/achievements.

### Step 2: Consolidate ingredient_expiry handler (single registration)

- **Deliverable**: Only one handler for `ingredient_expiry`; it implements full deep-link (recipe first, else pantry).
- In `app/_layout.tsx`: Remove the duplicate `ingredient_expiry` registration from `RootLayout` (the one that only does `router.push("/")`). Keep the handler in `AnimatedStack` that uses `extractNotificationData`, checks `recipeIds`, and navigates to first recipe or "/".
- Ensure `AnimatedStack` is mounted inside a tree that has `NotificationProvider` and router context so the handler runs in the right order and is the only one registered for `ingredient_expiry`.
- Verify: Tapping expiry notification with recipe suggestions opens recipe; without suggestions opens pantry.

### Step 3: Encryption key from config / secure store

- **Deliverable**: No hard-coded encryption key in source; production uses env or secure storage.
- In `data/storage/storage-config.ts`: Remove literal `"donedish-secure-key"`. Read encryption key from:
  - Option A: `process.env.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY` or `Constants.expoConfig?.extra?.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY` (build-time secret; not ideal but better than committed key).
  - Option B (preferred for production): Lazy-load a per-device key from `expo-secure-store` (e.g. key named `mmkv_encryption_key`), generating and storing it on first run if missing. Inject that into the encrypted config at runtime.
- If key is missing and encrypted storage is requested: log a clear error and either throw or fall back to non-encrypted storage for that config, depending on product requirement (review recommends “fail fast or fall back”).
- Update `auth/StorageIntegration.ts` only if it passes config through; otherwise it already uses `storageConfigs.encrypted` from storage-config.
- Document in README or env example: required env var or secure-store key name for encrypted storage.

### Step 4: Bulk pantry import – pre-fetch and thin transaction

- **Deliverable**: `addPantryItemsWithMetadata` no longer does O(n²) fetches inside the transaction; write block is minimal.
- In `data/api/pantryApi.ts` (`addPantryItemsWithMetadata`):
  - **Before** `database.write`: Fetch all existing stocks, ingredient categories, and synonyms once (via facade if available, or one-off collection queries). Build `Map<string, Stock>` by name (lowercased), and maps for category name → IngredientCategory, etc.
  - **Inside** `database.write`: For each item, look up existing stock/category from the maps; perform only creates/updates (no full-table fetch, no await of conversion or logging). Collect created/updated model references.
  - **After** `database.write`: Convert model references to `PantryItem[]` (reuse `convertStockToPantryItem`) and log; return created items.
- Prefer adding a `DatabaseFacade` (or repository) method that returns existing stocks/categories/synonyms in a batch for this use case, and call it from `pantryApi` instead of touching `database.collections` directly in the API layer, if the architecture doc requires it.
- Verify: Bulk import of N items does not perform N full-table fetches; transaction time grows roughly O(n) for the write portion.

### Step 5: Sentry – env config and safer defaults

- **Deliverable**: DSN and PII/sampling from env; production sampling reduced.
- In `app/_layout.tsx`: Read Sentry DSN from `process.env.EXPO_PUBLIC_SENTRY_DSN` or `Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN`. If missing in production, consider disabling Sentry or logging a warning.
- Set `sendDefaultPii: false` by default; allow override via env (e.g. `EXPO_PUBLIC_SENTRY_SEND_PII=true` for debugging).
- Set production `tracesSampleRate` to 0.1 (or 0.2) and `profilesSampleRate` to 0.1; keep dev at 1.0 for debugging.
- Document in `docs/SENTRY_SETUP.md`: env vars, PII/sampling behavior, and recommendation to configure data scrubbing in Sentry project settings.

### Step 6: Supabase client – no import-time throw

- **Deliverable**: App starts even when Supabase env is missing; dependent code handles missing client.
- In `lib/supabase/supabase-client.ts`: Do not throw at top level. Instead:
  - Read `SUPABASE_URL` and `SUPABASE_ANON_KEY` as now.
  - If either is missing: set `export const supabase = null` (or a lazy getter that returns `null`) and export a flag `supabaseAvailable = false`; log a clear warning (no stack throw).
  - If both present: create client as now and export `supabaseAvailable = true`.
- Ensure any code that imports `supabase` checks for null/availability before use (or wrap in try/catch) so that auth, recipe sync, etc. degrade gracefully when Supabase is not configured.
- Document: expected behavior when env is missing (e.g. offline-only mode).

### Step 7: Expiry notifications – recommend once per run

- **Deliverable**: `getRecipeRecommendationsForExpiring` called once per scheduling run.
- In `lib/notifications/expiry-notifications/expiry-notifications.ts`: Before the `for (const group of groups)` loop, call `recipeApi.getRecipeRecommendationsForExpiring(...)` once. Store `recipes` (and derived `recipeNames`, `recipeIds` for top 3). Inside the loop, use that single result for all groups (same recommendation set for every group, or slice/filter by group if product requires group-specific suggestions later).
- Verify: Scheduling 10 groups triggers one recommendation call, not 10.

### Step 8: Network timeouts (Gemini + scraper)

- **Deliverable**: Fetch calls abort after a configured timeout.
- Add a small utility (e.g. `utils/fetch-with-timeout.ts`): `fetchWithTimeout(url, options, timeoutMs)` using `AbortController` and `setTimeout` to abort after `timeoutMs`.
- In `utils/gemini-api.ts`: Use this helper for `generateContent` and `listModels` (e.g. 30–60 s timeout).
- In `lib/recipe-scrapper/WebsiteRecipeService.ts`: Use the same helper for the main `fetch(url, ...)` (e.g. 15–20 s timeout).
- Verify: Timeout triggers and errors are handled without leaving requests hanging.

### Step 9: @babel/runtime vulnerability

- **Deliverable**: Resolved version ≥ 7.26.10; no known ReDoS from GHSA-968p-4wvh-cqc8.
- Run `npm ls @babel/runtime` and confirm version. If WatermelonDB pulls in an older version, add an override in `package.json` if using npm overrides (or resolutions in Yarn/bun) to force `@babel/runtime@>=7.26.10`.
- Document in a short “Dependencies” or “Security” note: keep @babel/runtime at or above 7.26.10; plan WatermelonDB upgrade when a version with patched dependency is available.

---

## Key Files

| File                                                             | Operation     | Description                                                                                                                                                        |
| ---------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/notifications/notification-handler.ts`                      | Reference     | Already exports ACHIEVEMENT_UNLOCKED_TYPE, CHALLENGE_COMPLETED_TYPE                                                                                                |
| `lib/notifications/achievement-notifications.ts`                 | Modify        | Use handler-type constants for `data.type`; align with handler names                                                                                               |
| `lib/notifications/notification-types.ts`                        | Modify or add | Centralize INGREDIENT_EXPIRY_TYPE and re-export for scheduling/handlers                                                                                            |
| `app/_layout.tsx`                                                | Modify        | Use imported type constants; remove duplicate ingredient_expiry handler; Sentry from env, sendDefaultPii false, lower sampling                                     |
| `utils/notification-settings.ts`                                 | Modify        | mapTypeToChannel: handle achievement_unlocked, challenge_completed (and existing achievement_unlock/challenge_complete if kept for backward compat during rollout) |
| `data/storage/storage-config.ts`                                 | Modify        | Encryption key from env or expo-secure-store; no hard-coded key                                                                                                    |
| `auth/StorageIntegration.ts`                                     | Optional      | Only if config must be passed differently for lazy key                                                                                                             |
| `data/api/pantryApi.ts`                                          | Modify        | addPantryItemsWithMetadata: pre-fetch, maps, thin write, convert outside                                                                                           |
| `data/db/DatabaseFacade.ts`                                      | Optional      | Add batch getter for stocks/categories/synonyms if facade-only access required                                                                                     |
| `lib/supabase/supabase-client.ts`                                | Modify        | No import-time throw; export supabase or null and supabaseAvailable                                                                                                |
| `lib/notifications/expiry-notifications/expiry-notifications.ts` | Modify        | Call getRecipeRecommendationsForExpiring once before group loop                                                                                                    |
| `utils/gemini-api.ts`                                            | Modify        | Use fetchWithTimeout for all fetch calls                                                                                                                           |
| `lib/recipe-scrapper/WebsiteRecipeService.ts`                    | Modify        | Use fetchWithTimeout for fetch                                                                                                                                     |
| `utils/fetch-with-timeout.ts`                                    | Create        | AbortController-based fetch wrapper                                                                                                                                |
| `package.json`                                                   | Modify        | Overrides/resolutions for @babel/runtime if needed                                                                                                                 |
| `docs/SENTRY_SETUP.md`                                           | Modify        | Document env, PII, sampling, scrubbing                                                                                                                             |

---

## Risks and Mitigation

| Risk                                                                | Mitigation                                                                                                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Changing notification types breaks existing scheduled notifications | Use new type names only for new schedules; existing notifications may open pantry/profile until they expire. Optional: migration path (e.g. handler accepts both old and new type for a release). |
| Encrypted storage key migration                                     | If moving to per-device key, document one-time migration: read with old key, re-write with new key, or require re-login.                                                                          |
| Supabase null causes runtime errors in callers                      | Audit imports of `supabase`; add null checks or lazy init at first use and document offline behavior.                                                                                             |
| Bulk import behavior change                                         | Add or run existing tests for addPantryItemsWithMetadata; test with duplicate names, categories, synonyms.                                                                                        |
| Sentry sampling too low to debug production                         | Document how to temporarily increase sampling via env for incident investigation.                                                                                                                 |

---

## Out of Scope (Follow-up)

- Splitting `DatabaseFacade` into domain facades.
- Refactoring `DoneDishToolExecutor` and replacing `any` types.
- Extracting `getAvailableRecipes` helpers and N+1 fixes.
- Recipe creation returning created ID from facade (recipeApi lookup by title).
- Adding unit tests for expiry notifications, availability, recommendation strategies.
- Typography `@ts-ignore` fix; StockRepository/other `any` cleanup.
- Meal plan ScrollView → FlatList virtualization.
- Stock schema indices for expiry/name (acceptable at current scale).

---

## SESSION_ID (for /ccg:execute use)

- CODEX_SESSION: (not used – codeagent-wrapper not available)
- GEMINI_SESSION: (not used – codeagent-wrapper not available)
