import { jest } from "@jest/globals";

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("~/utils/gemini-api", () => ({
  GeminiAPI: jest.fn().mockImplementation(() => ({
    generateContent: jest.fn().mockResolvedValue(
      JSON.stringify({
        isCookingVideo: false,
        confidence: 0.0,
        errorMessage: "Test",
      })
    ),
  })),
  DEFAULT_GEMINI_MODEL: "gemini-2.5-flash-lite",
}));

import { SocialRecipeService } from "../SocialRecipeService";

describe("SocialRecipeService SSRF protections", () => {
  let service: SocialRecipeService;
  const originalFetch = globalThis.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SocialRecipeService();
    fetchMock = jest.fn(async () => new Response("<html></html>", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("blocks requests to localhost", async () => {
    const result = await service.analyzeForRecipe({
      platform: "tiktok",
      url: "http://localhost:8080/fake-tiktok",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.errorMessage).toMatch(/invalid or restricted/i);
  });

  it("blocks non http/https protocols", async () => {
    const result = await service.analyzeForRecipe({
      platform: "tiktok",
      url: "file:///etc/passwd",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.errorMessage).toMatch(/invalid or restricted/i);
  });

  it("allows valid domains", async () => {
    const result = await service.analyzeForRecipe({
      platform: "tiktok",
      url: "https://www.tiktok.com/@user/video/123",
    });

    expect(fetchMock).toHaveBeenCalled();
  });
});
