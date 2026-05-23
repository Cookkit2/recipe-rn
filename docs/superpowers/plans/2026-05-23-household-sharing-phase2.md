# Household Sharing Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Production-harden the household shared pantry feature — fix critical sync gaps, add Supabase Realtime for instant updates, and complete the household management UI.

**Architecture:** Add `supabase_id` to Stock for reliable cross-device matching. Replace localStorage with MMKV for sync timestamps. Subscribe to Supabase Postgres Changes for real-time stock sync between household members. Last-writer-wins conflict resolution by comparing `updated_at` timestamps.

**Tech Stack:** WatermelonDB (migration v7), Supabase Realtime (Postgres Changes), MMKV (via existing StorageFactory), Zustand (extended store), TanStack Query (new mutations)

---

## File Structure

**New files:**
- `data/services/HouseholdRealtimeService.ts` — Supabase Realtime subscription service

**Modified files:**
- `data/db/schema.ts` — Add `supabase_id` column to stock table, bump to version 7
- `data/db/migrations.ts` — Migration toVersion: 7
- `data/db/models/Stock.ts` — Add `supabaseId` field, interface, writer
- `data/services/HouseholdSyncService.ts` — Replace localStorage with MMKV, use `supabaseId` for matching
- `lib/supabase/supabase-client.ts` — Enable realtime in client config
- `store/HouseholdStore.ts` — Add `lastSyncedAt`, `isSyncing`, `realtimeConnected`, `syncError`
- `data/api/householdApi.ts` — Add `removeMember`, `updateHouseholdName`, seed `supabaseId` on stock creation
- `data/supabase-api/HouseholdApi.ts` — Add `updateHousehold` method
- `app/profile/household.tsx` — Member list, name editing, sync status, remove member
- `hooks/queries/useHouseholdQueries.ts` — Add `useRemoveMember`, `useUpdateHouseholdName` mutations

---

### Task 1: Schema v7 — Stock `supabase_id` Column

**Files:**
- Modify: `data/db/schema.ts`
- Modify: `data/db/migrations.ts`

- [ ] **Step 1: Update schema to version 7 with `supabase_id` column**

In `data/db/schema.ts`, change `version: 6` to `version: 7`. Add one column to the `stock` table's `columns` array after the `added_by_user_id` column (line 127):

```ts
{ name: "supabase_id", type: "string", isOptional: true, isIndexed: true },
```

- [ ] **Step 2: Add migration toVersion: 7**

In `data/db/migrations.ts`, add a new migration object to the `migrations` array after the existing `toVersion: 6` entry:

```ts
{
  toVersion: 7,
  steps: [
    addColumns({
      table: "stock",
      columns: [
        { name: "supabase_id", type: "string", isOptional: true },
      ],
    }),
  ],
},
```

