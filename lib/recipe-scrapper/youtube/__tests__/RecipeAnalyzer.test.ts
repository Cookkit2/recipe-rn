import { RecipeAnalyzer } from "../RecipeAnalyzer";
import { generateAIContent } from "~/lib/ai/client";
import type { YouTubeVideoInfo } from "../types";

jest.mock("~/lib/ai/client", () => ({ generateAIContent: jest.fn() }));
jest.mock("~/utils/logger", () => ({ log: { debug: jest.fn(), error: jest.fn() } }));

const video: YouTubeVideoInfo = {
  videoId: "abcdefghijk",
  title: "Garlic rice",
  channelName: "Test kitchen",
  thumbnailUrl: "",
};
const recipe = {
  title: "Garlic rice",
  description: "Rice and garlic",
  prepMinutes: 5,
  cookMinutes: 15,
  servings: 2,
  difficultyStars: 1,
  tags: [],
  ingredients: [{ name: "rice", quantity: 1, unit: "cup" }],
  steps: [
    {
      step: 1,
      title: "Cook",
      description: "Cook the rice for 15 minutes.",
      sourceQuote: "Cook 1 cup rice with 2 cups water for 15 minutes.",
    },
  ],
};

describe("Nebius YouTube recipe analysis", () => {
  beforeEach(() => {
    jest
      .mocked(generateAIContent)
      .mockReset()
      .mockResolvedValue(
        JSON.stringify({
          isCookingVideo: true,
          confidence: 0.9,
          recipe,
        })
      );
  });
  it("uses even a short transcript as text without sending video URLs as files", async () => {
    const result = await new RecipeAnalyzer().analyzeForRecipe(
      video,
      {
        text: "Cook 1 cup rice with 2 cups water for 15 minutes.",
        language: "en",
        segments: [],
      },
      "https://youtube.com/watch?v=abcdefghijk"
    );
    expect(result.recipe?.title).toBe("Garlic rice");
    const request = jest.mocked(generateAIContent).mock.calls[0]![0];
    expect(request.prompt).toContain("Cook 1 cup rice");
    expect(request.image).toBeUndefined();
    expect(request.systemPrompt).toContain("legacy field");
  });
  it("uses a recipe in the description when captions are unavailable", async () => {
    const description = "Ingredients: 1 cup rice, 2 cups water. Simmer 15 minutes.";
    await new RecipeAnalyzer().analyzeForRecipe({ ...video, description });
    expect(jest.mocked(generateAIContent).mock.calls[0]?.[0].prompt).toContain(description);
  });
  it("keeps unknown calories optional when Nano returns null", async () => {
    jest.mocked(generateAIContent).mockResolvedValue(
      JSON.stringify({
        isCookingVideo: true,
        confidence: 0.9,
        recipe: { ...recipe, calories: null },
      })
    );
    const result = await new RecipeAnalyzer().analyzeForRecipe({
      ...video,
      description: "Cook 1 cup rice with 2 cups water for 15 minutes.",
    });
    expect(result.recipe?.calories).toBeUndefined();
  });
  it("uses YouTube video input when transcript and description are missing", async () => {
    const result = await new RecipeAnalyzer().analyzeForRecipe(video);
    expect(result.recipe?.title).toBe("Garlic rice");
    expect(jest.mocked(generateAIContent).mock.calls[0]?.[0]).toMatchObject({
      youtubeVideoUrl: "https://www.youtube.com/watch?v=abcdefghijk",
    });
  });
  it("falls back when available text does not contain a usable recipe", async () => {
    jest
      .mocked(generateAIContent)
      .mockResolvedValueOnce(
        JSON.stringify({ isCookingVideo: false, confidence: 0, errorMessage: "Title only" })
      );
    const result = await new RecipeAnalyzer().analyzeForRecipe({
      ...video,
      description: "Subscribe!",
    });
    expect(result.recipe?.title).toBe("Garlic rice");
    expect(generateAIContent).toHaveBeenCalledTimes(2);
    expect(jest.mocked(generateAIContent).mock.calls[1]?.[0]).toHaveProperty("youtubeVideoUrl");
  });
  it("does not invoke video fallback for a usable text recipe", async () => {
    await new RecipeAnalyzer().analyzeForRecipe({
      ...video,
      description: "Cook 1 cup rice with 2 cups water for 15 minutes.",
    });
    expect(generateAIContent).toHaveBeenCalledTimes(1);
    expect(jest.mocked(generateAIContent).mock.calls[0]?.[0]).not.toHaveProperty("youtubeVideoUrl");
  });
  it("returns a safe failure when video analysis is unavailable", async () => {
    jest
      .mocked(generateAIContent)
      .mockRejectedValue(new Error("Couldn't process this with AI. Please try again."));
    const result = await new RecipeAnalyzer().analyzeForRecipe(video);
    expect(result.isCookingVideo).toBe(false);
    expect(result.errorMessage).toContain("Couldn't process");
  });
  it.each([
    { confidence: 0.2, recipe },
    { confidence: 0.9, recipe: { ...recipe, steps: [] } },
    {
      confidence: 0.9,
      recipe: { ...recipe, ingredients: [{ name: "rice", quantity: 0, unit: "cup" }] },
    },
  ])("rejects incomplete or low-confidence video recipes", async (answer) => {
    jest
      .mocked(generateAIContent)
      .mockResolvedValue(JSON.stringify({ isCookingVideo: true, ...answer }));
    const result = await new RecipeAnalyzer().analyzeForRecipe(video);
    expect(result.isCookingVideo).toBe(false);
    expect(result.recipe).toBeUndefined();
  });
});

