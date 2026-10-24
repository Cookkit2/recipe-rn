/**
 * Shared dummy values for the Detox assistant scenario and the host fixtures.
 * These are not credentials. The Jest tier uses ephemeral ports instead.
 */
export const E2E_USER_ID = "11111111-1111-4111-8111-111111111111";
export const E2E_HOUSEHOLD_ID = "22222222-2222-4222-8222-222222222222";
export const E2E_ANON_KEY = "test-anon-key";
export const E2E_ACCESS_TOKEN = "test-access-token";
export const E2E_NEBIUS_API_KEY = "test-nebius-key";
export const E2E_NEBIUS_MODEL = "mock-tool-model";
export const E2E_NEBIUS_PORT = 8787;
export const E2E_SUPABASE_PORT = 54321;

export function e2eNebiusBaseURL(port = E2E_NEBIUS_PORT): string {
  return `http://127.0.0.1:${port}/v1`;
}

export function e2eSupabaseURL(port = E2E_SUPABASE_PORT): string {
  return `http://127.0.0.1:${port}`;
}

/** Storage key supabase-js derives from the URL hostname (`sb-<first-label>-auth-token`). */
export function e2eSupabaseStorageKey(supabaseUrl: string): string {
  const host = new URL(supabaseUrl).hostname.split(".")[0] || "127";
  return `sb-${host}-auth-token`;
}
