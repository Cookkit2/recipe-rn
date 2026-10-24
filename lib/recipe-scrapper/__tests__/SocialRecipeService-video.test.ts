import { SocialRecipeService } from "../SocialRecipeService";
import { readRecipeVideo } from "../recipe-video";
import { generateAIContent } from "~/lib/ai/client";

jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock("../recipe-video", () => ({ readRecipeVideo: jest.fn() }));
jest.mock("~/lib/ai/client", () => ({ generateAIContent: jest.fn() }));
const generate = jest.mocked(generateAIContent);
const read = jest.mocked(readRecipeVideo);
const url = "https://vt.tiktok.com/ZSgH2hh7B/";
const caption =
  "Minced chicken steamed egg. Egg 5, water 375ml, minced chicken (amount not stated).";
const result = JSON.stringify({
  isCookingVideo: true,
  confidence: 0.9,
  recipe: {
    title: "Steamed egg",
    ingredients: [
      { name: "egg", quantity: 5, unit: "piece" },
      { name: "minced chicken", quantity: 0, unit: "gram" },
    ],
    steps: [{ step: 1, title: "Steam", description: "Steam for 15 minutes." }],
  },
});
const notRecipe = JSON.stringify({
  isCookingVideo: false,
  confidence: 0,
  errorMessage: "Preparation steps are missing.",
});

describe("social video recipe fallback", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    generate.mockReset();
    globalThis.fetch = jest.fn(
      async () => new Response(`<meta name="description" content="${caption}">`)
    );
    read.mockResolvedValue({
      title: "Steamed egg",
      caption,
      transcript: "Steam for fifteen minutes.",
      frames: [{ timestamp: 8, mimeType: "image/jpeg", data: "/9j/" }],
      warnings: ["Review the sampled video steps."],
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("combines spoken instructions and frame observations with the ingredient caption", async () => {
    generate
      .mockResolvedValueOnce(notRecipe)
      .mockResolvedValueOnce(JSON.stringify({ text: "[8s] Steam for 15 minutes." }))
      .mockResolvedValueOnce(result);
    const analysis = await new SocialRecipeService().analyzeForRecipe({ platform: "tiktok", url });
    expect(read).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[1]?.[0].images).toHaveLength(1);
    expect(generate.mock.calls[2]?.[0].prompt).toContain("Steam for fifteen minutes");
    expect(generate.mock.calls[2]?.[0].prompt).toContain("[8s] Steam for 15 minutes.");
    expect(generate.mock.calls[2]?.[0].prompt).toContain("Egg 5");
    expect(analysis.recipe?.ingredients[1]?.quantity).toBe(0);
    expect(analysis.warnings?.join(" ")).toContain("amount");
  });
  it("uses a chosen local video without fetching the social webpage", async () => {
    generate
      .mockResolvedValueOnce(JSON.stringify({ text: "Steam for 15 minutes." }))
      .mockResolvedValueOnce(result);
    const analysis = await new SocialRecipeService().analyzeForRecipe({
      platform: "tiktok",
      url,
      videoUri: "file:///cache/picked.mp4",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(read.mock.calls[0]?.[0].videoUri).toBe("file:///cache/picked.mp4");
    expect(analysis.recipe).toBeDefined();
  });
  it("keeps a full caption on the fast text path", async () => {
    generate.mockResolvedValueOnce(result);
    await new SocialRecipeService().analyzeForRecipe({
      platform: "tiktok",
      url,
      text: "Whisk 5 eggs and steam for 15 minutes.",
    });
    expect(read).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("reads frames when speech is unavailable or permission was denied", async () => {
    read.mockResolvedValueOnce({
      title: "Egg",
      caption,
      transcript: "",
      frames: [{ timestamp: 8, mimeType: "image/jpeg", data: "/9j/" }],
      warnings: ["Speech unavailable; review the steps."],
    });
    generate
      .mockResolvedValueOnce(JSON.stringify({ text: "Steam for 15 minutes." }))
      .mockResolvedValueOnce(result);
    const analysis = await new SocialRecipeService().analyzeForRecipe({
      platform: "text",
      url: "",
      videoUri: "file:///cache/picked.mp4",
    });
    expect(analysis.recipe).toBeDefined();
    expect(analysis.warnings).toContain("Speech unavailable; review the steps.");
  });
  it("preserves an actionable access error for the file/caption recovery UI", async () => {
    generate.mockResolvedValueOnce(notRecipe);
    read.mockRejectedValueOnce(
      new Error("Couldn't access this video. Choose a saved video or paste the full caption.")
    );
    const analysis = await new SocialRecipeService().analyzeForRecipe({ platform: "tiktok", url });
    expect(analysis.recipe).toBeUndefined();
    expect(analysis.errorMessage).toContain("Choose a saved video");
  });
  it("does not accept invented cooking steps from an ingredient-only caption", async () => {
    generate.mockResolvedValueOnce(result);
    const analysis = await new SocialRecipeService().analyzeForRecipe({
      platform: "text",
      url: "",
      text: "Egg 5, water 375ml, minced chicken.",
    });
    expect(analysis.recipe).toBeUndefined();
    expect(analysis.confidence).toBe(0);
  });

  it("does not attempt a video download for plain pasted text", async () => {
    generate.mockResolvedValueOnce(notRecipe);
    await new SocialRecipeService().analyzeForRecipe({
      platform: "text",
      url: "",
      text: "Five eggs",
    });
    expect(read).not.toHaveBeenCalled();
  });
});
