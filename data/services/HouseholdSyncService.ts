import { database } from "~/data/db/database";
import { householdApi } from "~/data/supabase-api/HouseholdApi";
import { log } from "~/utils/logger";
import { StorageFactory } from "~/data/storage/storage-factory";
import { Q } from "@nozbe/watermelondb";

const LAST_SYNC_KEY = "household_last_sync_timestamp";

export class HouseholdSyncService {
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

    // Direct database query to fetch only relevant items
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

    await householdApi.upsertSharedStock(rows);
  }

  private async pullRemoteChanges(householdSupabaseId: string): Promise<void> {
    const lastSync = this.getLastSyncTimestamp();
    const since = lastSync > 0 ? new Date(lastSync).toISOString() : undefined;

    const remoteItems = await householdApi.getSharedStock(householdSupabaseId, since);
    if (remoteItems.length === 0) return;

    const stockCollection = database.collections.get("stock");

    const remoteIds = remoteItems.map((item) => item.id);
    const existingItems = await stockCollection
      .query(Q.where("supabase_id", Q.oneOf(remoteIds)))
      .fetch();

    const existingMap = new Map();
    for (const item of existingItems) {
      existingMap.set((item as any).supabaseId, item);
    }

    await database.write(async () => {
      const batchOps: import("@nozbe/watermelondb").Model[] = [];

      for (const remoteItem of remoteItems) {
        const existing = existingMap.get(remoteItem.id);

        if (existing) {
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
