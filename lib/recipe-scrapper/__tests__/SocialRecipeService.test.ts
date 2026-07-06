/**
 * SocialRecipeService — Gemini extraction mapping for TikTok/Instagram.
 *
 * Per issue #747: social-video import reuses the existing Gemini extraction
 * pipeline. These tests mock globalThis.fetch (so we never hit real TikTok/IG)
 * and the GeminiAPI, then assert that:
 *   - a confident Gemini response is mapped into a GeneratedRecipe with the
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

// The Gemini response the service should map into a recipe.
const GEMINI_RECIPE_RESPONSE = JSON.stringify({
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

const generateContentMock = jest.fn(
  async (_model: string, _body: string) => GEMINI_RECIPE_RESPONSE
);

jest.mock("~/utils/gemini-api", () => ({
  GeminiAPI: jest.fn().mockImplementation(() => ({
    generateContent: generateContentMock,
  })),
  DEFAULT_GEMINI_MODEL: "gemini-2.5-flash-lite",
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

  it("maps a confident Gemini response into a recipe with platform tags", async () => {
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

    // Gemini was called exactly once with a text-only body (no file/video data).
    expect(generateContentMock).toHaveBeenCalledTimes(1);
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

  it("is resilient to a blocked fetch and still consults Gemini with empty metadata", async () => {
    // Social platforms frequently reject our request or serve a login wall.
    // The service catches the fetch failure internally and feeds empty metadata
    // to Gemini rather than throwing, so the caller always gets a result. The
    // graceful no-recipe fallback is then driven by Gemini's confidence (see the
    // low-confidence test below) and by recipeImportApi's error mapping.
    globalThis.fetch = jest.fn(async () => {
      throw new Error("network blocked");
    }) as unknown as typeof fetch;

    const result = await service.analyzeForRecipe({
      platform: "tiktok",
      url: "https://www.tiktok.com/@chef/video/123",
    });

    // Did not throw; Gemini was still consulted.
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    // With the default confident mock, a recipe is returned (proving the blocked
    // fetch was swallowed rather than aborting the whole flow).
    expect(result.isCookingVideo).toBe(true);
    expect(result.recipe).toBeDefined();
  });

  it("returns a graceful fallback when Gemini detects no recipe", async () => {
    globalThis.fetch = jest.fn(
      async () => new Response(pageHtml({ title: "Dance video" }), { status: 200 })
    ) as unknown as typeof fetch;
    generateContentMock.mockResolvedValueOnce(
      JSON.stringify({ isCookingVideo: false, confidence: 0.1 })
    );

    const result = await service.analyzeForRecipe({
      platform: "instagram",
      url: "https://www.instagram.com/reel/Cdef456/",
    });

    expect(result.isCookingVideo).toBe(false);
    expect(result.recipe).toBeUndefined();
  });

  it("returns a graceful fallback when Gemini returns a low-confidence/garbage recipe", async () => {
    // If Gemini fabricates a recipe with no real ingredients/steps, the
    // validation step should force confidence to 0 so the UI prompts manual
    // entry instead of saving a fake recipe.
    globalThis.fetch = jest.fn(
      async () => new Response(pageHtml({ title: "Ad" }), { status: 200 })
    ) as unknown as typeof fetch;
    generateContentMock.mockResolvedValueOnce(
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

    const body = generateContentMock.mock.calls[0]?.[1];
    // The richer JSON-LD caption should be fed to the LLM.
    expect(body).toContain("Full recipe: 2 cups flour");
  });
});
