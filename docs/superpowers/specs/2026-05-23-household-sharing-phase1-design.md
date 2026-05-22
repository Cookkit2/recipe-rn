# Household/Family Account Sharing — Phase 1 Design

## Overview

Multiple users share a household with a synced pantry, grocery list, and meal plans. Phase 1 delivers the core household model, invite flow, and shared pantry with poll-based sync.

**Phased approach:**
- **Phase 1** (this spec): Household model, invite/accept, shared pantry, flat permissions, poll-based sync
- **Phase 2**: Real-time sync engine with conflict resolution, shared grocery lists and meal plans
- **Phase 3**: Read-only role, activity log, household settings (dietary restrictions, cuisine preferences), shared recipe collections

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Households per user | One | Simpler data model and UI |
| Invite method | Shareable join code/link | No email infra needed for Phase 1 |
| Pantry model | Single shared pool | All members share one pantry |
| Data on creation | Creator's stock seeds household | Natural onboarding; joiners don't merge |
| Member limits | Free=2, Pro=6 | Free tier gets a taste, Pro unlocks families |
| Permissions | Flat (everyone equal) | Simplest for Phase 1; creator can dissolve |
| Data on leaving | Back to solo, added items stay with household | Members' pantry contributions remain shared |
| Architecture | WatermelonDB primary, Supabase mirror | Preserves offline-first; sync in background |

## Data Model

### Supabase — new tables

```sql
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  invite_expires_at TIMESTAMPTZ NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 2,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);

CREATE INDEX idx_household_members_household ON household_members(household_id);
CREATE INDEX idx_household_members_user ON household_members(user_id);
```

### Supabase — modified tables

Add `household_id` and `added_by_user_id` to shared entities:

```sql
ALTER TABLE stock ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE SET NULL;
ALTER TABLE stock ADD COLUMN added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_stock_household ON stock(household_id);
```

Meal plans, grocery lists, and cooking history get the same treatment in later phases. Phase 1 focuses on pantry (stock).

### WatermelonDB — new tables

Added to `schema.ts` (schema version bump to 5):

```
household
  supabase_id: string (indexed)
  name: string
  invite_code: string
  invite_expires_at: number
  max_members: number
  created_by_user_id: string
  created_at: number
  updated_at: number

household_member
  supabase_id: string (indexed)
  household_id: relation(household) (indexed)
  user_id: string
  display_name: string (optional)
  joined_at: number
```

### WatermelonDB — modified tables

```
stock: + household_id: string (optional, indexed)
       + added_by_user_id: string (optional)
```

Existing stock items without `household_id` remain solo/personal.

**Key invariant**: `household_id` on a stock item means it's shared. `null` means it's personal.

## Household Lifecycle

### Creating a household

1. User taps "Create Household" in settings/profile
2. Enters a household name
3. System creates `households` row + `household_members` row (as creator)
4. All existing `stock` rows for this user get `household_id` set — creator's data seeds the household
5. An `invite_code` is generated (random 8-char alphanumeric, expires in 7 days)
6. Invite code is shareable as a deep link: `cookkit://join/{invite_code}`
7. Creator can regenerate the invite code from Household Settings (generates a new code, old code is invalidated)

### Joining a household

1. User taps the deep link or enters invite code manually
2. App validates: code exists, not expired, household not full
3. Checks subscription tier: free=2 max, Pro=6 max
4. User's existing personal stock items stay personal (not merged)
5. Creates `household_members` row
6. Household's shared stock items sync down to member's WatermelonDB
7. User sees shared pantry items

### Leaving a household

1. Member taps "Leave Household"
2. `household_members` row is deleted
3. Stock items they added (where `added_by_user_id` matches) stay with the household
4. Shared stock items are removed from their local WatermelonDB
5. They revert to solo mode with any personal (non-shared) items intact

Note: Recipe collection sharing and per-member recipe ownership tracking is deferred to Phase 3 (shared recipe collections).

### Dissolving a household (creator only)

1. Creator taps "Dissolve Household"
2. All members are removed
3. Shared stock items are reassigned to the creator (back to personal, `household_id` set to null)
4. `households` row is marked inactive/deleted
5. All members get a notification

## Sync Strategy (Phase 1)

Poll-based sync — simple, reliable, good enough for first release.

### Sync triggers

- **App foreground** — sync fires when app returns to foreground
- **Manual pull-to-refresh** — on pantry/grocery screens
- **After a write** — push local changes to Supabase, then pull updates

