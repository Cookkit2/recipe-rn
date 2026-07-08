import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/supabase/supabase-types";

export interface AdminClientConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

/** Build a service-role Supabase client that bypasses RLS. For local admin scripts only. */
export function createAdminClient(config: AdminClientConfig): SupabaseClient<Database> {
  if (!config.supabaseUrl) throw new Error("Missing SUPABASE_URL");
  if (!config.serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Read `EXPO_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment. */
export function loadAdminClientFromEnv(): SupabaseClient<Database> {
  return createAdminClient({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  });
}
