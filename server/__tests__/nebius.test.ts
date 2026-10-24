import { generateNebiusContent, TEXT_MODEL, VISION_MODEL } from "../nebius";
import type { AIRequest } from "../../lib/ai/types";
import { buildTextRecipeRequest } from "../../lib/recipe-scrapper/shared/recipe-ai-utils";

const request: AIRequest = {
  prompt: "Identify this food.",
  responseSchema: {
    type: "object",
    properties: { name: { type: "string" }, quantity: { type: "number", minimum: 0 } },
    required: ["name", "quantity"],
  },
};

function completion(content: string, finishReason = "stop") {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content }, finish_reason: finishReason }],
      usage: { prompt_tokens: 2000, completion_tokens: 500 },
    }),
    { status: 200 }
  );
}

describe("Nebius provider boundary", () => {
  const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  beforeEach(() => fetcher.mockReset());
  const run = (input: AIRequest = request, signal?: AbortSignal) =>
    generateNebiusContent(input, { apiKey: "server-secret", fetcher, signal, retryDelayMs: 0 });

  it("uses Nano and OpenAI chat messages for every text task", async () => {
    fetcher.mockResolvedValue(completion('{"name":"rice","quantity":1}'));
    const result = await run({ ...request, systemPrompt: "Use pantry ingredients only." });
    expect(TEXT_MODEL).toBe("nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B");
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.tokenfactory.nebius.com/v1/chat/completions");
    expect(options?.headers).toEqual({
      Authorization: "Bearer server-secret",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(options!.body as string);
    expect(body.model).toBe(TEXT_MODEL);
    expect(body.messages[0].content).toContain("Use pantry ingredients only.");
    expect(body.messages[0].content).toContain('"quantity"');
    expect(body.messages[1].content).toBe(request.prompt);
    expect(body.contents).toBeUndefined();
    expect(result.content).toBe('{"name":"rice","quantity":1}');
    expect(result.usage?.estimatedCost).toBeCloseTo(0.00024);
  });

  it("routes photos to Super VL with a base64 image_url", async () => {
    fetcher.mockResolvedValue(completion('{"name":"rice","quantity":1}'));
    const result = await run({ ...request, image: { mimeType: "image/jpeg", data: "YWJj" } });
    expect(VISION_MODEL).toBe("nvidia/Nemotron-3.5-Super-VL");
    const body = JSON.parse(fetcher.mock.calls[0]![1]!.body as string);
    expect(body.model).toBe(VISION_MODEL);
    expect(body.messages[1].content).toEqual([
      { type: "text", text: request.prompt },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,YWJj" } },
    ]);
    expect(result.usage?.estimatedCost).toBeCloseTo(0.00105);
  });

  it("sends chronological video frames in a single vision request", async () => {
    fetcher.mockResolvedValue(completion('{"name":"rice","quantity":1}'));
    await run({
      ...request,
      images: [
        { mimeType: "image/jpeg", data: "YWJj" },
        { mimeType: "image/png", data: "ZGVm" },
      ],
    });
    const body = JSON.parse(fetcher.mock.calls[0]![1]!.body as string);
    expect(body.model).toBe(VISION_MODEL);
    expect(
      body.messages[1].content.map((part: any) => part.image_url?.url).filter(Boolean)
    ).toEqual(["data:image/jpeg;base64,YWJj", "data:image/png;base64,ZGVm"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects excessive or ambiguous frames before calling the provider", async () => {
    const frame = { mimeType: "image/jpeg" as const, data: "YWJj" };
    for (const input of [
      { images: Array(9).fill(frame) },
      { image: frame, images: [frame] },
      { images: [{ ...frame, data: "a".repeat(1_500_001) }] },
    ])
      await expect(run({ ...request, ...input })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts fenced JSON but never returns reasoning as the answer", async () => {
    fetcher.mockResolvedValue(completion('```json\n{"name":"rice","quantity":1}\n```'));
    expect((await run()).content).toBe('{"name":"rice","quantity":1}');
  });

  it("accepts unknown calories in an otherwise complete extracted recipe", async () => {
    fetcher.mockResolvedValue(
      completion(
        JSON.stringify({
          isCookingVideo: true,
          confidence: 0.95,
          recipe: {
            title: "Garlic rice",
            description: "Simple rice",
            prepMinutes: 5,
            cookMinutes: 15,
            servings: 2,
            difficultyStars: 1,
            calories: null,
            ingredients: [{ name: "rice", quantity: 1, unit: "cup" }],
            steps: [{ step: 1, title: "Cook", description: "Simmer the rice." }],
          },
        })
      )
    );
    expect((await run(buildTextRecipeRequest("Cook rice."))).content).toContain('"calories":null');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(['{"name":"rice"}', '{"name":"rice","quantity":-1}', "not JSON"])(
    "repairs invalid JSON or schema output once: %s",
    async (invalid) => {
      fetcher
        .mockResolvedValueOnce(completion(invalid))
        .mockResolvedValueOnce(completion('{"name":"rice","quantity":1}'));
      expect((await run()).content).toContain('"quantity":1');
      expect(fetcher).toHaveBeenCalledTimes(2);
    }
  );

  it("fails after one repair rather than accepting malformed model output", async () => {
    fetcher.mockImplementation(async () => completion('{"name":"rice"}'));
    await expect(run()).rejects.toThrow("valid recipe data");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects truncated output even when its JSON happens to parse", async () => {
    fetcher.mockImplementation(async () => completion('{"name":"rice","quantity":1}', "length"));
    await expect(run()).rejects.toThrow("valid recipe data");
  });

  it("retries a transient HTTP failure, but never an authentication failure", async () => {
    fetcher
      .mockResolvedValueOnce(new Response("provider details", { status: 503 }))
      .mockResolvedValueOnce(completion('{"name":"rice","quantity":1}'));
    await run();
    expect(fetcher).toHaveBeenCalledTimes(2);
    fetcher.mockReset().mockResolvedValue(new Response("server-secret", { status: 401 }));
    await expect(run()).rejects.toThrow("Nebius request failed (401)");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not retry caller cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(run(request, controller.signal)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not make a provider call without a server key", async () => {
    await expect(generateNebiusContent(request, { apiKey: "", fetcher })).rejects.toThrow(
      "NEBIUS_API_KEY"
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
