import { E2E_USER_ID, e2eSupabaseStorageKey } from "~/lib/agent/testing/e2e-contract";
import { buildE2ESupabaseSession, seedE2ESupabaseSession } from "../seed-supabase-session";

it("derives the supabase-js storage key from the fixture host", () => {
  expect(e2eSupabaseStorageKey("http://127.0.0.1:54321")).toBe("sb-127-auth-token");
});

it("builds a session for the fixed Detox user", () => {
  const session = JSON.parse(buildE2ESupabaseSession(1_700_000_000_000)) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: { id: string };
  };
  expect(session.user.id).toBe(E2E_USER_ID);
  expect(session.access_token).toBe("test-access-token");
  expect(session.refresh_token).toBe("test-refresh-token");
  expect(session.expires_at).toBeGreaterThan(1_700_000_000);
});

it("does not touch storage when the E2E flag is off", async () => {
  await expect(seedE2ESupabaseSession()).resolves.toBeUndefined();
});
