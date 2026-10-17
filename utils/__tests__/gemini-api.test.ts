import {
  GeminiAPI,
  GEMINI_ENABLED,
  calculateTokenCost,
  generateGeminiContent,
} from "../gemini-api";

describe("retained Gemini adapter", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    // Even an old configured key must not reactivate the adapter.
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = "unused-test-key";
    jest.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    else process.env.EXPO_PUBLIC_GEMINI_API_KEY = originalKey;
    jest.useRealTimers();
  });

  it("keeps Gemini disabled while Nemotron is active", () => {
    expect(GEMINI_ENABLED).toBe(false);
  });

  it.each([
    ["class generation", () => new GeminiAPI().generateContent(undefined, "{}")],
    ["generation helper", () => generateGeminiContent("{}")],
    ["model listing", () => new GeminiAPI().listModels()],
  ] as const)("blocks %s before network calls or retry timers", async (_name, call) => {
    await expect(call()).rejects.toThrow("Gemini is disabled while Cookkit uses Nemotron");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("returns the disabled error even when no Gemini key is configured", async () => {
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    await expect(generateGeminiContent("{}")).rejects.toThrow("Gemini is disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves the historical token-cost helper for reference", () => {
    const usage = calculateTokenCost({
      promptTokenCount: 2_000_000,
      candidatesTokenCount: 1_000_000,
    });
    expect(usage.totalTokenCount).toBe(3_000_000);
    expect(usage.estimatedCost).toBeCloseTo(0.6);
  });
});
