import { generateAIContent } from "../client";
import { getAIProxyConnection } from "../proxy-connection";

jest.mock("../proxy-connection", () => ({ getAIProxyConnection: jest.fn() }));
jest.mock("~/utils/logger", () => ({ log: { warn: jest.fn(), debug: jest.fn() } }));

describe("AI app client", () => {
  const originalFetch = globalThis.fetch;
  const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  beforeEach(() => {
    fetcher.mockReset();
    globalThis.fetch = fetcher;
    jest.mocked(getAIProxyConnection).mockResolvedValue({
      url: "https://project.supabase.co/functions/v1/nebius-ai",
      headers: { Authorization: "Bearer user-session", apikey: "public-project-key" },
    });
  });
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends the request to our proxy with a user session, never a Nebius key", async () => {
    fetcher.mockResolvedValue(new Response(JSON.stringify({ content: '{"title":"Soup"}' })));
    const result = await generateAIContent({
      prompt: "Extract a recipe",
      responseSchema: { type: "object" },
    });
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toContain("/functions/v1/nebius-ai");
    expect(options?.headers).toEqual({
      Authorization: "Bearer user-session",
      apikey: "public-project-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(options!.body as string)).toEqual({
      prompt: "Extract a recipe",
      responseSchema: { type: "object" },
    });
    expect(result).toBe('{"title":"Soup"}');
  });

  it.each([401, 429, 500])("surfaces a safe error for HTTP %i", async (status) => {
    fetcher.mockResolvedValue(new Response("provider secret or recipe text", { status }));
    await expect(generateAIContent({ prompt: "Extract" })).rejects.not.toThrow("provider secret");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refuses a video answer from an older proxy that ignored its frames", async () => {
    fetcher.mockResolvedValue(
      new Response(JSON.stringify({ content: '{"text":"a guess"}', model: "text-model" }))
    );
    await expect(
      generateAIContent({
        prompt: "Read these frames",
        images: [{ mimeType: "image/jpeg", data: "YWJj" }],
      })
    ).rejects.toThrow("Video analysis isn't available yet");
  });

  it("accepts frame observations when the proxy confirms the image count", async () => {
    fetcher.mockResolvedValue(
      new Response(JSON.stringify({ content: '{"text":"Steam 15 mins"}', inputImageCount: 1 }))
    );
    await expect(
      generateAIContent({
        prompt: "Read these frames",
        images: [{ mimeType: "image/jpeg", data: "YWJj" }],
      })
    ).resolves.toContain("Steam 15 mins");
  });

  it("aborts an in-flight request when the caller cancels", async () => {
    fetcher.mockImplementation(
      async (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new Error("cancelled")));
        })
    );
    const controller = new AbortController();
    const pending = generateAIContent({ prompt: "Extract" }, controller.signal);
    await Promise.resolve();
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toThrow();
  });
  it("rejects video answers from an older proxy that ignored the video URL", async () => {
    fetcher.mockResolvedValue(new Response(JSON.stringify({ content: '{"title":"Guess"}' })));
    await expect(
      generateAIContent({
        prompt: "Extract",
        youtubeVideoUrl: "https://www.youtube.com/watch?v=abcdefghijk",
      })
    ).rejects.toThrow("YouTube video analysis isn't available");
  });
  it("accepts video answers when the proxy acknowledges the same URL", async () => {
    const youtubeVideoUrl = "https://www.youtube.com/watch?v=abcdefghijk";
    fetcher.mockResolvedValue(
      new Response(JSON.stringify({ content: '{"title":"Rice"}', inputVideoUrl: youtubeVideoUrl }))
    );
    await expect(generateAIContent({ prompt: "Extract", youtubeVideoUrl })).resolves.toContain(
      "Rice"
    );
  });
});
