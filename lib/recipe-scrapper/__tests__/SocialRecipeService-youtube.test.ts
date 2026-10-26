import { SocialRecipeService } from "../SocialRecipeService";
import { generateAIContent } from "~/lib/ai/client";
import { readRecipePlayerEvidence, readRecipeVideoCoverFrames } from "../recipe-video-cover";
import { readRecipeVideo } from "../recipe-video";

jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock("~/lib/ai/client", () => ({ generateAIContent: jest.fn() }));
jest.mock("../recipe-video-cover", () => ({
  readRecipePlayerEvidence: jest.fn(),
  readRecipeVideoCoverFrames: jest.fn(),
}));
jest.mock("../recipe-video", () => ({ readRecipeVideo: jest.fn() }));
jest.mock("../youtube/YouTubeServiceFactory", () => ({
  getDefaultYouTubeService: () => ({
    getVideoData: async () => ({
      videoInfo: {
        title: "Chicken curry",
        description: "Ingredients: 2 chicken thighs.",
        thumbnailUrl: "https://example.com/portrait.jpg",
      },
    }),
  }),
}));
const url = "https://www.youtube.com/watch?v=-Ksv82YLW-A";
const frames = [{ timestamp: 400, mimeType: "image/jpeg" as const, data: "YWJj" }];
const recipe = JSON.stringify({
  isCookingVideo: true,
  confidence: 0.9,
  recipe: {
    title: "Chicken Katsu Curry",
    ingredients: [{ name: "chicken thigh", quantity: 2, unit: "piece" }],
    steps: [
      {
        step: 1,
        title: "Air fry",
        description: "Air fry the chicken for 15 minutes.",
        sourceQuote: "Air fry the chicken for 15 minutes.",
      },
    ],
  },
});

beforeEach(() => jest.resetAllMocks());
it("uses real public-player captions and a selected food frame, then returns a complete recipe", async () => {
  jest.mocked(readRecipePlayerEvidence).mockResolvedValue({
    title: "Chicken curry",
    caption: "",
    transcript: "Air fry the chicken for 15 minutes.",
    frames,
    warnings: [],
  });
  jest
    .mocked(generateAIContent)
    .mockResolvedValueOnce('{"text":"[400s] Air fry the chicken for 15 minutes."}')
    .mockResolvedValueOnce(recipe)
    .mockResolvedValueOnce('{"frameNumber":1}');
  const result = await new SocialRecipeService().analyzeForRecipe({ platform: "youtube", url });
  expect(jest.mocked(generateAIContent).mock.calls[1]?.[0].prompt).toContain(
    "Air fry the chicken for 15 minutes."
  );
  expect(result.recipe?.title).toBe("Chicken Katsu Curry");
  expect(result.recipe?.imageUrl).toBe("data:image/jpeg;base64,YWJj");
  expect(readRecipePlayerEvidence).toHaveBeenCalledTimes(1);
  expect(readRecipeVideoCoverFrames).not.toHaveBeenCalled();
  expect(readRecipeVideo).not.toHaveBeenCalled();
});
it("reads cooking actions from actual frames when published captions are unavailable", async () => {
  jest.mocked(readRecipePlayerEvidence).mockResolvedValue({
    title: "Chicken curry",
    caption: "",
    transcript: "",
    frames,
    warnings: [],
  });
  jest
    .mocked(generateAIContent)
    .mockResolvedValueOnce('{"text":"[400s] Air fry the chicken for 15 minutes."}')
    .mockResolvedValueOnce(recipe)
    .mockResolvedValueOnce('{"frameNumber":1}');
  const result = await new SocialRecipeService().analyzeForRecipe({ platform: "youtube", url });
  expect(jest.mocked(generateAIContent).mock.calls[0]?.[0].images).toHaveLength(1);
  expect(result.recipe?.steps[0]?.description).toContain("15 minutes");
  expect(readRecipeVideo).not.toHaveBeenCalled();
});
