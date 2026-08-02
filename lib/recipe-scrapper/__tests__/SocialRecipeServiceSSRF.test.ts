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
    generateContent: jest.fn().mockImplementation(async () =>
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

    it("blocks redirects to disallowed domains", async () => {
      // First request succeeds but returns a redirect
      fetchMock.mockReturnValueOnce(
        Promise.resolve(
          new Response(null, {
            status: 301,
            headers: { location: "http://localhost:8080/internal" },
          })
        )
      );

      const result = await service.analyzeForRecipe({
        platform: "tiktok",
        url: "https://www.tiktok.com/@user/video/123",
      });

      // Should fetch the first valid URL
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.isCookingVideo).toBe(false);
    });

    it("follows valid redirects", async () => {
      // First request returns a redirect
      fetchMock.mockReturnValueOnce(
        Promise.resolve(
          new Response(null, {
            status: 301,
            headers: { location: "https://www.instagram.com/p/123" },
          })
        )
      );
      // Second request returns valid content
      fetchMock.mockReturnValueOnce(
        Promise.resolve(new Response("<html></html>", { status: 200 }))
      );

      const result = await service.analyzeForRecipe({
        platform: "tiktok",
        url: "https://www.tiktok.com/@user/video/123",
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
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
