import { readNebiusAgentConfig } from "../nebius-config";
import { getAIProxyConnection } from "~/lib/ai/proxy-connection";

jest.mock("~/lib/ai/proxy-connection", () => ({ getAIProxyConnection: jest.fn() }));
const env = { EXPO_PUBLIC_SUPABASE_URL: "https://cookkit-test.supabase.co" };

beforeEach(() => {
  jest.mocked(getAIProxyConnection).mockResolvedValue({
    url: `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/nebius-ai`,
    headers: { Authorization: "Bearer guest-session", apikey: "public-project-key" },
  });
});

it("connects a release without any public Nebius key or model to the authenticated chat proxy", async () => {
  expect(await readNebiusAgentConfig(env)).toEqual({
    baseURL: `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/nebius-chat/v1`,
    apiKey: "guest-session",
    model: "cookkit-assistant",
    headers: { apikey: "public-project-key" },
  });
});

it("reads the current guest session for each new conversation turn", async () => {
  await readNebiusAgentConfig(env);
  jest.mocked(getAIProxyConnection).mockResolvedValueOnce({
    url: `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/nebius-ai`,
    headers: { Authorization: "Bearer refreshed-session", apikey: "public-project-key" },
  });
  expect((await readNebiusAgentConfig(env)).apiKey).toBe("refreshed-session");
});

it("fails closed when a user session or trusted project URL is unavailable", async () => {
  jest
    .mocked(getAIProxyConnection)
    .mockResolvedValueOnce({ url: "http://localhost:8787/ai", headers: {} });
  await expect(readNebiusAgentConfig(env)).rejects.toThrow();
  await expect(
    readNebiusAgentConfig({ EXPO_PUBLIC_SUPABASE_URL: "http://example.test" })
  ).rejects.toThrow();
});

it("keeps the native E2E build on its dummy loopback fixture without guest authentication", async () => {
  jest.mocked(getAIProxyConnection).mockClear();
  expect(await readNebiusAgentConfig({ EXPO_PUBLIC_E2E: "true" })).toEqual({
    apiKey: "test-nebius-key",
    model: "mock-tool-model",
    baseURL: "http://127.0.0.1:8787/v1",
  });
  expect(getAIProxyConnection).not.toHaveBeenCalled();
});
