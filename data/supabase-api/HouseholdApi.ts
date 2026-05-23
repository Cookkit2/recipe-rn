import { supabase } from "~/lib/supabase/supabase-client";
import type { Tables } from "~/lib/supabase/supabase-types";
import { log } from "~/utils/logger";

function guardSupabase() {
  return supabase !== null;
}

export const householdApi = {
  createHousehold: async (params: {
    name: string;
    inviteCode: string;
    inviteExpiresAt: string;
    maxMembers: number;
    createdBy: string;
  }): Promise<Tables<"households">> => {
    if (!guardSupabase()) throw new Error("Supabase not available");
    const { data, error } = await supabase!
      .from("households")
      .insert({
        name: params.name,
        invite_code: params.inviteCode,
        invite_expires_at: params.inviteExpiresAt,
        max_members: params.maxMembers,
        created_by: params.createdBy,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getHouseholdByInviteCode: async (code: string): Promise<Tables<"households"> | null> => {
    if (!guardSupabase()) return null;
    const { data, error } = await supabase!
      .from("households")
      .select("*")
      .eq("invite_code", code)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null; // not found
      throw error;
    }
    return data;
  },

  getHouseholdById: async (id: string): Promise<Tables<"households"> | null> => {
    if (!guardSupabase()) return null;
    const { data, error } = await supabase!.from("households").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },

  addMember: async (params: {
    householdId: string;
    userId: string;
    displayName?: string;
  }): Promise<Tables<"household_members">> => {
    if (!guardSupabase()) throw new Error("Supabase not available");
    const { data, error } = await supabase!
      .from("household_members")
      .insert({
        household_id: params.householdId,
        user_id: params.userId,
        display_name: params.displayName ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getMembers: async (householdId: string): Promise<Tables<"household_members">[]> => {
    if (!guardSupabase()) return [];
    const { data, error } = await supabase!
      .from("household_members")
      .select("*")
      .eq("household_id", householdId);
    if (error) throw error;
    return data;
  },

  getMemberCount: async (householdId: string): Promise<number> => {
    if (!guardSupabase()) return 0;
    const { count, error } = await supabase!
      .from("household_members")
      .select("*", { count: "exact", head: true })
      .eq("household_id", householdId);
    if (error) throw error;
    return count ?? 0;
  },

  removeMember: async (userId: string): Promise<void> => {
    if (!guardSupabase()) return;
    const { error } = await supabase!.from("household_members").delete().eq("user_id", userId);
    if (error) throw error;
  },

  dissolveHousehold: async (householdId: string): Promise<void> => {
    if (!guardSupabase()) return;
    const { error } = await supabase!.from("households").delete().eq("id", householdId);
    if (error) throw error;
  },

  regenerateInviteCode: async (
    householdId: string,
    code: string,
    expiresAt: string
  ): Promise<Tables<"households">> => {
    if (!guardSupabase()) throw new Error("Supabase not available");
    const { data, error } = await supabase!
      .from("households")
      .update({ invite_code: code, invite_expires_at: expiresAt })
      .eq("id", householdId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getMembershipForUser: async (userId: string): Promise<Tables<"household_members"> | null> => {
    if (!guardSupabase()) return null;
    const { data, error } = await supabase!
      .from("household_members")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },

  getSharedStock: async (householdId: string, since?: string): Promise<Tables<"stock">[]> => {
    if (!guardSupabase()) return [];
    let query = supabase!.from("stock").select("*").eq("household_id", householdId);
    if (since) {
      query = query.gt("updated_at", since);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  upsertSharedStock: async (items: Tables<"stock">[]): Promise<void> => {
    if (!guardSupabase() || items.length === 0) return;
    const { error } = await supabase!.from("stock").upsert(items);
    if (error) throw error;
  },

  clearHouseholdOnStock: async (householdId: string, userId: string): Promise<void> => {
    if (!guardSupabase()) return;
    const { error } = await supabase!
      .from("stock")
      .update({ household_id: null })
      .eq("household_id", householdId)
      .eq("added_by_user_id", userId);
    if (error) throw error;
  },
};
