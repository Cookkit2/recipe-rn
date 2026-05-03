# Authentication, RLS, Household Sharing, and Cross-Device Sync

**Date:** 2026-05-03  
**Project:** recipe-rn (Cookkit)  
**Status:** Draft (pending product decisions in §2)

## 1. Overview

This document specifies how Cookkit should implement **Supabase-backed authentication**, **row-level security (RLS)** for multi-tenant data, **household-based shared pantry** (and related entities), and **cross-device sync and backup** between the offline **WatermelonDB** layer and **Postgres** via Supabase.

The app already contains a canonical auth module under `~/auth` (`AuthProvider`, `SupabaseAuthStrategy`, storage adapters) and a Supabase JS client with persisted sessions (`lib/supabase/supabase-client.ts`). As of this writing, **`AuthProvider` is not mounted** in `app/_layout.tsx`, so React-level auth state is disconnected from the live shell even though sign-in screens and strategies exist.

This spec ties together **server schema + RLS**, **client auth wiring**, and a **sync protocol** so that:

- Pantry, meal plans, favorites, and tailored recipes can sync across devices for the same logical owner.
- Multiple signed-in users can share one pantry (and related data) through a **household** abstraction.
- The server enforces access; the client cannot bypass isolation by crafting REST calls with only the anon key.

---

## 2. Product decisions (must be resolved before implementation)

These choices drive schema and navigation; lock them early.

| Decision | Options | Recommendation |
| -------- | ------- | ---------------- |
| **Sign-in gate** | (A) Required before main app / (B) Optional: offline-first, prompt for account to enable cloud | **(B)** for lower friction if local-first remains a promise; **(A)** if every install must be attributable. |
| **Household cardinality** | One active household per user vs many | Start with **one active household** + “switch household” later if needed. |
| **New user bootstrap** | Auto-create personal household vs prompt to join | **Auto-create** a household named e.g. “My home” on first sign-in so pantry rows always have a `household_id`. |
| **Recipe catalog** | Global read-only vs per-user recipes | Keep **global read-only** for editorial `recipe` (and related catalog tables); user/household scope applies to **pantry, meal plan, favorites, tailored mappings**, not the canonical recipe corpus unless you add “user recipes” later. |
| **Anonymous Supabase users** | Use `signInAnonymously` then link vs email-only | If **(B)** optional account: anonymous JWT + **link email** preserves `auth.uid()` for merges; if **(A)** required: skip anonymous in production. |

**Exit for §2:** Short “product appendix” (ticket or section below) with chosen letters and any copy/deadline constraints.

---

## 3. Goals

- **G1 — Identity:** Stable `auth.users` identity for every cloud-backed session used for sync.
- **G2 — Server-side enforcement:** RLS on all tables holding household or user-private data; catalog tables restricted appropriately.
- **G3 — Cross-device sync:** Mutations to scoped entities eventually converge across devices for the same household without manual duplicate cleanup (stable IDs, dedupe rules documented in repo norms).
- **G4 — Shared pantry:** Two distinct accounts that are members of the same household observe the same pantry (`stock`) rows (subject to conflict rules).
- **G5 — Wired app auth:** `AuthProvider` active in production paths; `useAuth` consumers do not throw; sign-in / sign-up / password reset flows work against Supabase.
- **G6 — Observability:** Clear client handling of auth and RLS failures (no token or PII in logs per project rules).

---

## 4. Non-goals (this release)

- Full **collaboration** beyond shared read/write pantry and scoped entities (no comments, no activity feeds).
- **Server-side merge UI** for complex conflicts (document LWW or equivalent; defer field-level merge).
- **Web** parity unless explicitly scheduled (focus native first if that remains the product split).
- Replacing **RevenueCat** with auth for monetization (optional: `Purchases.logIn` alignment only).

---

## 5. Current state (repository facts)

### 5.1 Client auth

- `auth/` exposes `AuthProvider`, `useAuth`, `SupabaseAuthStrategy`, `MockAuthStrategy`, `ProtectedRoute`, `GuestOnlyRoute`.
- `app/_layout.tsx` wraps the tree **without** `AuthProvider` (commented block).
- `app/(auth)/sign-in.tsx`, `sign-up.tsx`, `forgot-password.tsx` call `useAuth()` → **runtime error** if mounted without a provider.
- `components/Profile/EditProfileModal.tsx` uses `useAuthActions()` → same dependency.
- `ProtectedRoute` / `GuestOnlyRoute` are **not referenced** elsewhere in the app router.
- Main entry (`app/index.tsx`) gates on **onboarding** (`ONBOARDING_COMPLETED_KEY`), not `isAuthenticated`.
- **Paywall** uses RevenueCat (`utils/subscription-utils.ts`), not Supabase auth.

