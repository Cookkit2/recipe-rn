/**
 * SocialRecipeService — Nebius extraction mapping for TikTok/Instagram.
 *
 * Per issue #747: social-video import reuses the existing Nebius extraction
 * pipeline. These tests mock globalThis.fetch (so we never hit real TikTok/IG)
 * and the NebiusAPI, then assert that:
 *   - a confident Nebius response is mapped into a GeneratedRecipe with the
 *     correct platform tags, and
 *   - when the platform blocks the scrape OR the LLM returns low confidence,
 *     the service surfaces a graceful fallback (no fabricated recipe).
 */
import { jest } from "@jest/globals";

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// The Nebius response the service should map into a recipe.
const NEBIUS_RECIPE_RESPONSE = JSON.stringify({
  isCookingVideo: true,
  confidence: 0.9,
  recipe: {
    title: "Viral TikTok Pasta",
    description: "Feta tomato pasta baked in a dish.",
    prepMinutes: 10,
    cookMinutes: 30,
    servings: 4,
    difficultyStars: 2,
    calories: 480,
    tags: ["pasta", "dinner"],
    ingredients: [
      { name: "cherry tomatoes", quantity: 2, unit: "cup" },
      { name: "feta", quantity: 1, unit: "block" },
      { name: "pasta", quantity: 200, unit: "gram" },
    ],
    steps: [
      { step: 1, title: "Bake", description: "Bake tomatoes and feta at 200C for 30 min." },
      { step: 2, title: "Combine", description: "Stir through cooked pasta." },
    ],
  },
});

const mockGenerateContent = jest.fn(async (_request: { prompt: string }) => NEBIUS_RECIPE_RESPONSE);

jest.mock("~/lib/ai/client", () => ({
  generateAIContent: mockGenerateContent,
}));

import { SocialRecipeService } from "../SocialRecipeService";

