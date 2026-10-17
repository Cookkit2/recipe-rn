import { createAIHandler } from "../ai-handler";

describe("authenticated AI proxy", () => {
  const authenticate = jest.fn<Promise<string | null>, [string, AbortSignal]>();
  const consumeQuota = jest.fn<Promise<boolean>, [string, AbortSignal]>();
  const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const handler = createAIHandler({
    apiKey: "provider-secret",
    authenticate,
    consumeQuota,
    fetcher,
  });
  const request = (body: unknown = { prompt: "Extract recipe" }, token = "valid-session") =>
    new Request("https://example.com/ai", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(body),
    });
  beforeEach(() => {
    authenticate.mockReset().mockResolvedValue("user-1");
    consumeQuota.mockReset().mockResolvedValue(true);
    fetcher.mockReset().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"title":"Soup"}' }, finish_reason: "stop" }],
        })
      )
    );
  });

  it("requires a verified user JWT, not just the public project key", async () => {
    expect((await handler(request({}, ""))).status).toBe(401);
    authenticate.mockResolvedValue(null);
    expect((await handler(request({}, "public-anon-key"))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    expect(consumeQuota).not.toHaveBeenCalled();
  });
  it("checks quota before spending provider tokens", async () => {
    consumeQuota.mockResolvedValue(false);
    expect((await handler(request())).status).toBe(429);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("fails closed if the quota service is unavailable", async () => {
    consumeQuota.mockRejectedValue(new Error("private database details"));
    const response = await handler(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private database");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("ignores caller model/endpoint overrides and returns no provider credential", async () => {
    const response = await handler(
      request({
        prompt: "Extract recipe",
        model: "other-provider",
        endpoint: "https://attacker.example",
      })
    );
    expect(response.status).toBe(200);
    const result = await response.text();
    expect(result).not.toContain("provider-secret");
    expect(result).toContain("NVIDIA-Nemotron-3-Nano");
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://api.tokenfactory.nebius.com/v1/chat/completions"
    );
  });
  it.each([{ prompt: "" }, { prompt: "x", image: { mimeType: "text/plain", data: "secret" } }])(
    "rejects invalid input without spending tokens",
    async (body) => {
      expect((await handler(request(body))).status).toBe(400);
      expect(fetcher).not.toHaveBeenCalled();
    }
  );
  it("bounds streamed request bodies even without Content-Length", async () => {
    const response = await handler(request({ prompt: "x".repeat(2_000_001) }));
    expect(response.status).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied regex schemas before any provider call", async () => {
    const response = await handler(
      request({ prompt: "Extract", responseSchema: { type: "string", pattern: "(a+)+$" } })
    );
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
