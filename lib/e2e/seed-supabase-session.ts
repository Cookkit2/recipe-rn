/**
 * Writes a supabase-js session for the fixed Detox user.
 *
 * Tools call `auth.getSession()`, which reads this storage adapter and does
 * not use MockAuthStrategy. The host PostgREST fixture expects `E2E_USER_ID`.
 * Nothing is written unless `EXPO_PUBLIC_E2E` is exactly enabled.
 */
import {
  E2E_ACCESS_TOKEN,
  E2E_USER_ID,
  e2eSupabaseStorageKey,
} from "~/lib/agent/testing/e2e-contract";
import { IS_E2E } from "~/utils/e2e-flags";

export function buildE2ESupabaseSession(nowMs = Date.now()): string {
  const expiresAt = Math.floor(nowMs / 1000) + 60 * 60;
  return JSON.stringify({
    access_token: E2E_ACCESS_TOKEN,
    refresh_token: "test-refresh-token",
    expires_at: expiresAt,
    expires_in: 60 * 60,
    token_type: "bearer",
    user: {
      id: E2E_USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "agent-e2e@example.com",
      app_metadata: {},
      user_metadata: {},
      created_at: "2026-01-01T00:00:00.000Z",
    },
  });
}

export async function seedE2ESupabaseSession(): Promise<void> {
  if (!IS_E2E) return;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return;
  const { createSupabaseStorageAdapter } = await import("~/auth/StorageIntegration");
  const storage = createSupabaseStorageAdapter();
  await storage.setItem(e2eSupabaseStorageKey(url), buildE2ESupabaseSession());
}
