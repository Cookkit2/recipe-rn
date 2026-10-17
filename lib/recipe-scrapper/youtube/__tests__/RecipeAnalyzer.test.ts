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
  steps: [{ step: 1, title: "Cook", description: "Simmer the rice." }],
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
  it("explains missing recipe text and makes no AI call for a URL and title alone", async () => {
    const result = await new RecipeAnalyzer().analyzeForRecipe(video);
    expect(result.isCookingVideo).toBe(false);
    expect(result.errorMessage).toContain("caption or transcript");
    expect(generateAIContent).not.toHaveBeenCalled();
  });
});
