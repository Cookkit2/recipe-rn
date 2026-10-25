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
      { name: "minced chicken", quantity: 150, unit: "gram", amountSource: "estimated" },
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
    expect(analysis.recipe?.ingredients[1]?.quantity).toBe(150);
    expect(analysis.recipe?.ingredients[1]?.notes).toContain("AI estimate");
    expect(analysis.recipe?.imageUrl).toBe("data:image/jpeg;base64,/9j/");
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
  it.each([
    "https://vt.tiktok.com/ZSguquYyJ/",
    "https://www.tiktok.com/@teefoodd/video/7538296153562008840",
  ])(
    "translates published subtitles from the shared TikTok URL %s without downloading media",
    async (sharedUrl) => {
      const html = `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">${JSON.stringify({
        __DEFAULT_SCOPE__: {
          "webapp.reflow.video.detail": {
            itemInfo: {
              itemStruct: {
                id: "7538296153562008840",
                desc: caption,
                video: {
                  subtitleInfos: [
                    {
                      Format: "webvtt",
                      Url: "https://v16-webapp.tiktok.com/subtitles",
                      LanguageCodeName: "eng-US",
                    },
                  ],
                },
              },
            },
          },
        },
      })}</script>`;
      globalThis.fetch = jest.fn(
        async (input) =>
          new Response(
            String(input).includes("/subtitles")
              ? "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nmeans chicken steam egg.\n\n00:00:01.000 --> 00:00:03.000\nSteam for 15 minutes.\n"
              : String(input).includes("www.tiktok.com") && !String(input).includes("_r=1")
                ? "<html>No mobile metadata</html>"
                : html
          )
      );
      const modelResult = JSON.parse(result);
      modelResult.recipe.steps = [
        {
          step: 1,
          title: "Steam",
          description: "Steam for 15 minutes.",
          sourceQuote: "Steam for 15 minutes.",
        },
      ];
      generate.mockResolvedValueOnce(JSON.stringify(modelResult));
      const analysis = await new SocialRecipeService().analyzeForRecipe({
        platform: "tiktok",
        url: sharedUrl,
      });
      expect(analysis.recipe).toBeDefined();
      expect(generate.mock.calls[0]?.[0].prompt).toContain("Steam for 15 minutes.");
      expect(read).not.toHaveBeenCalled();
      expect(analysis.recipe?.steps.map((step) => step.description)).toEqual([
        "Steam for 15 minutes.",
      ]);
    }
  );
  it("retains the video fallback when published subtitles are unavailable", async () => {
    const html = `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">${JSON.stringify({
      __DEFAULT_SCOPE__: {
        "webapp.reflow.video.detail": {
          itemInfo: {
            itemStruct: {
              id: "7538296153562008840",
              desc: caption,
              video: {
                subtitleInfos: [
                  { Format: "webvtt", Url: "https://v16-webapp.tiktok.com/subtitles" },
                ],
              },
            },
          },
        },
      },
    })}</script>`;
    globalThis.fetch = jest.fn(
      async (input) =>
        new Response(String(input).includes("/subtitles") ? "Forbidden" : html, {
          status: String(input).includes("/subtitles") ? 403 : 200,
        })
    );
    generate
      .mockResolvedValueOnce(notRecipe)
      .mockResolvedValueOnce(JSON.stringify({ text: "Steam for 15 minutes." }))
      .mockResolvedValueOnce(result);
    const analysis = await new SocialRecipeService().analyzeForRecipe({ platform: "tiktok", url });
    expect(read).toHaveBeenCalledTimes(1);
    expect(analysis.recipe).toBeDefined();
  });
  it("keeps full caption extraction on the text path while checking the post for a cover", async () => {
    generate.mockResolvedValueOnce(result);
    await new SocialRecipeService().analyzeForRecipe({
      platform: "tiktok",
      url,
      text: "Whisk 5 eggs and steam for 15 minutes.",
    });
    expect(read).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
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
