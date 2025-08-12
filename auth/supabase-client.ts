import { createClient } from "@supabase/supabase-js";
// @ts-ignore: If type declarations are missing, ignore for now
import type { Database } from "./supabase-types";
import { createSupabaseStorageAdapter } from "./storage-integration";

// Supabase configuration
const SUPABASE_URL = "https://npeumniwtoipfvuqqqwl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZXVtbml3dG9pcGZ2dXFxcXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MTY0OTcsImV4cCI6MjA3MDM5MjQ5N30.vKM4XWPsHgXRxtfIG3g4UxO0gQagIAIoMAF8nkp5yis";

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
