import { Q } from "@nozbe/watermelondb";
import { database } from "~/data/db/database";
import { householdApi } from "~/data/supabase-api/HouseholdApi";
import { log } from "~/utils/logger";
import { StorageFactory } from "~/data/storage/storage-factory";
import { shouldApplyRemoteUpdate } from "./householdSyncResolver";
import { SyncWriteQueue, getSyncWriteQueue } from "./SyncWriteQueue";

const LAST_SYNC_KEY = "household_last_sync_timestamp";

export class HouseholdSyncService {
  // Injected for testability; defaults to the process singleton so production
  // code is unchanged. The queue is MMKV-backed (persists across restarts).
  private writeQueue: SyncWriteQueue;

  constructor(writeQueue: SyncWriteQueue = getSyncWriteQueue()) {
    this.writeQueue = writeQueue;
  }

  private getLastSyncTimestamp(): number {
    try {
      const storage = StorageFactory.getInstance();
      return Number(storage.getString("household_last_sync_timestamp") ?? "0");
    } catch {
      return 0;
    }
  }

  private setLastSyncTimestamp(ts: number): void {
    try {
      const storage = StorageFactory.getInstance();
      storage.setString("household_last_sync_timestamp", String(ts));
    } catch {
      // Storage not initialized yet
    }
  }

  async syncHousehold(householdSupabaseId: string): Promise<void> {
    try {
      // Drain any persisted push payloads (from a prior offline/failed sync)
      // before pushing new changes, so retries are not starved. Errors here are
      // non-blocking — a drain failure is re-queued by the queue itself.
      try {
        await this.writeQueue.drain(householdSupabaseId, (rows) =>
          householdApi.upsertSharedStock(rows as any)
        );
      } catch (drainError) {
        log.error("Household sync write-queue drain failed:", drainError);
      }

      await this.pushLocalChanges(householdSupabaseId);
      await this.pullRemoteChanges(householdSupabaseId);
      this.setLastSyncTimestamp(Date.now());
    } catch (error) {
      log.error("Household sync failed:", error);
    }
  }

