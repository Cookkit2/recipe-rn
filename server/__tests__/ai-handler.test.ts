import { getAnalysisResponseSchema } from "~/lib/recipe-scrapper/shared/recipe-ai-utils";
import { createAIHandler } from "../ai-handler";

describe("authenticated AI proxy", () => {
  const authenticate = jest.fn<Promise<string | null>, [string, AbortSignal]>();
  const consumeQuota = jest.fn<Promise<boolean>, [string, AbortSignal]>();
  const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const handler = createAIHandler({
    apiKey: "provider-secret",
    geminiApiKey: "gemini-secret",
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
  const videoUrl = "https://www.youtube.com/watch?v=abcdefghijk";
  const videoRequest = () => request({ prompt: "Extract the recipe", youtubeVideoUrl: videoUrl });
  const geminiAnswer = (content = '{"isCookingVideo":false,"confidence":0}') =>
    new Response(
      JSON.stringify({
        candidates: [{ finishReason: "STOP", content: { parts: [{ text: content }] } }],
      })
    );
  it("routes video input to Gemini and acknowledges the video actually processed", async () => {
    fetcher.mockResolvedValue(geminiAnswer());
    const response = await handler(videoRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ inputVideoUrl: videoUrl });
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toContain("generativelanguage.googleapis.com/v1beta/models/");
    expect(options?.headers).toMatchObject({ "x-goog-api-key": "gemini-secret" });
    expect(JSON.parse(options!.body as string).contents[0].parts[0]).toEqual({
      fileData: { mimeType: "video/mp4", fileUri: videoUrl },
    });
  });
  it.each([
    "https://attacker.example/watch?v=abcdefghijk",
    "https://www.youtube.com.attacker.test/watch?v=abcdefghijk",
    "https://www.youtube.com@attacker.test/watch?v=abcdefghijk",
    "http://www.youtube.com/watch?v=abcdefghijk",
    "https://www.youtube.com/watch?v=abcdefghijk&list=123",
  ])("rejects noncanonical video URL %s before quota/provider calls", async (youtubeVideoUrl) => {
    expect((await handler(request({ prompt: "Extract", youtubeVideoUrl }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    expect(consumeQuota).not.toHaveBeenCalled();
  });
  it("enforces authentication and quota for video requests", async () => {
    authenticate.mockResolvedValueOnce(null);
    expect((await handler(videoRequest())).status).toBe(401);
    consumeQuota.mockResolvedValueOnce(false);
    expect((await handler(videoRequest())).status).toBe(429);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps text requests working when Gemini is not configured", async () => {
    const withoutGemini = createAIHandler({
      apiKey: "nebius",
      authenticate,
      consumeQuota,
      fetcher,
    });
    expect((await withoutGemini(request())).status).toBe(200);
    fetcher.mockClear();
    expect((await withoutGemini(videoRequest())).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not echo Gemini provider errors or credentials", async () => {
    fetcher.mockResolvedValue(new Response("gemini-secret private provider body", { status: 400 }));
    const response = await handler(videoRequest());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("gemini-secret");
  });
  it.each(["not JSON", '{"wrong":"schema"}'])(
    "rejects invalid Gemini output %s",
    async (content) => {
      fetcher.mockResolvedValue(geminiAnswer(content));
      const response = await handler(
        request({
          prompt: "Extract",
          youtubeVideoUrl: videoUrl,
          responseSchema: {
            type: "object",
            properties: { confidence: { type: "number" } },
            required: ["confidence"],
          },
        })
      );
      expect(response.status).toBe(502);
    }
  );
  it("rejects mixed video/image requests", async () => {
    expect(
      (
        await handler(
          request({
            prompt: "Extract",
            youtubeVideoUrl: videoUrl,
            image: { mimeType: "image/jpeg", data: "YWJj" },
          })
        )
      ).status
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("strips unsupported schema conditionals for Gemini but enforces them locally", async () => {
    fetcher.mockResolvedValue(geminiAnswer('{"isCookingVideo":true,"confidence":0.9}'));
    const response = await handler(
      request({
        prompt: "Extract",
        youtubeVideoUrl: videoUrl,
        responseSchema: getAnalysisResponseSchema(),
      })
    );
    expect(response.status).toBe(502);
    const body = JSON.parse(fetcher.mock.calls[0]![1]!.body as string);
    expect(body.generationConfig.responseJsonSchema).not.toHaveProperty("if");
    expect(body.generationConfig.responseJsonSchema).not.toHaveProperty("then");
    expect(body.generationConfig.responseJsonSchema.properties).toHaveProperty("recipe");
  });
  it("rejects truncated Gemini responses even if partial content is valid JSON", async () => {
    fetcher.mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "MAX_TOKENS",
              content: { parts: [{ text: '{"isCookingVideo":false,"confidence":0}' }] },
            },
          ],
        })
      )
    );
    expect((await handler(videoRequest())).status).toBe(502);
  });
  it("passes a bounded abort signal to Gemini and reports provider timeouts safely", async () => {
    const controller = new AbortController();
    fetcher.mockImplementation(async (_url, options) => {
      expect(options?.signal).toBeDefined();
      controller.abort();
      throw new Error("private provider detail");
    });
    const response = await handler(
      new Request("https://example.com/ai", {
        method: "POST",
        headers: { Authorization: "Bearer session" },
        signal: controller.signal,
        body: JSON.stringify({ prompt: "Extract", youtubeVideoUrl: videoUrl }),
      })
    );
    expect(response.status).toBe(504);
    expect(await response.text()).not.toContain("private provider detail");
  });
});