### Push flow

1. Query WatermelonDB for records where `updated_at > last_sync_timestamp`
2. Batch upsert to corresponding Supabase tables
3. Update `last_sync_timestamp` locally

### Pull flow

1. Fetch from Supabase: all shared entities for `household_id` where `updated_at > last_sync_timestamp`
2. Upsert into WatermelonDB (local wins on conflict — simplest for Phase 1)
3. Update `last_sync_timestamp`

### Conflict resolution: Last-write-wins

- Use `updated_at` timestamps from Supabase as the authority
- If the same item was edited by two members, the later `updated_at` wins
- No merge dialog, no diffing — accept the latest version
- Phase 2 can add operational transforms or CRDTs if needed

### Offline behavior

- All reads/writes go to WatermelonDB first (offline works naturally)
- A sync queue tracks pending pushes
- When connectivity returns, queued operations are pushed in order
- No user-visible error for offline writes — syncs when possible

## Subscription Tier Integration

### Free tier

- Can create or join a household
- Max 2 members per household
- Shared pantry included

### Pro tier

- Everything in free, plus:
- Max 6 members per household
- Shared grocery lists and meal plans (Phase 2+)

### Enforcement

- Household creation checks `max_members` based on subscription status
- Invite validation checks current member count against `max_members`
- If a Pro household downgrades and has >2 members, existing members are NOT kicked out (grandfathered), but no new invites can be sent until membership drops below the limit
- RevenueCat entitlement check uses the existing `isValidSubscription()` utility
- No new RevenueCat SKU needed for Phase 1

## UI Screens and Navigation

### New screens

1. **Household Settings** (accessible from Profile)
   - Household name, invite code, member list
   - "Share Invite Link" button (copies deep link to clipboard)
   - "Regenerate Invite Code" button (invalidates old code, generates new one)
   - "Leave Household" button
   - "Dissolve Household" button (creator only)
   - Member count vs max (e.g., "3 of 6 members")

2. **Join Household** (deep link destination)
   - Shows household name and member count
   - "Join" button with confirmation
   - Error states: expired code, full household, already in a household

3. **Create Household** (from Profile)
   - Name input field
   - Subscription-aware: shows "Pro members can add up to 6 people" upsell if free

### Modified screens

4. **Pantry** — no visual change. Shared items appear alongside personal items. A household icon/badge on items added by other members is optional for Phase 1.

5. **Profile** — new "Household" row in settings section. Shows household name if in one, "Set up Household" CTA if not.

### Deep links

- `cookkit://join/{invite_code}` handled by Expo Router deep link config
- If app isn't installed → universal link falls back to App Store/Play Store. Phase 1 limitation — hosted redirect page can be added later.

## Error Handling

### Invite errors

| State | Message |
|---|---|
| Expired code | "This invite has expired. Ask the household admin for a new link." |
| Household full | "This household is full (2/2 members). Upgrade to Cookkit Pro for up to 6 members." |
| Already in household | "You're already in a household. Leave your current household first." |
| Invalid code | "This invite code isn't valid." |

### Network errors

- Sync fails → silent retry on next trigger, no user-facing error
- Join/create fails → show error with retry button (user-initiated action)

### Data integrity

- Duplicate sync pulls (same `supabase_id` exists locally) → upsert, don't duplicate
- Removed member with pending writes → writes are still pushed but filtered by `household_id` membership on server side

## Testing Strategy

### Unit tests

- Household model: creation, membership, invite code generation
- Sync logic: push/pull, last-write-wins conflict resolution
- Invite validation: expiry, capacity, duplicate membership

### Integration tests

- Full lifecycle: create → invite → join → shared pantry visible → leave → back to solo
- Offline sync queue: write offline → come online → verify push
- Subscription gating: free user cannot exceed 2 members

### E2E tests (critical paths)

- Create household and share invite link
- Join household via deep link, verify shared pantry items appear
- Leave household, verify pantry items removed and personal items intact

## Phase 2 and 3 Preview

**Phase 2 — Real-time Sync Engine:**
- Supabase realtime subscriptions per `household_id`
- Operational transform or CRDT-based conflict resolution
- Presence indicators (who's online)
- Optimistic UI updates with rollback

**Phase 3 — Permissions & Activity:**
- Read-only role for kids
- Activity log: who added/edited/removed items
- Household settings: shared dietary restrictions, cuisine preferences
- Per-member analytics in shared context
