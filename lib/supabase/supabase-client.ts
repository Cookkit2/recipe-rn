import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";
import Constants from "expo-constants";
import { createSupabaseStorageAdapter } from "~/auth/StorageIntegration";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function createSupabaseClient(): SupabaseClient<Database> | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Supabase features (auth, recipe sync) will be unavailable. Set in .env or app.json extra for cloud features."
      );
    }
    return null;
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: createSupabaseStorageAdapter(),
    },
    global: {
      headers: {
        "X-Client-Info": "recipe-app-react-native",
      },
    },
  });
}

export const supabase: SupabaseClient<Database> | null = createSupabaseClient();
export const supabaseAvailable = supabase !== null;

export const supabaseConfig =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }
    : { url: undefined, anonKey: undefined };
