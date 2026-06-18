import { householdApi } from "~/data/supabase-api/HouseholdApi";
import { householdSyncService } from "~/data/services/HouseholdSyncService";
import { householdRealtimeService } from "~/data/services/HouseholdRealtimeService";
import { useAuthStore } from "~/auth/AuthStore";
import { generateInviteCode } from "~/utils/invite-code";
import { isValidSubscription } from "~/utils/subscription-utils";
import { database } from "~/data/db/database";
import { Q } from "@nozbe/watermelondb";
import type Household from "~/data/db/models/Household";
import type HouseholdMember from "~/data/db/models/HouseholdMember";
import type Stock from "~/data/db/models/Stock";
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
    const members = await memberCollection.query(Q.where("user_id", user.id)).fetch();
    const myMembership = members[0] as HouseholdMember | undefined;

    if (!myMembership) return null;

    const householdCollection = database.collections.get("household");
    try {
      const household = (await householdCollection.find(myMembership.householdId)) as Household;
      if (household.supabaseId) {
        householdRealtimeService.subscribe(household.supabaseId);
      }
      return household;
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
      const hh = await householdCollection.create((record) => {
        const hh = record as Household;
        hh.supabaseId = supabaseHousehold.id;
        hh.name = name;
        hh.inviteCode = inviteCode;
        hh.inviteExpiresAt = new Date(supabaseHousehold.invite_expires_at).getTime();
        hh.maxMembers = maxMembers;
        hh.createdByUserId = user.id;
      });

      await memberCollection.create((record) => {
        const member = record as HouseholdMember;
        member.supabaseId = supabaseHousehold.id;
        member.householdId = hh.id;
        member.userId = user.id;
        member.joinedAt = new Date();
      });

      return hh as Household;
    });

    // Seed household: assign all existing user stock items to this household
    const stockCollection = database.collections.get("stock");
    const allStock = await stockCollection.query().fetch();

    if (allStock.length > 0) {
      await database.write(async () => {
        const batchOps = allStock.map((stock) =>
          stock.prepareUpdate((record) => {
            const s = record as Stock;
            s.householdId = supabaseHousehold.id;
            s.addedByUserId = user.id;
          })
        );
        await database.batch(batchOps);
      });
    }

    // Sync to backfill supabaseId on seeded stock items
    await householdSyncService.syncHousehold(supabaseHousehold.id);
    householdRealtimeService.subscribe(supabaseHousehold.id);

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
      const hh = await householdCollection.create((record) => {
        const h = record as Household;
        h.supabaseId = household.id;
        h.name = household.name;
        h.inviteCode = household.invite_code;
        h.inviteExpiresAt = new Date(household.invite_expires_at).getTime();
        h.maxMembers = household.max_members;
        h.createdByUserId = household.created_by;
      });

      await memberCollection.create((record) => {
        const member = record as HouseholdMember;
        member.supabaseId = household.id;
        member.householdId = hh.id;
        member.userId = user.id;
        member.joinedAt = new Date();
      });
    });

    // Sync shared stock down to local DB
    await householdSyncService.syncHousehold(household.id);
    householdRealtimeService.subscribe(household.id);
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

    householdRealtimeService.unsubscribe();

    await householdApi.removeMember(user.id);

    // Remove shared stock from local DB
    const stockCollection = database.collections.get("stock");
    const householdStock = await stockCollection.query(Q.where("household_id", householdId)).fetch();

    await database.write(async () => {
      const batchOps: import("@nozbe/watermelondb").Model[] = [];

      // Remove household member record
      const memberCollection = database.collections.get("household_member");
      const memberships = await memberCollection.query(Q.where("user_id", user.id)).fetch();
      const myMembership = memberships[0];
      if (myMembership) {
        batchOps.push(myMembership.prepareDestroyPermanently());
      }

      // Remove shared stock items from local DB (they stay in Supabase for other members)
      const stockOps = householdStock.map((stock) => stock.prepareDestroyPermanently());
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

    householdRealtimeService.unsubscribe();

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
      const sharedStock = await stockCollection.query(Q.where("household_id", householdSupabaseId)).fetch();
      for (const stock of sharedStock) {
        batchOps.push(
          stock.prepareUpdate((record) => {
            (record as Stock).householdId = undefined;
          })
        );
      }

      // Remove all members for this household
      const members = await memberCollection.query(Q.where("household_id", householdId)).fetch();
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
      await hh.update((record) => {
        (record as Household).inviteCode = newCode;
        (record as Household).inviteExpiresAt = new Date(expiresAt).getTime();
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

  removeMember: async (memberUserId: string): Promise<void> => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Not authenticated");

    await householdApi.removeMember(memberUserId);

    // Remove local member record
    const memberCollection = database.collections.get("household_member");
    const members = await memberCollection.query(Q.where("user_id", memberUserId)).fetch();
    const targetMember = members[0];

    if (targetMember) {
      await database.write(async () => {
        await targetMember.destroyPermanently();
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
      await hh.update((record) => {
        (record as Household).name = newName;
      });
    });
  },
};
