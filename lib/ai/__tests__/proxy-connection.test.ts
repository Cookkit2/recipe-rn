import { getAIProxyConnection } from "../proxy-connection";

const getSession = jest.fn();
const signInAnonymously = jest.fn();
jest.mock("~/lib/supabase/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      signInAnonymously: (...args: unknown[]) => signInAnonymously(...args),
    },
  },
}));

describe("AI proxy session", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "public-project-key";
    delete process.env.EXPO_PUBLIC_AI_PROXY_URL;
    getSession.mockReset();
    signInAnonymously.mockReset();
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  it("reuses an existing user session", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "signed-in-session" } } });
    const connection = await getAIProxyConnection();
    expect(connection.url).toBe("https://project.supabase.co/functions/v1/nebius-ai");
    expect(connection.headers.Authorization).toBe("Bearer signed-in-session");
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
  it("creates one guest session for concurrent first AI requests", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    signInAnonymously.mockResolvedValue({ data: { session: { access_token: "guest-session" } } });
    const connections = await Promise.all([getAIProxyConnection(), getAIProxyConnection()]);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(connections.map((value) => value.headers.Authorization)).toEqual([
      "Bearer guest-session",
      "Bearer guest-session",
    ]);
  });
  it("fails safely when guest access is not enabled, then allows a later retry", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    signInAnonymously.mockResolvedValueOnce({
      data: {},
      error: { message: "private backend details" },
    });
    await expect(getAIProxyConnection()).rejects.toThrow("Guest AI access isn't available");
    signInAnonymously.mockResolvedValueOnce({
      data: { session: { access_token: "guest-session" } },
    });
    expect((await getAIProxyConnection()).headers.Authorization).toBe("Bearer guest-session");
  });
  it("permits the loopback development proxy without creating an account", async () => {
    process.env.EXPO_PUBLIC_AI_PROXY_URL = "http://127.0.0.1:8787/ai";
    expect(await getAIProxyConnection()).toEqual({ url: "http://127.0.0.1:8787/ai", headers: {} });
    expect(getSession).not.toHaveBeenCalled();
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
  it("never sends session tokens to an insecure remote override", async () => {
    process.env.EXPO_PUBLIC_AI_PROXY_URL = "http://external.example/ai";
    await expect(getAIProxyConnection()).rejects.toThrow("isn't configured");
    expect(getSession).not.toHaveBeenCalled();
  });
});