### 5.2 Supabase client

- `lib/supabase/supabase-client.ts` creates `@supabase/supabase-js` with `createSupabaseStorageAdapter()` from `~/auth/StorageIntegration` — session persistence can work at the JS client level even when `AuthProvider` is off.

### 5.3 Generated schema snapshot (`lib/supabase/supabase-types.ts`)

Relevant tables include catalog entities (`recipe`, `recipe_step`, `pivot_recipe_ingredient`, `base_ingredient`, …), **`stock`** (pantry-shaped), and **`users`** (profile: `id`, `username`, `preferences`). The generated **`stock` row type has no `user_id` or `household_id`**, so **per-tenant isolation is not expressed in the current client types** and must be added server-side with a types refresh.

### 5.4 Local data

- Meal plans, grocery checks, and much UX state live in **WatermelonDB** (`data/api/mealPlanApi.ts`, repositories, schema in `data/db/schema.ts`). There is **no `meal_plan` table** in the current Supabase types file — cloud persistence for meal plans requires **new tables** (or a deliberate scope cut).

---

## 6. Architecture

### 6.1 High-level layers

```text
┌─────────────────────────────────────────────────────────────┐
│  Expo Router UI + onboarding + paywall (RevenueCat)         │
├─────────────────────────────────────────────────────────────┤
│  AuthProvider (~/auth)  ←→  Zustand AuthStore + strategy    │
├─────────────────────────────────────────────────────────────┤
│  ActiveHouseholdContext (or store): household_id + role     │
├─────────────────────────────────────────────────────────────┤
│  WatermelonDB (source of truth while offline)               │
├─────────────────────────────────────────────────────────────┤
│  Sync engine: push/pull batches, tombstones, backoff        │
├─────────────────────────────────────────────────────────────┤
│  supabase-js (user JWT) → PostgREST + RLS                  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Trust boundaries

- **Browser/native app** holds refresh tokens via secure storage; **RLS** assumes JWT claims from Supabase Auth.
- **Service role** key must never ship in the app; batch jobs or admin imports use server/Edge Functions with service role if needed.
- **Catalog writes** (new global recipes) should not be open to arbitrary `authenticated` clients unless product requires it.

### 6.3 Identity and households

- **`auth.users.id`** is the primary key for a person.
- **`household`** is the unit of shared pantry (and other shared entities).
- **`household_member`** links `auth.users.id` to `household.id` with a **role** (`owner` | `member` | future `viewer`).
- **Scoped rows** (e.g. `stock`) carry **`household_id`**. Optional **`created_by`** (`uuid`) aids auditing and “who added this.”

**Why `household_id` on pantry rows instead of only `user_id`:**  
Cross-account sharing is a first-class requirement. Policies check membership, not equality to a single `user_id`.

---

## 7. Data model (Supabase)

### 7.1 New / updated tables (logical)

| Object | Purpose |
| ------ | ------- |
| `household` | id, name, created_at, updated_at, optional metadata |
| `household_member` | household_id, user_id, role, created_at; unique (household_id, user_id) |
| `stock` (alter) | Add `household_id` not null (after backfill), `updated_at` for sync, optional `deleted_at` or sync tombstone strategy |
| `users` (existing) | Continue to mirror `auth.users.id`; optional `default_household_id` for faster client bootstrap |
| **Future scoped tables** | `meal_plan_item`, `user_favorite_recipe`, `tailored_recipe_mapping`, etc., each with `household_id` (or `user_id` if explicitly private-not-shared) |

### 7.2 ID strategy

- **UUIDs** for `household.id`, `stock.id` (if not already), and syncable entities to avoid collisions across offline creates.
- Client generates UUIDs before insert where appropriate; server accepts idempotent upserts (`on conflict`) where useful.

### 7.3 Referential integrity

- `household_member.user_id` references `auth.users(id)` (or `public.users` if you enforce 1:1 and trigger profile creation).
- `stock.household_id` references `household(id)` with `on delete restrict` or cascade per product policy (usually **restrict** if pantry must be empty before household delete).

### 7.4 WatermelonDB alignment

- Add `household_id` (and sync metadata: `server_updated_at`, `sync_status` if needed) to local models that participate in cloud sync, or maintain a parallel mapping table. Prefer **one source of truth** in Watermelon with clear fields for conflict resolution.
- Migration path for existing local-only installs: on first successful auth + household resolution, **upload** local stock with new UUIDs or map existing ids to server ids (document chosen strategy to avoid duplicates noted in `AGENTS.md`).

---

## 8. Row Level Security (RLS)

### 8.1 General rules

1. **Enable RLS** on: `household`, `household_member`, `stock`, and every new scoped sync table.
2. **No broad policies** like `using (true)` on tenant data.
3. **Catalog tables** (`recipe`, `base_ingredient`, …): typically `SELECT` for `authenticated` and/or `anon` as product requires; **mutations** only via elevated paths if recipes are editorial.

### 8.2 Helper SQL (recommended)

Create a stable SQL helper for membership checks, e.g.:

```sql
-- Conceptual only; implement in migrations with correct search_path
create or replace function public.is_household_member(p_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_member m
    where m.household_id = p_household
      and m.user_id = auth.uid()
  );