- [ ] **Step 3: Run typecheck to verify**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add data/db/schema.ts data/db/migrations.ts
git commit -m "feat(household): add supabase_id column to stock schema v7"
```

---

### Task 2: Stock Model — Add `supabaseId` Field

**Files:**
- Modify: `data/db/models/Stock.ts`

- [ ] **Step 1: Add `supabaseId` to StockData interface**

In `data/db/models/Stock.ts`, add `supabaseId` to the `StockData` interface after `addedByUserId`:

```ts
supabaseId?: string;
```

- [ ] **Step 2: Add `@field` decorator**

Add after the `@field("added_by_user_id") addedByUserId?: string;` line (line 46):

```ts
@field("supabase_id") supabaseId?: string;
```

- [ ] **Step 3: Add to `updateStock` writer**

Add after the `addedByUserId` check in the `updateStock` method (after line 94):

```ts
if (data.supabaseId !== undefined) stock.supabaseId = data.supabaseId;
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add data/db/models/Stock.ts
git commit -m "feat(household): add supabaseId field to Stock model"
```

---

### Task 3: Sync Service — Replace localStorage with MMKV + Use `supabaseId`

**Files:**
- Modify: `data/services/HouseholdSyncService.ts`

- [ ] **Step 1: Replace localStorage with MMKV**

In `data/services/HouseholdSyncService.ts`, replace the localStorage imports and methods with MMKV.

Replace the `LAST_SYNC_KEY` constant and the two private methods:

```ts
import { StorageFactory } from "~/data/storage/storage-factory";
```

Replace the `getLastSyncTimestamp` method:

```ts
private getLastSyncTimestamp(): number {
  try {
    const storage = StorageFactory.getInstance();
    return Number(storage.getString("household_last_sync_timestamp") ?? "0");
  } catch {
    return 0;
  }
}
```

Replace the `setLastSyncTimestamp` method:

```ts
private setLastSyncTimestamp(ts: number): void {
  try {
    const storage = StorageFactory.getInstance();
    storage.setString("household_last_sync_timestamp", String(ts));
  } catch {
    // Storage not initialized yet — skip persisting timestamp
  }
}
```

Remove the `localStorage` references. The `log` import can stay.

- [ ] **Step 2: Use `supabaseId` for cross-device matching in `pullRemoteChanges`**

In the `pullRemoteChanges` method, replace the fragile matching logic. Change the `existing` lookup from:

```ts
const allItems = await stockCollection.query().fetch();
const existing = allItems.find(
  (i: any) => i.supabaseId === remoteItem.id || i.id === remoteItem.id
);
```

To:

```ts
const allItems = await stockCollection.query().fetch();
const existing = allItems.find((i: any) => i.supabaseId === remoteItem.id);
```

This removes the fallback to WatermelonDB internal ID matching.

- [ ] **Step 3: Set `supabaseId` on pull create and update**

In `pullRemoteChanges`, ensure `supabaseId` is set in both the `prepareUpdate` and `prepareCreate` callbacks. Add this line to both blocks:

```ts
record.supabaseId = remoteItem.id;
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add data/services/HouseholdSyncService.ts
git commit -m "fix(household): replace localStorage with MMKV and use supabaseId for stock matching"
```

---

### Task 4: Enable Supabase Realtime

**Files:**
- Modify: `lib/supabase/supabase-client.ts`

- [ ] **Step 1: Add realtime option to Supabase client**

In `lib/supabase/supabase-client.ts`, add the `realtime` option to the `createClient` config object. Add after the `global` key in the config (after line 33):

```ts
realtime: {
  params: {
    eventsPerSecond: 2,
  },
},
```

This enables Supabase Realtime with a conservative 2 events/second rate limit to avoid overwhelming the client with rapid stock changes.

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/supabase-client.ts
git commit -m "feat(household): enable Supabase Realtime in client config"
```

---

### Task 5: Household Realtime Service

**Files:**
- Create: `data/services/HouseholdRealtimeService.ts`

- [ ] **Step 1: Create realtime service**

Create `data/services/HouseholdRealtimeService.ts`:

