# Household Sharing Phase 2 — Production Hardening with Realtime

## Goal

Make the household shared pantry feature production-ready: fix critical gaps in sync reliability (localStorage on RN, no cross-device stock matching), add Supabase Realtime for instant updates between household members, and complete the household management UI.

## Problem Statement

Phase 1 delivered household creation, invite links, and shared pantry sync — but with known limitations that prevent production use:

- **Sync service uses `localStorage`** — doesn't work on React Native
- **Stock has no `supabase_id` column** — cross-device matching is fragile (falls back to WatermelonDB internal IDs)
- **Poll-based sync only** — no automatic updates; members must pull-to-refresh or wait for app foreground
- **No conflict resolution** — concurrent edits silently overwrite
- **Incomplete household UI** — no member list, no remove-member, no name editing, no sync status feedback

## Approach

Single-phase hardening. All tasks in one plan, executed sequentially, because the `supabase_id` migration is a prerequisite for both reliable sync and realtime — splitting means two migrations and re-touched files.

**Sync strategy:** Supabase Realtime (Postgres Changes) for in-session updates + foreground full sync for catch-up. Last-writer-wins for conflicts (compare `updated_at` timestamps).

---

## Section 1: Data Layer — Schema v7 + Stock `supabase_id`

### Schema Migration v7

Add `supabase_id` column to the `stock` table:

- Column: `supabase_id`, type `string`, optional, indexed
- This is the canonical cross-device identifier for stock items
- Matches the Supabase `stock.id` UUID

### Stock Model Update

- Add `@field("supabase_id") supabaseId?: string` to `Stock` model
- Add `supabaseId` to `StockData` interface
- Add `supabaseId` handling to `updateStock` writer method

### Sync Service Update

- Replace fragile `item.supabaseId || item.id` matching with proper `supabaseId` field lookup
- On push: include `supabaseId` in upsert payload so Supabase can match existing rows
- On pull: match remote records by `supabaseId` instead of scanning all local items

### Files

- Modify: `data/db/schema.ts` — version 7, add `supabase_id` column
- Modify: `data/db/migrations.ts` — migration toVersion: 7
- Modify: `data/db/models/Stock.ts` — add `supabaseId` field + interface + writer
- Modify: `data/services/HouseholdSyncService.ts` — use `supabaseId` for matching

---

## Section 2: Sync Infrastructure — MMKV + Realtime

### MMKV for Sync Timestamps

Replace `localStorage` with the existing `IStorage` interface from `data/storage/storage-factory.ts`:

- Store `household_last_sync_timestamp` in MMKV
- Store `household_realtime_connected` state in MMKV
- Use the existing `storageFactory` pattern (already used by auth storage)

### Supabase Realtime

Enable Postgres Changes on the `stock` table:

1. **Client config** — Add `realtime` option to Supabase client initialization in `lib/supabase/supabase-client.ts`
2. **HouseholdRealtimeService** — New service at `data/services/HouseholdRealtimeService.ts`
   - Subscribe to `stock` table changes filtered by `household_id`
   - On INSERT: create local WatermelonDB record with remote data
   - On UPDATE: compare `updated_at` timestamps; if remote is newer, overwrite local
   - On DELETE: remove local record
   - Ignore events from current user by comparing event's `added_by_user_id` against `useAuthStore.getState().user?.id` (Supabase Postgres Changes doesn't filter by user automatically)
3. **Presence** — Use Supabase Presence to track which household members are online (displayed in member list UI)
4. **Lifecycle** — Subscribe when household loads, unsubscribe on leave/dissolve/app background

### Sync Flow

1. **App foreground** → full sync via existing `HouseholdSyncService.syncHousehold()` (push pending, pull remote)
2. **In-session** → Realtime events stream in, applied to local WatermelonDB immediately
3. **Local edits** → push to Supabase via existing `householdApi`, Realtime notifies other members
4. **Offline** → WatermelonDB handles offline writes natively; push on reconnect via foreground sync

### Conflict Resolution — Last-Writer-Wins

On incoming Realtime UPDATE event:

- Compare remote `updated_at` vs local `updated_at`
- Remote newer → overwrite local
- Local newer or equal → ignore event (our change is the one others see)
- Equal timestamps → keep local (arbitrary but deterministic, extremely rare)

No user-facing conflict UI. No data loss for non-conflicting fields — but if two users edit the same field of the same item, one edit wins.

### Files

- Modify: `lib/supabase/supabase-client.ts` — enable realtime
- Create: `data/services/HouseholdRealtimeService.ts` — realtime subscription service
- Modify: `data/services/HouseholdSyncService.ts` — MMKV timestamps, supabaseId matching
- Modify: `store/HouseholdStore.ts` — add realtime connection state, lastSyncedAt
- Modify: `data/api/householdApi.ts` — seed `supabaseId` on createHousehold stock seeding

---

## Section 3: UI — Member Management + Sync Status

All changes to the existing `app/profile/household.tsx` — no new screens.

### Member List

- Show all household members with display name (or "You" for current user) and join date
- Creator gets a "Remove" button next to each non-creator member
- Removing a member: calls `householdApi.removeMember()` on Supabase, removes local member record
- Removed member's stock items stay with household; they lose access to shared pantry

### Household Name Editing

- Creator can tap the household name to enter edit mode (inline TextInput)
- On submit: update both Supabase and local WatermelonDB via `householdApi`
- Non-creators see the name as static text

### Sync Status Indicator

- Banner at top of household settings showing current sync state:
  - "Synced just now" / "Synced 2m ago" — green, subtle
  - "Syncing..." — spinner
  - "Sync failed — tap to retry" — red, tappable
- Uses TanStack Query `isFetching` state + `lastSyncedAt` from HouseholdStore
- Tap on error state triggers `syncSharedStock` mutation

### Files

- Modify: `app/profile/household.tsx` — member list, name editing, sync status
- Modify: `hooks/queries/useHouseholdQueries.ts` — add `useRemoveMember` mutation, `useUpdateHouseholdName` mutation
- Modify: `data/api/householdApi.ts` — add `removeMember`, `updateHouseholdName` functions
- Modify: `data/supabase-api/HouseholdApi.ts` — add `updateHousehold` Supabase call

---

## Out of Scope

These are deferred to future phases:

- **Push notifications** for household events (requires server-side functions or Expo push setup)
- **Activity feed** (who changed what, when)
- **Transfer ownership** (complex permissions change)
- **Offline operation queue with retry** (beyond WatermelonDB's native handling)
- **Field-level conflict merge** (overkill for pantry items)
- **Role-based permissions** (admin vs member beyond creator distinction)

## File Structure Summary

**New files:**
- `data/services/HouseholdRealtimeService.ts`

**Modified files:**
- `data/db/schema.ts`
- `data/db/migrations.ts`
- `data/db/models/Stock.ts`
- `data/services/HouseholdSyncService.ts`
- `lib/supabase/supabase-client.ts`
- `store/HouseholdStore.ts`
- `data/api/householdApi.ts`
- `data/supabase-api/HouseholdApi.ts`
- `app/profile/household.tsx`
- `hooks/queries/useHouseholdQueries.ts`