$$;
```

Use `security definer` only if required and **lock down** execution grants; alternatively inline `exists (...)` in each policy for clarity.

### 8.3 Example policies (conceptual)

**`household_member`**

- `SELECT`: user may read rows where `user_id = auth.uid()` OR `is_household_member(household_id)`.
- `INSERT` / `DELETE`: restrict to **owners** or use **Edge Function** for invites (simpler v1: only owner can add members via RPC with `security definer`).

**`stock`**

- `SELECT` / `INSERT` / `UPDATE` / `DELETE`: `is_household_member(household_id)` (optionally restrict DELETE to owner/member per policy).

**`household`**

- `SELECT`: members only.
- `UPDATE`: owner (or members for name if allowed).

### 8.4 Testing RLS

- Use **second Supabase user** in SQL or integration tests: verify isolation and shared access.
- Optional: **pgTAP** or Supabase policy tests in CI for critical tables.

---

## 9. Application behavior

### 9.1 Mount `AuthProvider`

- In `app/_layout.tsx`, wrap the existing provider tree with:

  `AuthProvider` + `strategy={new SupabaseAuthStrategy()}` (and env-based mock for tests / Detox per test plan).

- Ensure **initialization order**: Supabase client ready, then `initialize()` from store, then hide splash / route.

### 9.2 Navigation matrix (illustrative)

| State | Route behavior |
| ----- | -------------- |
| Not initialized | Splash / loading |
| Initialized, unauthenticated, optional cloud | Main app **or** “Sign in for sync” banner per product |
| Initialized, unauthenticated, required cloud | Redirect to `/(auth)/sign-in` |
| Authenticated, no household | Run bootstrap RPC or client flow to create household + membership |
| Authenticated, household resolved | Main app with `household_id` in context |

### 9.3 `ActiveHousehold` context

- Resolve `household_id` after login: from `users.default_household_id`, or first membership, or last-used local preference (MMKV) validated against memberships.
- All sync and scoped queries include this id.

### 9.4 RevenueCat (optional alignment)

- After successful auth, call `Purchases.logIn(userId)` with a stable string (Supabase user id) if the dashboard is configured for cross-device purchase restoration with that id.
- Document **logout** behavior (`Purchases.logOut`) to avoid leaking entitlements across accounts on a shared device.

### 9.5 Profile and legacy screens

- `EditProfileModal` and auth routes must **always** sit under `AuthProvider` after this work.

---

## 10. Sync protocol (WatermelonDB ↔ Supabase)

### 10.1 Principles

- **Offline-first:** Local writes succeed without network; sync is **eventual**.
- **Stable IDs:** Server and client agree on primary keys for syncable rows (UUID).
- **Timestamps:** `updated_at` (server-generated or client with server override) for **last-write-wins (LWW)** v1.
- **Deletes:** Prefer **`deleted_at`** tombstone for rows that must propagate deletes; destructive local deletes need a “pending delete” queue if LWW would resurrect.

### 10.2 Operations

1. **Pull (initial and periodic):** `select * from stock where household_id = ? and updated_at > ?` (cursor pagination).
2. **Push:** Batch upserts from local “dirty” queue; handle `409` / RLS errors with user-visible retry or sign-in prompt.
3. **Reconciliation:** On pull, merge into Watermelon: update if server `updated_at` newer; else mark local as dirty and push.

### 10.3 Scope order (suggested)

1. **`stock` (pantry)** — highest value, existing Supabase table to extend.  
2. **Favorites / tailored** — if stored locally only today, add cloud tables + Watermelon fields.  
3. **Meal plan + grocery derived state** — meal plan items cloud table; grocery list may remain **derived** from meal plan + pantry without its own durable cloud table, or persist checks if needed cross-device.

### 10.4 Conflict policy (v1)

- **LWW on `updated_at`** with server clock authority on conflict resolution endpoint if clock skew is an issue.
- Document known limitations (simultaneous edits to same field).

### 10.5 Background triggers

- App foreground, network regain, post-mutation debounce, manual “Sync now” optional.

---

## 11. Household sharing UX (minimal viable)

1. **Invite code** or deep link: generate short-lived code stored in `household_invite` (optional table) or signed JWT in link.
2. **Join flow:** second user enters code → RPC validates → insert `household_member` → refresh `ActiveHousehold`.
3. **Leave / remove:** owner can remove member; member can leave (policy must prevent orphaning data without rules).

Defer **email invites** and **multi-household** polish if needed for schedule.

---

## 12. Implementation phases and acceptance criteria

| Phase | Deliverables | Acceptance |
| ----- | ------------ | ---------- |
| **P1** | Product decisions §2 documented | Team sign-off |
| **P2** | SQL migrations: `household`, `household_member`, `stock` columns, indexes | Migrations apply clean on empty DB |
| **P3** | RLS policies + membership helper/RPC | Cross-user isolation test passes; two members share `stock` |
| **P4** | `AuthProvider` wired; router gates per §9.2 | No `useAuth` crash; cold start session restore |
| **P5** | `ActiveHousehold` + bootstrap | New user has household and can insert `stock` with RLS |
| **P6** | Sync engine for `stock` v1 | Two devices same household converge after edits |
| **P7** | Join household UX | Second account sees shared pantry |
| **P8** | Extend sync to favorites / meal plan / tailored per roadmap | Same convergence tests per entity |
| **P9** | Hardening: logging, retries, E2E smoke | Detox/Jest coverage as agreed |

---

## 13. Testing strategy

- **Unit:** Auth store, sync merge pure functions, invite code validation.
- **Integration (JS):** Mock Supabase or test project with anon key + two users.
- **SQL:** RLS negative and positive cases for `stock`.
- **E2E:** Optional path “sign in → pantry change → second session sees change” (may use mock auth or test Supabase per Detox design doc).

---

## 14. Security and privacy

- Never log access/refresh tokens or raw JWT payloads.
- Validate **every** insert/update includes `household_id` the user is allowed to write (RLS is backstop; client should still send correct scope).
- Rate-limit invite creation on server if abuse is a concern.
- Document **GDPR / account deletion**: cascade or anonymize household data per legal choice.

---

## 15. Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| RLS misconfiguration exposes data | Staged rollout; automated RLS tests; enable RLS before public traffic |
| Duplicate pantry rows after sync | Stable UUIDs; upsert semantics; dedupe on refetch per project norms |
| Auth commented back on breaks Detox | Keep `MockAuthStrategy` + env flag (existing doc direction) |
| Clock skew breaks LWW | Server-side `updated_at` on write path or NTP guidance |

---

## 16. Follow-on documentation

After §2 is approved, add:

- `docs/superpowers/plans/YYYY-MM-DD-auth-rls-sync-plan.md` — executor task breakdown (invoke **writing-plans** workflow if the team uses superpowers plans).

---

## 17. Glossary

| Term | Meaning |
| ---- | ------- |
| **RLS** | Postgres row-level policies evaluated per query using `auth.uid()` |
| **Household** | Shared tenancy boundary for pantry and related synced rows |
| **LWW** | Last-write-wins conflict resolution using timestamps |
| **Catalog** | Global recipe/ingredient reference data, not per-household |

---

## 18. Revision history

| Date | Author | Change |
| ---- | ------ | ------ |
| 2026-05-03 | — | Initial draft |
