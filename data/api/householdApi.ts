import { householdApi } from "~/data/supabase-api/HouseholdApi";
import { householdSyncService } from "~/data/services/HouseholdSyncService";
import { useAuthStore } from "~/auth/AuthStore";
import { generateInviteCode } from "~/utils/invite-code";
import { isValidSubscription } from "~/utils/subscription-utils";
import { database } from "~/data/db/database";
import type Household from "~/data/db/models/Household";
import type HouseholdMember from "~/data/db/models/HouseholdMember";
import { log } from "~/utils/logger";

/**
 * Pure API functions for household operations
 * These functions handle database interactions and data transformation
 */
export const householdApiFunctions = {
  /**
   * Fetch current user's household from local database
   */
  fetchCurrentHousehold: async (): Promise<Household | null> => {
    const user = useAuthStore.getState().user;
    if (!user) return null;

    const memberCollection = database.collections.get("household_member");
    const members = await memberCollection.query().fetch();
    const myMembership = members.find((m: any) => m.userId === user.id);

    if (!myMembership) return null;

    const householdCollection = database.collections.get("household");
    try {
      return (await householdCollection.find((myMembership as any).householdId)) as Household;
    } catch {
      return null;
    }
  },

  /**
   * Fetch members of a household from local database
   */
  fetchMembers: async (householdId: string): Promise<HouseholdMember[]> => {
    const collection = database.collections.get("household_member");
    return (await collection.query().fetch()) as HouseholdMember[];
  },

  /**
   * Fetch invite information from Supabase
   */
  fetchInviteInfo: async (code: string) => {
    const household = await householdApi.getHouseholdByInviteCode(code);
    if (!household) return null;

    const memberCount = await householdApi.getMemberCount(household.id);

    return {
      household,
      memberCount,
    };
  },

  /**
   * Create a new household
   * - Creates household in Supabase
   * - Adds creator as member in Supabase
   * - Creates household locally in WatermelonDB
   * - Creates member locally in WatermelonDB
   * - Seeds household with all existing user stock items
   */
  createHousehold: async (name: string): Promise<Household> => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Not authenticated");

    const isPro = !!(await isValidSubscription());
    const maxMembers = isPro ? 6 : 2;

    const inviteCode = generateInviteCode();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const supabaseHousehold = await householdApi.createHousehold({
      name,
      inviteCode,
      inviteExpiresAt,
      maxMembers,
      createdBy: user.id,
    });

    await householdApi.addMember({
      householdId: supabaseHousehold.id,
      userId: user.id,
    });

    const householdCollection = database.collections.get("household");
    const memberCollection = database.collections.get("household_member");

    const localHousehold = await database.write(async () => {
      const hh = await (householdCollection as any).create((record: any) => {
        record.supabaseId = supabaseHousehold.id;
        record.name = name;
        record.inviteCode = inviteCode;
        record.inviteExpiresAt = new Date(supabaseHousehold.invite_expires_at).getTime();
        record.maxMembers = maxMembers;
        record.createdByUserId = user.id;
      });

      await (memberCollection as any).create((record: any) => {
        record.supabaseId = supabaseHousehold.id;
        record.householdId = hh.id;
        record.userId = user.id;
        record.joinedAt = Date.now();
      });

      return hh;
    });

    // Seed household: assign all existing user stock items to this household
    const stockCollection = database.collections.get("stock");
    const allStock = await stockCollection.query().fetch();

    if (allStock.length > 0) {
      await database.write(async () => {
        const batchOps = allStock.map((stock: any) =>
          stock.prepareUpdate((record: any) => {
            record.householdId = supabaseHousehold.id;
            record.addedByUserId = user.id;
          })
        );
        await database.batch(batchOps);
      });
    }

    return localHousehold;
  },

  /**
   * Join an existing household via invite code
   * - Validates invite code and checks expiration
   * - Checks household capacity
   * - Adds member to Supabase
   * - Creates household and member records locally
   * - Syncs shared stock from Supabase to local DB
   */
  joinHousehold: async (inviteCode: string): Promise<void> => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Not authenticated");

    const inviteInfo = await householdApiFunctions.fetchInviteInfo(inviteCode);
    if (!inviteInfo) throw new Error("This invite code isn't valid.");

    const household = inviteInfo.household;

    if (new Date(household.invite_expires_at) < new Date()) {
      throw new Error("This invite has expired. Ask the household admin for a new link.");
    }

    if (inviteInfo.memberCount >= household.max_members) {
      throw new Error(
        `This household is full (${household.max_members}/${household.max_members} members). Upgrade to Cookkit Pro for up to 6 members.`
      );
    }

    const existingMembership = await householdApi.getMembershipForUser(user.id);
    if (existingMembership) {
      throw new Error("You're already in a household. Leave your current household first.");
    }

    await householdApi.addMember({
      householdId: household.id,
      userId: user.id,
    });

    const householdCollection = database.collections.get("household");
    const memberCollection = database.collections.get("household_member");

    await database.write(async () => {
      const hh = await (householdCollection as any).create((record: any) => {
        record.supabaseId = household.id;
        record.name = household.name;
        record.inviteCode = household.invite_code;
        record.inviteExpiresAt = new Date(household.invite_expires_at).getTime();
        record.maxMembers = household.max_members;
        record.createdByUserId = household.created_by;
      });

      await (memberCollection as any).create((record: any) => {
        record.supabaseId = household.id;
        record.householdId = hh.id;
        record.userId = user.id;
        record.joinedAt = Date.now();
      });
    });

    // Sync shared stock down to local DB
    await householdSyncService.syncHousehold(household.id);
  },

  /**
   * Leave current household
   * - Removes member from Supabase
   * - Removes shared stock items from local DB (they stay in Supabase for other members)
   * - Removes household member and household records from local DB
   */
  leaveHousehold: async (householdId: string): Promise<void> => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Not authenticated");

    await householdApi.removeMember(user.id);

    // Remove shared stock from local DB
    const stockCollection = database.collections.get("stock");
    const sharedStock = await stockCollection.query().fetch();
    const householdStock = sharedStock.filter((s: any) => s.householdId === householdId);

    await database.write(async () => {
      const batchOps: import("@nozbe/watermelondb").Model[] = [];

      // Remove household member record
      const memberCollection = database.collections.get("household_member");
      const myMembership = (await memberCollection.query().fetch()).find(
        (m: any) => m.userId === user.id
      );
      if (myMembership) {
        batchOps.push(myMembership.prepareDestroyPermanently());
      }

      // Remove shared stock items from local DB (they stay in Supabase for other members)
      const stockOps = householdStock.map((stock: any) => stock.prepareDestroyPermanently());
      batchOps.push(...stockOps);

      // Remove household record
      try {
        const household = await database.collections.get("household").find(householdId);
        batchOps.push(household.prepareDestroyPermanently());
      } catch {}

      if (batchOps.length > 0) {
        await database.batch(batchOps);
      }
    });
  },

  /**
   * Dissolve (delete) current household (admin only)
   * - Reassigns shared stock back to creator in Supabase
   * - Dissolves household in Supabase
   * - Clears household_id on all shared stock locally
   * - Removes all members and household records from local DB
   */
  dissolveHousehold: async (householdId: string, householdSupabaseId: string): Promise<void> => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Not authenticated");

    // Reassign shared stock back to creator (set household_id null)
    await householdApi.clearHouseholdOnStock(householdSupabaseId, user.id);

    await householdApi.dissolveHousehold(householdSupabaseId);

    // Clean up local DB
    const stockCollection = database.collections.get("stock");
    const memberCollection = database.collections.get("household_member");
    const householdCollection = database.collections.get("household");

    await database.write(async () => {
      const batchOps: import("@nozbe/watermelondb").Model[] = [];

      // Clear household_id on all shared stock
      const sharedStock = (await stockCollection.query().fetch()).filter(
        (s: any) => s.householdId === householdSupabaseId
      );
      for (const stock of sharedStock) {
        batchOps.push(
          stock.prepareUpdate((record: any) => {
            record.householdId = null;
          })
        );
      }

      // Remove all members
      const members = await memberCollection.query().fetch();
      for (const member of members) {
        batchOps.push(member.prepareDestroyPermanently());
      }

      // Remove household
      try {
        const hh = await householdCollection.find(householdId);
        batchOps.push(hh.prepareDestroyPermanently());
      } catch {}

      if (batchOps.length > 0) {
        await database.batch(batchOps);
      }
    });
  },

  /**
   * Regenerate invite code for household
   * - Generates new invite code
   * - Updates household in Supabase
   * - Updates local household record
   */
  regenerateInviteCode: async (
    householdId: string,
    householdSupabaseId: string
  ): Promise<string> => {
    const newCode = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await householdApi.regenerateInviteCode(householdSupabaseId, newCode, expiresAt);

    const householdCollection = database.collections.get("household");
    await database.write(async () => {
      const hh = await householdCollection.find(householdId);
      await hh.update((record: any) => {
        record.inviteCode = newCode;
        record.inviteExpiresAt = new Date(expiresAt).getTime();
      });
    });

    return newCode;
  },

  /**
   * Sync shared stock from Supabase to local DB
   */
  syncSharedStock: async (householdSupabaseId: string): Promise<void> => {
    await householdSyncService.syncHousehold(householdSupabaseId);
  },
};
