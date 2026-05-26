import { supabase } from "~/lib/supabase/supabase-client";
import { database } from "~/data/db/database";
import { useAuthStore } from "~/auth/AuthStore";
import { log } from "~/utils/logger";
import { Q } from "@nozbe/watermelondb";

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

          // Ignore own changes
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

      const existingItems = await stockCollection
        .query(Q.where("supabase_id", record.id), Q.take(1))
        .fetch();
      const existing = existingItems[0];
      if (existing) return;

      await database.write(async () => {
        await (stockCollection as any).create((r: any) => {
          r.supabaseId = record.id;
          r.name = record.name;
          r.quantity = record.quantity ?? 0;
          r.unit = record.unit ?? "";
          r._expiryDate = record.expiry_date ? new Date(record.expiry_date).getTime() : undefined;
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
      const existingItems = await stockCollection
        .query(Q.where("supabase_id", record.id), Q.take(1))
        .fetch();
      const existing = existingItems[0];

      if (!existing) {
        await this.handleInsert(record);
        return;
      }

      // Last-writer-wins: compare timestamps
      const remoteUpdatedAt = new Date(record.updated_at).getTime();
      const localUpdatedAt = (existing as any).updatedAt
        ? new Date((existing as any).updatedAt).getTime()
        : 0;

      if (remoteUpdatedAt <= localUpdatedAt) {
        return;
      }

      await database.write(async () => {
        await (existing as any).update((r: any) => {
          r.name = record.name;
          r.quantity = record.quantity ?? 0;
          r.unit = record.unit ?? "";
          r._expiryDate = record.expiry_date ? new Date(record.expiry_date).getTime() : undefined;
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
      const existingItems = await stockCollection
        .query(Q.where("supabase_id", record.id), Q.take(1))
        .fetch();
      const existing = existingItems[0];

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