  private async pushLocalChanges(householdSupabaseId: string): Promise<void> {
    const lastSync = this.getLastSyncTimestamp();
    const stockCollection = database.collections.get("stock");

    // Query by household_id + updated_at > lastSync at the DB layer instead of
    // fetching the entire collection and filtering in JS (issue #734 N+1 fix).
    // `household_id` is isIndexed:true in the schema (the indexed leg); the
    // `updated_at` leg is an unindexed post-filter, so on very large pantries
    // the household_id index does the heavy lifting — same shape as the
    // Q.gt(Date.now()) precedent in TailoredRecipeMappingRepository.ts.
    // `updated_at` is a @date column stored as a number (ms), and lastSync is
    // already a ms number, so Q.gt is type-correct.
    const sharedItems = await stockCollection
      .query(Q.where("household_id", householdSupabaseId), Q.where("updated_at", Q.gt(lastSync)))
      .fetch();

    if (sharedItems.length === 0) return;

    const rows = sharedItems.map((item: any) => ({
      id: item.supabaseId || item.id,
      name: item.name,
      base_ingredient_id: null,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      expiry_date: item._expiryDate ? new Date(item._expiryDate).toISOString() : null,
      category: null,
      image_url: item.imageUrl ?? null,
      x: item.x ?? null,
      y: item.y ?? null,
      scale: item.scale ?? null,
      household_id: householdSupabaseId,
      added_by_user_id: item.addedByUserId ?? null,
      created_at: item.createdAt ? new Date(item.createdAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    }));

    try {
      await householdApi.upsertSharedStock(rows);
    } catch (error) {
      // Queue the payload for retry with backoff instead of dropping it. The
      // queue persists across restarts (MMKV) and drains on the next sync.
      this.writeQueue.enqueue(householdSupabaseId, rows);
      throw error;
    }
  }

  private async pullRemoteChanges(householdSupabaseId: string): Promise<void> {
    const lastSync = this.getLastSyncTimestamp();
    const since = lastSync > 0 ? new Date(lastSync).toISOString() : undefined;

    const remoteItems = await householdApi.getSharedStock(householdSupabaseId, since);
    if (remoteItems.length === 0) return;

    const stockCollection = database.collections.get("stock");

    await database.write(async () => {
      const batchOps: import("@nozbe/watermelondb").Model[] = [];

      // ⚡ Bolt Performance Optimization: Fetch all items once and use a Map for O(1) lookups
      // instead of fetching all items from DB inside the loop for every remote item.
      const allItems = await stockCollection
        .query(Q.where("household_id", householdSupabaseId))
        .fetch();
      const itemsMap = new Map();
      for (const item of allItems) {
        if ((item as any).supabaseId) {
          itemsMap.set((item as any).supabaseId, item);
        }
      }

      for (const remoteItem of remoteItems) {
        const existing = itemsMap.get(remoteItem.id);

        if (existing) {
          // Last-writer-wins guard (audit defect #1, HIGH): do NOT overwrite a
          // local row whose `updated_at` is at least as fresh as the remote one.
          // Without this, an offline local edit followed by a full sync can be
          // silently clobbered by a staler remote row. Mirrors the guard the
          // realtime path already applies (HouseholdRealtimeService.handleUpdate).
          const remoteUpdatedAtMs = remoteItem.updated_at
            ? new Date(remoteItem.updated_at).getTime()
            : 0;
          const localUpdatedAtMs = (existing as any).updatedAt
            ? new Date((existing as any).updatedAt).getTime()
            : 0;

          if (!shouldApplyRemoteUpdate(remoteUpdatedAtMs, localUpdatedAtMs)) {
            // Conflict surfaced (local is newer): preserve the local row. The
            // queued re-push path will reconcile it back to remote on the next
            // sync drain. Logged observably only — no user-facing prompt (P3).
            if (__DEV__) {
              log.info(
                `[household-sync] preserved fresher local edit for ${remoteItem.id} ` +
                  `(local ${localUpdatedAtMs} > remote ${remoteUpdatedAtMs})`
              );
            }
            continue; // preserve the fresher local edit
          }

          batchOps.push(
            existing.prepareUpdate((record: any) => {
              record.supabaseId = remoteItem.id;
              record.name = remoteItem.name;
              record.quantity = remoteItem.quantity ?? 0;
              record.unit = remoteItem.unit ?? "";
              record.expiryDate = remoteItem.expiry_date ? new Date(remoteItem.expiry_date) : null;
              record.imageUrl = remoteItem.image_url ?? undefined;
              record.x = remoteItem.x ?? undefined;
              record.y = remoteItem.y ?? undefined;
              record.scale = remoteItem.scale ?? undefined;
              record.householdId = remoteItem.household_id ?? undefined;
              record.addedByUserId = remoteItem.added_by_user_id ?? undefined;
            })
          );
        } else {
          batchOps.push(
            stockCollection.prepareCreate((record: any) => {
              record.supabaseId = remoteItem.id;
              record.name = remoteItem.name;
              record.quantity = remoteItem.quantity ?? 0;
              record.unit = remoteItem.unit ?? "";
              record.expiryDate = remoteItem.expiry_date ? new Date(remoteItem.expiry_date) : null;
              record.imageUrl = remoteItem.image_url ?? undefined;
              record.x = remoteItem.x ?? undefined;
              record.y = remoteItem.y ?? undefined;
              record.scale = remoteItem.scale ?? undefined;
              record.householdId = remoteItem.household_id ?? undefined;
              record.addedByUserId = remoteItem.added_by_user_id ?? undefined;
            })
          );
        }
      }

      if (batchOps.length > 0) {
        await database.batch(batchOps);
      }
    });
  }
}

export const householdSyncService = new HouseholdSyncService();
