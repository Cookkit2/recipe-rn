import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";
import { createSupabaseStorageAdapter } from "./storage-integration";
import Constants from "expo-constants";

// Supabase configuration from environment variables
// Try multiple sources: process.env, Constants.expoConfig.extra
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

// Create Supabase client with proper configuration for React Native
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      // Disable automatic token refresh in the background
      // We'll handle this manually in our auth strategy
      autoRefreshToken: true,
      // Persist auth session in storage
      persistSession: true,
      // Detect session from URL (for OAuth flows)
      detectSessionInUrl: true,
      // Custom encrypted storage for React Native
      storage: createSupabaseStorageAdapter(),
    },
    // Configure for React Native environment
    global: {
      headers: {
        "X-Client-Info": "recipe-app-react-native",
      },
    },
  }
);

// Export client configuration for testing
export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};
