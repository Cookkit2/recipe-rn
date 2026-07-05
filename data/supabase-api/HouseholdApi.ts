import { supabase } from "~/lib/supabase/supabase-client";
import type { Tables } from "~/lib/supabase/supabase-types";
import { log } from "~/utils/logger";

function guardSupabase() {
  return supabase !== null;
}

function handleError(error: any) {
  if (error) throw error;
}

function handleNullableError(error: any) {
  if (error) {
    if (error.code === "PGRST116") return true; // not found
    throw error;
  }
  return false;
}

async function createHousehold(params: {
  name: string;
  inviteCode: string;
  inviteExpiresAt: string;
  maxMembers: number;
  createdBy: string;
}): Promise<Tables<"households">> {
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
  handleError(error);
  if (!data) throw new Error("No data returned");
  return data;
}

async function getHouseholdByInviteCode(code: string): Promise<Tables<"households"> | null> {
  if (!guardSupabase()) return null;
  const { data, error } = await supabase!
    .from("households")
    .select("*")
    .eq("invite_code", code)
    .single();
  if (handleNullableError(error)) return null;
  return data;
}

async function getHouseholdById(id: string): Promise<Tables<"households"> | null> {
  if (!guardSupabase()) return null;
  const { data, error } = await supabase!.from("households").select("*").eq("id", id).single();
  if (handleNullableError(error)) return null;
  return data;
}

async function addMember(params: {
  householdId: string;
  userId: string;
  displayName?: string;
}): Promise<Tables<"household_members">> {
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
  handleError(error);
  if (!data) throw new Error("No data returned");
  return data;
}

async function getMembers(householdId: string): Promise<Tables<"household_members">[]> {
  if (!guardSupabase()) return [];
  const { data, error } = await supabase!
    .from("household_members")
    .select("*")
    .eq("household_id", householdId);
  handleError(error);
  return data || [];
}

async function getMemberCount(householdId: string): Promise<number> {
  if (!guardSupabase()) return 0;
  const { count, error } = await supabase!
    .from("household_members")
    .select("*", { count: "exact", head: true })
    .eq("household_id", householdId);
  handleError(error);
  return count ?? 0;
}

async function removeMember(userId: string): Promise<void> {
  if (!guardSupabase()) return;
  const { error } = await supabase!.from("household_members").delete().eq("user_id", userId);
  handleError(error);
}

async function updateHousehold(
  householdId: string,
  updates: { name?: string }
): Promise<Tables<"households">> {
  if (!guardSupabase()) throw new Error("Supabase not available");
  const { data, error } = await supabase!
    .from("households")
    .update(updates)
    .eq("id", householdId)
    .select()
    .single();
  handleError(error);
  if (!data) throw new Error("No data returned");
  return data;
}

async function dissolveHousehold(householdId: string): Promise<void> {
  if (!guardSupabase()) return;
  const { error } = await supabase!.from("households").delete().eq("id", householdId);
  handleError(error);
}

async function regenerateInviteCode(
  householdId: string,
  code: string,
  expiresAt: string
): Promise<Tables<"households">> {
  if (!guardSupabase()) throw new Error("Supabase not available");
  const { data, error } = await supabase!
    .from("households")
    .update({ invite_code: code, invite_expires_at: expiresAt })
    .eq("id", householdId)
    .select()
    .single();
  handleError(error);
  if (!data) throw new Error("No data returned");
  return data;
}

async function getMembershipForUser(userId: string): Promise<Tables<"household_members"> | null> {
  if (!guardSupabase()) return null;
  const { data, error } = await supabase!
    .from("household_members")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (handleNullableError(error)) return null;
  return data;
}

async function getSharedStock(householdId: string, since?: string): Promise<Tables<"stock">[]> {
  if (!guardSupabase()) return [];
  let query = supabase!.from("stock").select("*").eq("household_id", householdId);
  if (since) {
    query = query.gt("updated_at", since);
  }
  const { data, error } = await query;
  handleError(error);
  return data || [];
}

async function upsertSharedStock(items: Tables<"stock">[]): Promise<void> {
  if (!guardSupabase() || items.length === 0) return;
  const { error } = await supabase!.from("stock").upsert(items);
  handleError(error);
}

async function clearHouseholdOnStock(householdId: string, userId: string): Promise<void> {
  if (!guardSupabase()) return;
  const { error } = await supabase!
    .from("stock")
    .update({ household_id: null })
    .eq("household_id", householdId)
    .eq("added_by_user_id", userId);
  handleError(error);
}

export const householdApi = {
  createHousehold,
  getHouseholdByInviteCode,
  getHouseholdById,
  addMember,
  getMembers,
  getMemberCount,
  removeMember,
  updateHousehold,
  dissolveHousehold,
  regenerateInviteCode,
  getMembershipForUser,
  getSharedStock,
  upsertSharedStock,
  clearHouseholdOnStock,
};