it("rejects invented YouTube steps even when the model calls it a recipe", async () => {
  jest.mocked(generateAIContent).mockResolvedValueOnce(
    JSON.stringify({
      isCookingVideo: true,
      confidence: 0.99,
      recipe: {
        ...recipe,
        steps: [
          {
            step: 1,
            title: "Bake",
            description: "Bake the rice for an hour.",
            sourceQuote: "Bake the rice for an hour.",
          },
        ],
      },
    })
  );
  jest.mocked(generateAIContent).mockResolvedValueOnce(
    JSON.stringify({
      isCookingVideo: false,
      confidence: 0,
      errorMessage: "No recipe evidence in the video.",
    })
  );
  const result = await new RecipeAnalyzer().analyzeForRecipe({
    ...video,
    description: "Cook 1 cup rice with 2 cups water for 15 minutes.",
  });
  expect(result.recipe).toBeUndefined();
  expect(result.confidence).toBe(0);
});

it("rejects a food review even if the model reports high confidence without quoted instructions", async () => {
  jest
    .mocked(generateAIContent)
    .mockResolvedValueOnce(JSON.stringify({ isCookingVideo: true, confidence: 0.99, recipe }));
  jest.mocked(generateAIContent).mockResolvedValueOnce(
    JSON.stringify({
      isCookingVideo: false,
      confidence: 0,
      errorMessage: "No recipe evidence in the video.",
    })
  );
  const result = await new RecipeAnalyzer().analyzeForRecipe({
    ...video,
    description: "The best garlic rice restaurant in town. Delicious rice!",
  });
  expect(result.recipe).toBeUndefined();
});
it.each([
  ["Mezcla los huevos y fríelos.", "Mix the eggs and fry them."],
  ["Mélangez les œufs et faites-les frire.", "Mix the eggs and fry them."],
  ["卵を混ぜて焼いてください。", "Mix the eggs and fry them."],
])("accepts verified original-language instructions: %s", async (sourceQuote, description) => {
  jest.mocked(generateAIContent).mockResolvedValue(
    JSON.stringify({
      isCookingVideo: true,
      confidence: 0.95,
      recipe: { ...recipe, steps: [{ step: 1, title: "Cook", description, sourceQuote }] },
    })
  );
  const result = await new RecipeAnalyzer().analyzeForRecipe({
    ...video,
    description: `2 eggs. ${sourceQuote}`,
  });
  expect(result.recipe?.steps[0]?.description).toBe(description);
});
it.each(["In a large bowl, whisk the eggs.", "Once the pan is hot, add the oil."])(
  "accepts source-backed instructions with introductory clauses: %s",
  async (description) => {
    jest.mocked(generateAIContent).mockResolvedValue(
      JSON.stringify({
        isCookingVideo: true,
        confidence: 0.95,
        recipe: {
          ...recipe,
          steps: [{ step: 1, title: "Prepare", description, sourceQuote: description }],
        },
      })
    );
    const result = await new RecipeAnalyzer().analyzeForRecipe({
      ...video,
      description: `2 eggs. ${description}`,
    });
    expect(result.recipe?.steps[0]?.description).toBe(description);
  }
);