```ts
import { supabase } from "~/lib/supabase/supabase-client";
import { database } from "~/data/db/database";
import { useAuthStore } from "~/auth/AuthStore";
import { log } from "~/utils/logger";

type RealtimeChannel = import("@supabase/supabase-js").RealtimeChannel;

export class HouseholdRealtimeService {
  private channel: RealtimeChannel | null = null;
  private householdSupabaseId: string | null = null;

  subscribe(householdSupabaseId: string): void {
    if (!supabase) {
      log.warn("HouseholdRealtimeService: Supabase not available, skipping subscription");
      return;
    }

    // Avoid duplicate subscriptions
    if (this.householdSupabaseId === householdSupabaseId && this.channel) {
      return;
    }

    // Unsubscribe from previous household
    this.unsubscribe();

    this.householdSupabaseId = householdSupabaseId;
    const userId = useAuthStore.getState().user?.id;

    this.channel = supabase
      .channel(`household-stock:${householdSupabaseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock",
          filter: `household_id=eq.${householdSupabaseId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          // Ignore own changes — we already applied them locally
          const recordUserId =
            (newRecord as any)?.added_by_user_id ?? (oldRecord as any)?.added_by_user_id;
          if (recordUserId === userId) return;

          switch (eventType) {
            case "INSERT":
              this.handleInsert(newRecord as any);
              break;
            case "UPDATE":
              this.handleUpdate(newRecord as any);
              break;
            case "DELETE":
              this.handleDelete(oldRecord as any);
              break;
          }
        }
      )
      .subscribe((status) => {
        log.info(`HouseholdRealtime: ${status} for household ${householdSupabaseId}`);
      });

    log.info(`HouseholdRealtime: subscribed to household ${householdSupabaseId}`);
  }

  unsubscribe(): void {
    if (this.channel) {
      supabase?.removeChannel(this.channel);
      this.channel = null;
      this.householdSupabaseId = null;
      log.info("HouseholdRealtime: unsubscribed");
    }
  }

  private async handleInsert(record: {
    id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    expiry_date: string | null;
    image_url: string | null;
    x: number | null;
    y: number | null;
    scale: number | null;
    household_id: string | null;
    added_by_user_id: string | null;
  }): Promise<void> {
    try {
      const stockCollection = database.collections.get("stock");

      // Check if already exists locally (may have been created by us before realtime event arrived)
      const allItems = await stockCollection.query().fetch();
      const existing = allItems.find((i: any) => i.supabaseId === record.id);
      if (existing) return;

      await database.write(async () => {
        await (stockCollection as any).create((r: any) => {
          r.supabaseId = record.id;
          r.name = record.name;
          r.quantity = record.quantity ?? 0;
          r.unit = record.unit ?? "";
          r._expiryDate = record.expiry_date
            ? new Date(record.expiry_date).getTime()
            : undefined;
          r.imageUrl = record.image_url ?? undefined;
          r.x = record.x ?? undefined;
          r.y = record.y ?? undefined;
          r.scale = record.scale ?? undefined;
          r.householdId = record.household_id ?? undefined;
          r.addedByUserId = record.added_by_user_id ?? undefined;
        });
      });

      log.info(`HouseholdRealtime: inserted stock item ${record.id}`);
    } catch (error) {
      log.error("HouseholdRealtime: failed to handle INSERT", error);
    }
  }

  private async handleUpdate(record: {
    id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    expiry_date: string | null;
    image_url: string | null;
    x: number | null;
    y: number | null;
    scale: number | null;
    household_id: string | null;
    added_by_user_id: string | null;
    updated_at: string;
  }): Promise<void> {
    try {
      const stockCollection = database.collections.get("stock");
      const allItems = await stockCollection.query().fetch();
      const existing = allItems.find((i: any) => i.supabaseId === record.id);

      if (!existing) {
        // Not found locally — treat as insert
        await this.handleInsert(record);
        return;
      }

      // Last-writer-wins: compare timestamps
      const remoteUpdatedAt = new Date(record.updated_at).getTime();
      const localUpdatedAt = (existing as any).updatedAt
        ? new Date((existing as any).updatedAt).getTime()
        : 0;

      if (remoteUpdatedAt <= localUpdatedAt) {
        // Local is newer or equal — keep local
        return;
      }

      await database.write(async () => {
        await (existing as any).update((r: any) => {
          r.name = record.name;
          r.quantity = record.quantity ?? 0;
          r.unit = record.unit ?? "";
          r._expiryDate = record.expiry_date
            ? new Date(record.expiry_date).getTime()
            : undefined;
          r.imageUrl = record.image_url ?? undefined;
          r.x = record.x ?? undefined;
          r.y = record.y ?? undefined;
          r.scale = record.scale ?? undefined;
          r.householdId = record.household_id ?? undefined;
          r.addedByUserId = record.added_by_user_id ?? undefined;
        });
      });

      log.info(`HouseholdRealtime: updated stock item ${record.id}`);
    } catch (error) {
      log.error("HouseholdRealtime: failed to handle UPDATE", error);
    }
  }

  private async handleDelete(record: { id: string }): Promise<void> {
    try {
      const stockCollection = database.collections.get("stock");
      const allItems = await stockCollection.query().fetch();
      const existing = allItems.find((i: any) => i.supabaseId === record.id);

      if (!existing) return;

      await database.write(async () => {
        await (existing as any).destroyPermanently();
      });

      log.info(`HouseholdRealtime: deleted stock item ${record.id}`);
    } catch (error) {
      log.error("HouseholdRealtime: failed to handle DELETE", error);
    }
  }
}

export const householdRealtimeService = new HouseholdRealtimeService();
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add data/services/HouseholdRealtimeService.ts
git commit -m "feat(household): add Supabase Realtime service for live stock sync"
```

---

### Task 6: Extend HouseholdStore with Sync State

**Files:**
- Modify: `store/HouseholdStore.ts`

- [ ] **Step 1: Add sync and realtime state to store**

Replace the entire contents of `store/HouseholdStore.ts` with:

```ts
import { create } from "zustand";
import type Household from "~/data/db/models/Household";
import type HouseholdMember from "~/data/db/models/HouseholdMember";

interface HouseholdState {
  currentHousehold: Household | null;
  members: HouseholdMember[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  realtimeConnected: boolean;

  setCurrentHousehold: (household: Household | null) => void;
  setMembers: (members: HouseholdMember[]) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncedAt: (timestamp: number | null) => void;
  setSyncError: (error: string | null) => void;
  setRealtimeConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useHouseholdStore = create<HouseholdState>((set) => ({
  currentHousehold: null,
  members: [],
  isLoading: false,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
  realtimeConnected: false,

  setCurrentHousehold: (household) => set({ currentHousehold: household }),
  setMembers: (members) => set({ members }),
  setLoading: (isLoading) => set({ isLoading }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setSyncError: (syncError) => set({ syncError }),
  setRealtimeConnected: (realtimeConnected) => set({ realtimeConnected }),
  reset: () =>
    set({
      currentHousehold: null,
      members: [],
      isLoading: false,
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,
      realtimeConnected: false,
    }),
}));
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add store/HouseholdStore.ts
git commit -m "feat(household): extend Zustand store with sync and realtime state"
```

---

### Task 7: API Layer — Remove Member + Update Name + Seed `supabaseId`

**Files:**
- Modify: `data/supabase-api/HouseholdApi.ts`
- Modify: `data/api/householdApi.ts`

- [ ] **Step 1: Add `updateHousehold` to Supabase API**

In `data/supabase-api/HouseholdApi.ts`, add a new method to the `householdApi` object (before the closing `}`):

```ts
updateHousehold: async (
  householdId: string,
  updates: { name?: string }
): Promise<Tables<"households">> => {
  if (!guardSupabase()) throw new Error("Supabase not available");
  const { data, error } = await supabase!
    .from("households")
    .update(updates)
    .eq("id", householdId)
    .select()
    .single();
  if (error) throw error;
  return data;
},
```

- [ ] **Step 2: Add `removeMember`, `updateHouseholdName` to API functions**

In `data/api/householdApi.ts`, add these functions to the `householdApiFunctions` object:

After the `syncSharedStock` function:

```ts
removeMember: async (memberUserId: string): Promise<void> => {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error("Not authenticated");

  await householdApi.removeMember(memberUserId);

  // Remove local member record
  const memberCollection = database.collections.get("household_member");
  const members = await memberCollection.query().fetch();
  const targetMember = members.find((m: any) => m.userId === memberUserId);

  if (targetMember) {
    await database.write(async () => {
      await (targetMember as any).destroyPermanently();
    });
  }
},

updateHouseholdName: async (
  householdId: string,
  householdSupabaseId: string,
  newName: string
): Promise<void> => {
  await householdApi.updateHousehold(householdSupabaseId, { name: newName });

  const householdCollection = database.collections.get("household");
  await database.write(async () => {
    const hh = await householdCollection.find(householdId);
    await (hh as any).update((record: any) => {
      record.name = newName;
    });
  });
},
```

- [ ] **Step 3: Seed `supabaseId` on stock during `createHousehold`**

In `data/api/householdApi.ts`, in the `createHousehold` function, update the stock seeding block to set `supabaseId`. Find the `prepareUpdate` call in the stock seeding loop and add:

```ts
record.supabaseId = stock.supabaseId || undefined;
```

Wait — at household creation time, existing stock items won't have a `supabaseId` yet. The upsert in `pushLocalChanges` will assign them one via Supabase. So we need to trigger a sync after seeding to backfill `supabaseId`. Add after the stock seeding block:

```ts
// Sync to backfill supabaseId on seeded stock items
await householdSyncService.syncHousehold(supabaseHousehold.id);
```

Also add the import at the top (it's already imported: `import { householdSyncService } from "~/data/services/HouseholdSyncService";`).

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add data/supabase-api/HouseholdApi.ts data/api/householdApi.ts
git commit -m "feat(household): add removeMember, updateHouseholdName, and seed supabaseId on stock"
```

---

### Task 8: TanStack Query — New Mutations

**Files:**
- Modify: `hooks/queries/useHouseholdQueries.ts`

- [ ] **Step 1: Add `useRemoveMember` mutation**

Add at the end of `hooks/queries/useHouseholdQueries.ts` (before the final closing of the file):

```ts
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberUserId: string) =>
      householdApiFunctions.removeMember(memberUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
```

- [ ] **Step 2: Add `useUpdateHouseholdName` mutation**

```ts
export function useUpdateHouseholdName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      householdId,
      householdSupabaseId,
      name,
    }: {
      householdId: string;
      householdSupabaseId: string;
      name: string;
    }) =>
      householdApiFunctions.updateHouseholdName(householdId, householdSupabaseId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add hooks/queries/useHouseholdQueries.ts
git commit -m "feat(household): add useRemoveMember and useUpdateHouseholdName mutations"
```

---

### Task 9: UI — Household Settings Screen Overhaul

**Files:**
- Modify: `app/profile/household.tsx`

- [ ] **Step 1: Update imports**

Add these imports to the existing import block at the top of `app/profile/household.tsx`:

```ts
import { useState } from "react";
import { TextInput } from "react-native";
import { useRemoveMember, useUpdateHouseholdName, useSyncSharedStock } from "~/hooks/queries/useHouseholdQueries";
import { useHouseholdStore } from "~/store/HouseholdStore";
```

Update the existing imports from `useHouseholdQueries` to include the new hooks:

```ts
import {
  useCurrentHousehold,
  useHouseholdMembers,
  useLeaveHousehold,
  useDissolveHousehold,
  useRegenerateInviteCode,
  useRemoveMember,
  useUpdateHouseholdName,
  useSyncSharedStock,
} from "~/hooks/queries/useHouseholdQueries";
```

- [ ] **Step 2: Add sync status helper**

Inside the component function, after the `regenerateMutation` declaration, add:

```ts
const removeMemberMutation = useRemoveMember();
const updateNameMutation = useUpdateHouseholdName();
const syncMutation = useSyncSharedStock();
const { lastSyncedAt, syncError } = useHouseholdStore();
const [isEditingName, setIsEditingName] = useState(false);
const [editedName, setEditedName] = useState("");

const householdSupabaseId = (household as any)?.supabaseId;

const formatSyncTime = (ts: number | null): string => {
  if (!ts) return "Never";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};
```

- [ ] **Step 3: Add name editing handler**

```ts
const handleStartEditName = () => {
  setEditedName((household as any).name);
  setIsEditingName(true);
};

const handleSaveName = () => {
  if (!editedName.trim() || editedName.trim() === (household as any).name) {
    setIsEditingName(false);
    return;
  }
  updateNameMutation.mutate(
    {
      householdId: household.id,
      householdSupabaseId: householdSupabaseId,
      name: editedName.trim(),
    },
    { onSuccess: () => setIsEditingName(false) }
  );
};
```

- [ ] **Step 4: Add remove member handler**

```ts
const handleRemoveMember = (memberUserId: string, memberName: string) => {
  Alert.alert(
    "Remove Member?",
    `Are you sure you want to remove ${memberName} from the household?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeMemberMutation.mutate(memberUserId),
      },
    ]
  );
};
```

- [ ] **Step 5: Replace the JSX return**

Replace the entire `return (` block with:

```tsx
return (
  <View className="flex-1 bg-background p-6">
    {/* Household Name — editable by creator */}
    {isEditingName ? (
      <TextInput
        className="text-xl font-urbanist-bold mb-2 border-b border-primary pb-1 text-foreground"
        value={editedName}
        onChangeText={setEditedName}
        onBlur={handleSaveName}
        onSubmitEditing={handleSaveName}
        autoFocus
        maxLength={50}
      />
    ) : (
      <View className="flex-row items-center mb-2">
        <P className="text-xl font-urbanist-bold">{(household as any).name}</P>
        {isCreator && (
          <Button variant="ghost" size="icon-sm" onPress={handleStartEditName}>
            <P className="text-primary text-sm">Edit</P>
          </Button>
        )}
      </View>
    )}
    <P className="text-muted-foreground mb-4">
      {memberCount} of {(household as any).maxMembers} members
    </P>

    {/* Sync Status */}
    <View className="flex-row items-center mb-6">
      <P className="text-xs text-muted-foreground">
        {syncMutation.isPending
          ? "Syncing..."
          : syncError
            ? "Sync failed"
            : `Synced ${formatSyncTime(lastSyncedAt)}`}
      </P>
      {(syncError || !syncMutation.isPending) && householdSupabaseId && (
        <Button
          variant="ghost"
          size="icon-sm"
          onPress={() => syncMutation.mutate(householdSupabaseId)}
        >
          <P className="text-primary text-xs ml-2">
            {syncError ? "Retry" : "Sync now"}
          </P>
        </Button>
      )}
    </View>

    {/* Actions */}
    <View className="rounded-2xl bg-muted/50 overflow-hidden border-continuous mb-6">
      <CardContent className="flex p-0 py-2">
        <ListButton title="Share Invite Link" onPress={handleShareLink} />
        {isCreator && <ListButton title="Regenerate Invite Code" onPress={handleRegenerate} />}
      </CardContent>
    </View>

    {/* Members List */}
    <P className="text-sm font-urbanist-bold mb-2">Members</P>
    <View className="rounded-2xl bg-muted/50 overflow-hidden border-continuous mb-6">
      <CardContent className="flex p-0 py-2">
        {members?.map((member: any) => {
          const isMe = member.userId === user?.id;
          return (
            <View
              key={member.id}
              className="flex-row items-center justify-between px-4 py-3 border-b border-border/30 last:border-b-0"
            >
              <View>
                <P className="text-foreground">
                  {isMe ? "You" : member.displayName || member.userId}
                </P>
                <P className="text-xs text-muted-foreground">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </P>
              </View>
              {isCreator && !isMe && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    handleRemoveMember(
                      member.userId,
                      member.displayName || member.userId
                    )
                  }
                >
                  <P className="text-destructive text-sm">Remove</P>
                </Button>
              )}
            </View>
          );
        })}
      </CardContent>
    </View>

    {/* Destructive Actions */}
    <View className="space-y-3">
      {!isCreator && (
        <Button variant="destructive" onPress={handleLeave}>
          <P className="text-destructive-foreground">Leave Household</P>
        </Button>
      )}
      {isCreator && (
        <Button variant="destructive" onPress={handleDissolve}>
          <P className="text-destructive-foreground">Dissolve Household</P>
        </Button>
      )}
    </View>
  </View>
);
```

- [ ] **Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/profile/household.tsx
git commit -m "feat(household): add member list, name editing, sync status, and remove member to settings"
```

---

### Task 10: Wire Realtime into Household Lifecycle

**Files:**
- Modify: `data/api/householdApi.ts`

- [ ] **Step 1: Import and use realtime service**

In `data/api/householdApi.ts`, add the import:

```ts
import { householdRealtimeService } from "~/data/services/HouseholdRealtimeService";
```

- [ ] **Step 2: Subscribe on household fetch**

In the `fetchCurrentHousehold` function, after finding the household, subscribe to realtime. Add before the `return` statement:

```ts
if (household && (household as any).supabaseId) {
  householdRealtimeService.subscribe((household as any).supabaseId);
}
```

- [ ] **Step 3: Subscribe on household creation**

In the `createHousehold` function, add after the `syncHousehold` call at the end:

```ts
householdRealtimeService.subscribe(supabaseHousehold.id);
```

- [ ] **Step 4: Subscribe on join**

In the `joinHousehold` function, add after the `syncHousehold` call:

```ts
householdRealtimeService.subscribe(household.id);
```

- [ ] **Step 5: Unsubscribe on leave**

In the `leaveHousehold` function, add at the beginning (after the auth check):

```ts
householdRealtimeService.unsubscribe();
```

- [ ] **Step 6: Unsubscribe on dissolve**

In the `dissolveHousehold` function, add at the beginning (after the auth check):

```ts
householdRealtimeService.unsubscribe();
```

- [ ] **Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add data/api/householdApi.ts
git commit -m "feat(household): wire realtime subscriptions into household lifecycle"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Run full typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 2: Run full lint**

Run: `bun run lint`
Expected: PASS

- [ ] **Step 3: Run all tests**

Run: `bun run test`
Expected: All tests pass

- [ ] **Step 4: Verify no uncommitted files**

Run: `git status`
Expected: Clean working tree

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Stock `supabase_id` column (schema v7) | Task 1 |
| Stock model `supabaseId` field | Task 2 |
| Replace localStorage with MMKV | Task 3 |
| Use `supabaseId` for cross-device matching | Task 3 |
| Enable Supabase Realtime in client | Task 4 |
| HouseholdRealtimeService (subscribe/unsubscribe) | Task 5 |
| Realtime INSERT handler | Task 5 |
| Realtime UPDATE handler (last-writer-wins) | Task 5 |
| Realtime DELETE handler | Task 5 |
| Ignore own changes (filter by user ID) | Task 5 |
| Extend Zustand store with sync state | Task 6 |
| Remove member API + Supabase call | Task 7 |
| Update household name API + Supabase call | Task 7 |
| Seed `supabaseId` on household creation | Task 7 |
| `useRemoveMember` mutation hook | Task 8 |
| `useUpdateHouseholdName` mutation hook | Task 8 |
| Member list with display names and join dates | Task 9 |
| Remove member button (creator only) | Task 9 |
| Household name editing (creator only) | Task 9 |
| Sync status indicator | Task 9 |
| Wire realtime subscribe on fetch/create/join | Task 10 |
| Wire realtime unsubscribe on leave/dissolve | Task 10 |
