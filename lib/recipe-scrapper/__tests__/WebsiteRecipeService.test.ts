import { jest } from "@jest/globals";

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// fetchWithTimeout / GeminiAPI are imported at module load but only used by the
// service methods (not the pure extractors). Stub them so importing the module
// pulls in no native/Expo code.
jest.mock("~/utils/fetch-with-timeout", () => ({
  fetchWithTimeout: jest.fn(),
}));
jest.mock("~/utils/gemini-api", () => ({
  GeminiAPI: jest.fn(),
  DEFAULT_GEMINI_MODEL: "test-model",
}));

import { extractMicrodata, extractRdfa, websiteRecipeService } from "../WebsiteRecipeService";

describe("extractMicrodata", () => {
  it("extracts a recipe from representative microdata markup", () => {
    const html = `
      <html><body>
        <div itemscope itemtype="https://schema.org/Recipe">
          <h1 itemprop="name">Chocolate Cake</h1>
          <meta itemprop="description" content="A rich chocolate cake." />
          <ul>
            <li itemprop="recipeIngredient">2 cups flour</li>
            <li itemprop="recipeIngredient">1 cup sugar</li>
          </ul>
          <ol>
            <li itemprop="recipeInstructions">Mix dry ingredients.</li>
            <li itemprop="recipeInstructions">Bake at 350F for 30 minutes.</li>
          </ol>
          <span itemprop="recipeYield">8 servings</span>
          <time itemprop="cookTime" datetime="PT30M">30 min</time>
        </div>
      </body></html>
    `;

    const data = extractMicrodata(html);
    expect(data).toBeDefined();
    expect(data!.name).toBe("Chocolate Cake");
    expect(data!.description).toBe("A rich chocolate cake.");
    expect(data!.recipeIngredient).toEqual(["2 cups flour", "1 cup sugar"]);
    expect(data!.recipeIngredient).toHaveLength(2);
    expect(data!.recipeInstructions).toEqual([
      "Mix dry ingredients.",
      "Bake at 350F for 30 minutes.",
    ]);
    expect(data!.recipeYield).toBe("8 servings");
    expect(data!.cookTime).toBe("30 min");
  });

  it("returns undefined when no recipe itemprop is present", () => {
    const html = `<html><body><div itemprop="author">Jane</div></body></html>`;
    expect(extractMicrodata(html)).toBeUndefined();
  });

  it("returns undefined for an empty document", () => {
    expect(extractMicrodata("")).toBeUndefined();
    expect(extractMicrodata("<html><body>nothing here</body></html>")).toBeUndefined();
  });

  it("accepts the 'ingredients'/'instructions' itemprop aliases", () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Recipe">
        <span itemprop="name">Soup</span>
        <li itemprop="ingredients">1 onion</li>
        <li itemprop="instructions">Simmer.</li>
      </div>`;
    const data = extractMicrodata(html);
    expect(data).toBeDefined();
    expect(data!.recipeIngredient).toEqual(["1 onion"]);
    expect(data!.recipeInstructions).toEqual(["Simmer."]);
  });

  it("decodes HTML entities and strips nested tags in content", () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Recipe">
        <span itemprop="name">Pie</span>
        <li itemprop="recipeIngredient"><b>1&frac12;</b> cups &amp; berries</li>
        <li itemprop="recipeInstructions">Bake at 350&deg;F.</li>
      </div>`;
    const data = extractMicrodata(html);
    expect(data).toBeDefined();
    // &frac12; is not in our decoder set, so it survives as the raw entity, but
    // nested <b> tags are stripped and &amp; is decoded.
    expect(data!.recipeIngredient?.[0]).toContain("&");
    expect(data!.recipeIngredient?.[0]).not.toContain("<b>");
    expect(data!.recipeInstructions?.[0]).toBe("Bake at 350&deg;F.");
  });

  it("uses fallback name/description/image when markup omits them", () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Recipe">
        <li itemprop="recipeIngredient">1 cup rice</li>
        <li itemprop="recipeInstructions">Cook.</li>
      </div>`;
    const data = extractMicrodata(html, {
      name: "Fallback Title",
      description: "Fallback desc",
      image: "https://example.com/img.jpg",
    });
    expect(data).toBeDefined();
    expect(data!.name).toBe("Fallback Title");
    expect(data!.description).toBe("Fallback desc");
    expect(data!.image).toBe("https://example.com/img.jpg");
  });

  it("does not throw on malformed microdata (missing close tag)", () => {
    const html = `<div itemscope><li itemprop="recipeIngredient">eggs`;
    expect(() => extractMicrodata(html)).not.toThrow();
  });
});

describe("extractRdfa", () => {
  it("extracts a recipe from representative RDFa markup (schema: prefix)", () => {
    const html = `
      <html><body>
        <div vocab="https://schema.org/" typeof="Recipe">
          <h1 property="schema:name">Tomato Soup</h1>
          <p property="schema:description">A simple soup.</p>
          <ul>
            <li property="schema:recipeIngredient">4 tomatoes</li>
            <li property="schema:recipeIngredient">1 onion</li>
          </ul>
          <ol>
            <li property="schema:recipeInstructions">Chop tomatoes.</li>
            <li property="schema:recipeInstructions">Simmer 20 minutes.</li>
          </ol>
          <span property="schema:recipeYield">4</span>
        </div>
      </body></html>
    `;

    const data = extractRdfa(html);
    expect(data).toBeDefined();
    expect(data!.name).toBe("Tomato Soup");
    expect(data!.recipeIngredient).toEqual(["4 tomatoes", "1 onion"]);
    expect(data!.recipeInstructions).toEqual(["Chop tomatoes.", "Simmer 20 minutes."]);
    expect(data!.recipeYield).toBe("4");
  });

  it("returns undefined when no recipe property is present", () => {
    const html = `<html><body><span property="schema:author">Jane</span></body></html>`;
    expect(extractRdfa(html)).toBeUndefined();
  });

  it("accepts unprefixed property names", () => {
    const html = `
      <div vocab="https://schema.org/" typeof="Recipe">
        <span property="name">Bread</span>
        <li property="recipeIngredient">flour</li>
        <li property="recipeInstructions">Knead and bake.</li>
      </div>`;
    const data = extractRdfa(html);
    expect(data).toBeDefined();
    expect(data!.recipeIngredient).toEqual(["flour"]);
    expect(data!.recipeInstructions).toEqual(["Knead and bake."]);
  });

  it("returns undefined for an empty document", () => {
    expect(extractRdfa("")).toBeUndefined();
  });

  it("does not throw on malformed RDFa", () => {
    const html = `<div property="schema:recipeIngredient">eggs`;
    expect(() => extractRdfa(html)).not.toThrow();
  });
});

describe("websiteRecipeService.extractRecipeFromHtml (AI fallback)", () => {
  // Shared, configurable mock for the dynamically-imported RecipeAnalyzer.
  // The service imports it lazily via `await import("./youtube/RecipeAnalyzer")`,
  // so a top-level jest.mock factory is picked up at resolution time.
  const analyzeWebsiteForRecipe = jest.fn<(websiteContent: any, url?: string) => Promise<any>>();

  beforeEach(() => {
    analyzeWebsiteForRecipe.mockReset();
    jest.doMock("~/lib/recipe-scrapper/youtube/RecipeAnalyzer", () => ({
      RecipeAnalyzer: jest.fn().mockImplementation(() => ({
        analyzeWebsiteForRecipe,
      })),
    }));
    // Reset the module registry so the service re-imports the fresh mock.
    jest.resetModules();
  });

  async function loadService() {
    // Re-require after resetModules so the dynamic import sees the mock.
    const mod = await import("~/lib/recipe-scrapper/WebsiteRecipeService");
    return mod.websiteRecipeService;
  }

  it("returns the validated recipe and confidence when the analyzer detects a recipe", async () => {
    const fakeRecipe = {
      title: "AI Soup",
      description: "from html",
      prepMinutes: 5,
      cookMinutes: 10,
      servings: 2,
      difficultyStars: 2,
      ingredients: [{ name: "water", quantity: 1, unit: "cup" }],
      steps: [{ step: 1, title: "Boil", description: "Boil the water." }],
      tags: [],
      sourceUrl: "https://example.com/soup",
    };
    analyzeWebsiteForRecipe.mockResolvedValue({
      isCookingVideo: true,
      confidence: 0.9,
      recipe: fakeRecipe,
    });

    const service = await loadService();
    const websiteContent = {
      url: "https://example.com/soup",
      title: "AI Soup",
      htmlContent: "some readable text",
      hasStructuredData: false,
    } as any;

    const result = await service.extractRecipeFromHtml(websiteContent, "https://example.com/soup");

    expect(analyzeWebsiteForRecipe).toHaveBeenCalledTimes(1);
    expect(result.confidence).toBe(0.9);
    expect(result.recipe).toBeDefined();
    expect(result.recipe!.title).toBe("AI Soup");
  });

  it("returns recipe=undefined when confidence is present but the recipe fails isValidRecipe", async () => {
    analyzeWebsiteForRecipe.mockResolvedValue({
      isCookingVideo: true,
      confidence: 0.5,
      recipe: {
        title: "Bad",
        // "unknown ingredient" is rejected by isValidRecipe.
        ingredients: [{ name: "unknown ingredient", quantity: 1, unit: "piece" }],
        steps: [{ step: 1, title: "x", description: "" }],
      },
    });

    const service = await loadService();
    const result = await service.extractRecipeFromHtml(
      { url: "u", title: "t", htmlContent: "c", hasStructuredData: false } as any,
      "u"
    );

    expect(result.recipe).toBeUndefined();
  });

  it("returns recipe=undefined and the analyzer confidence when not a recipe", async () => {
    analyzeWebsiteForRecipe.mockResolvedValue({
      isCookingVideo: false,
      confidence: 0.1,
    });

    const service = await loadService();
    const result = await service.extractRecipeFromHtml(
      { url: "u", title: "t", htmlContent: "c", hasStructuredData: false } as any,
      "u"
    );

    expect(result.recipe).toBeUndefined();
    expect(result.confidence).toBe(0.1);
  });
});