describe("SocialRecipeService.analyzeForRecipe", () => {
  let service: SocialRecipeService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SocialRecipeService();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /** Build a minimal HTML page with og:* meta + optional JSON-LD. */
  function pageHtml(opts: { title?: string; description?: string; jsonLd?: string }): string {
    const title = opts.title ?? "Viral TikTok Pasta";
    const description = opts.description ?? "Best pasta ever #recipe #feta";
    return [
      "<html><head>",
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      opts.jsonLd ? `<script type="application/ld+json">${opts.jsonLd}</script>` : "",
      "</head><body>login wall</body></html>",
    ].join("");
  }

  it("maps a confident Nebius response into a recipe with platform tags", async () => {
    globalThis.fetch = jest.fn(
      async () => new Response(pageHtml({ title: "Viral TikTok Pasta" }), { status: 200 })
    ) as unknown as typeof fetch;

    const result = await service.analyzeForRecipe({
      platform: "tiktok",
      url: "https://www.tiktok.com/@chef/video/7300000000000000000",
    });

    expect(result.isCookingVideo).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.recipe).toBeDefined();
    expect(result.recipe?.title).toBe("Viral TikTok Pasta");
    expect(result.recipe?.ingredients).toHaveLength(3);
    // Ingredient names are normalised to lowercase.
    expect(result.recipe?.ingredients[0]?.name).toBe("cherry tomatoes");
    // Steps are 1-indexed and ordered.
    expect(result.recipe?.steps).toHaveLength(2);
    expect(result.recipe?.steps[0]?.step).toBe(1);
    // Platform tag is added automatically.
    expect(result.recipe?.tags).toContain("tiktok");
    // Source URL is carried through for the edit/save flow.
    expect(result.recipe?.sourceUrl).toBe("https://www.tiktok.com/@chef/video/7300000000000000000");

    // Nebius was called exactly once with a text-only body (no file/video data).
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("adds the instagram tag for instagram posts", async () => {
    globalThis.fetch = jest.fn(
      async () => new Response(pageHtml({ title: "IG Post" }), { status: 200 })
    ) as unknown as typeof fetch;

    const result = await service.analyzeForRecipe({
      platform: "instagram",
      url: "https://www.instagram.com/p/Cabc123_-/",
    });

    expect(result.isCookingVideo).toBe(true);
    expect(result.recipe?.tags).toContain("instagram");
  });

  it("reads caption meta attributes in either order and preserves quotes and entities", async () => {
    globalThis.fetch = jest.fn(
      async () =>
        new Response(
          `<meta content="Chef's &quot;eggs&quot;: whisk 2 eggs &amp; fry." name="description">`,
          { status: 200 }
        )
    ) as unknown as typeof fetch;
    expect(
      (
        await service.analyzeForRecipe({
          platform: "instagram",
          url: "https://www.instagram.com/p/abc/",
        })
      ).recipe
    ).toBeDefined();
    expect(mockGenerateContent.mock.calls[0]?.[0].prompt).toContain(
      `Chef's "eggs": whisk 2 eggs & fry.`
    );
  });

  it("extracts captions from JSON-LD arrays and graph entries", async () => {
    const caption = "Whisk 2 eggs with a pinch of salt. Fry in 1 tsp oil for 3 minutes.";
    globalThis.fetch = jest.fn(
      async () =>
        new Response(
          `<script type='application/ld+json'>${JSON.stringify([{ "@graph": [{ articleBody: caption }] }])}</script>`,
          { status: 200 }
        )
    ) as unknown as typeof fetch;
    await service.analyzeForRecipe({
      platform: "instagram",
      url: "https://www.instagram.com/p/abc/",
    });
    expect(mockGenerateContent.mock.calls[0]?.[0].prompt).toContain(caption);
  });

  it("tries accessible post text when a generic share message contains no recipe", async () => {
    mockGenerateContent.mockResolvedValueOnce(
      JSON.stringify({ isCookingVideo: false, confidence: 0 })
    );
    globalThis.fetch = jest.fn(
      async () =>
        new Response(pageHtml({ description: "Boil 200g pasta and stir in 2 tbsp pesto." }), {
          status: 200,
        })
    ) as unknown as typeof fetch;
    const result = await service.analyzeForRecipe({
      platform: "tiktok",
      url: "https://www.tiktok.com/@chef/video/123",
      text: "Watch this post!",
    });
    expect(result.recipe).toBeDefined();
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent.mock.calls[1]?.[0].prompt).toContain("Boil 200g pasta");
  });

  it("does not fabricate a recipe or call AI when a blocked page provides no text", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error("network blocked");
    }) as unknown as typeof fetch;
    const result = await service.analyzeForRecipe({
      platform: "tiktok",
      url: "https://www.tiktok.com/@chef/video/123",
    });
    expect(result.isCookingVideo).toBe(false);
    expect(result.recipe).toBeUndefined();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("uses the shared caption when the social page is blocked", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error("network blocked");
    }) as unknown as typeof fetch;
    const text =
      "Bake 2 cups tomatoes and 1 block feta at 200C for 30 minutes. Stir in 200g cooked pasta.";
    const result = await service.analyzeForRecipe({
      platform: "instagram",
      url: "https://www.instagram.com/p/abc/",
      text,
    });
    expect(result.recipe).toBeDefined();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent.mock.calls[0]?.[0].prompt).toContain(text);
  });

  it("extracts a caption-only recipe without fetching any platform", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    expect(
      (
        await service.analyzeForRecipe({
          platform: "text",
          url: "",
          text: "Boil 200g pasta, then stir in pesto.",
        })
      ).recipe
    ).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a graceful fallback when Nebius detects no recipe", async () => {
    globalThis.fetch = jest.fn(
      async () => new Response(pageHtml({ title: "Dance video" }), { status: 200 })
    ) as unknown as typeof fetch;
    mockGenerateContent.mockResolvedValueOnce(
      JSON.stringify({ isCookingVideo: false, confidence: 0.1 })
    );

    const result = await service.analyzeForRecipe({
      platform: "instagram",
      url: "https://www.instagram.com/reel/Cdef456/",
    });

    expect(result.isCookingVideo).toBe(false);
    expect(result.recipe).toBeUndefined();
  });

  it("returns a graceful fallback when Nebius returns a low-confidence/garbage recipe", async () => {
    // If Nebius fabricates a recipe with no real ingredients/steps, the
    // validation step should force confidence to 0 so the UI prompts manual
    // entry instead of saving a fake recipe.
    globalThis.fetch = jest.fn(
      async () => new Response(pageHtml({ title: "Ad" }), { status: 200 })
    ) as unknown as typeof fetch;
    mockGenerateContent.mockResolvedValueOnce(
      JSON.stringify({
        isCookingVideo: true,
        confidence: 0.3,
        recipe: {
          title: "Mystery",
          description: "",
          prepMinutes: 0,
          cookMinutes: 0,
          servings: 0,
          difficultyStars: 1,
          ingredients: [],
          steps: [],
          tags: [],
        },
      })
    );

    const result = await service.analyzeForRecipe({
      platform: "tiktok",
      url: "https://www.tiktok.com/@chef/video/456",
    });

    expect(result.confidence).toBe(0);
    expect(result.recipe).toBeUndefined();
    expect(result.errorMessage).toBeTruthy();
  });

  it("prefers JSON-LD caption text for Instagram pages when present", async () => {
    const jsonLd = JSON.stringify({
      "@type": "SocialMediaPosting",
      articleBody: "Full recipe: 2 cups flour, 1 tsp salt. Mix and bake.",
      name: "Bread recipe",
    });
    globalThis.fetch = jest.fn(
      async () =>
        new Response(pageHtml({ title: "og-title", description: "short og", jsonLd }), {
          status: 200,
        })
    ) as unknown as typeof fetch;

    await service.analyzeForRecipe({
      platform: "instagram",
      url: "https://www.instagram.com/p/Cxyz123/",
    });

    const body = mockGenerateContent.mock.calls[0]?.[0].prompt;
    // The richer JSON-LD caption should be fed to the LLM.
    expect(body).toContain("Full recipe: 2 cups flour");
  });
});
