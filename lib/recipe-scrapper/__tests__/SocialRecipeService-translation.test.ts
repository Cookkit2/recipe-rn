import { Ajv } from "ajv";
import { buildSocialRecipeRequest, getAnalysisResponseSchema } from "../shared/recipe-ai-utils";
import { SocialRecipeService } from "../SocialRecipeService";
import { generateAIContent } from "~/lib/ai/client";

jest.mock("~/lib/ai/client", () => ({ generateAIContent: jest.fn() }));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
const generate = jest.mocked(generateAIContent);
const response = (overrides = {}) =>
  JSON.stringify({
    isCookingVideo: true,
    confidence: 0.9,
    recipe: {
      title: "Steamed egg",
      description: "Egg with chicken.",
      prepMinutes: 0,
      cookMinutes: 15,
      servings: 2,
      servingsSource: "estimated",
      difficultyStars: 2,
      tags: [],
      ingredients: [
        { name: "egg", quantity: 2, unit: "piece", amountSource: "stated" },
        { name: "chicken", quantity: 150, unit: "gram", amountSource: "estimated" },
      ],
      steps: [
        {
          step: 1,
          title: "Steam",
          description: "Steam for 15 minutes.",
          sourceQuote: "Kukus selama 15 minit.",
        },
      ],
      ...overrides,
    },
  });
beforeEach(() => jest.resetAllMocks());

it("accepts English translations grounded in the original Malay instruction", async () => {
  generate.mockResolvedValueOnce(response());
  const result = await new SocialRecipeService().analyzeForRecipe({
    platform: "text",
    url: "",
    text: "2 telur, ayam. Kukus selama 15 minit.",
  });
  expect(result.recipe?.steps[0]?.description).toBe("Steam for 15 minutes.");
  expect(result.recipe?.ingredients[1]?.quantity).toBe(150);
  expect(result.recipe?.ingredients[1]?.notes).toContain("AI estimate");
  expect(result.recipe?.description).toContain("2 servings");
  expect(generate.mock.calls[0]?.[0].prompt).toContain("English");
});
it("rejects a translated step whose source quotation is absent", async () => {
  generate.mockResolvedValueOnce(response());
  const result = await new SocialRecipeService().analyzeForRecipe({
    platform: "text",
    url: "",
    text: "2 telur, ayam.",
  });
  expect(result.recipe).toBeUndefined();
});
it("requests positive amounts and units rather than asking the user to fill them in", async () => {
  generate.mockResolvedValueOnce(response());
  await new SocialRecipeService().analyzeForRecipe({
    platform: "text",
    url: "",
    text: "2 telur, ayam. Kukus selama 15 minit.",
  });
  const request = generate.mock.calls[0]?.[0];
  expect(request?.prompt).toContain("estimate");
  expect(request?.prompt).not.toContain("so the user can fill it in");
});

it("enforces complete estimated amounts at the deployed proxy's JSON schema boundary", () => {
  const schema = buildSocialRecipeRequest("extract").responseSchema!;
  const validate = new Ajv({ strict: false }).compile(schema);
  const recipe = JSON.parse(response());
  expect(validate(recipe)).toBe(true);
  recipe.recipe.ingredients[1].quantity = 0;
  expect(validate(recipe)).toBe(false);
  recipe.recipe.ingredients[1].quantity = 150;
  recipe.recipe.ingredients[1].unit = "";
  expect(validate(recipe)).toBe(false);
  // Website and YouTube requests keep their existing response contract.
  expect(
    getAnalysisResponseSchema().properties.recipe.properties.ingredients.items.required
  ).not.toContain("amountSource");
});

it("restricts published-subtitle quotations to cooking instructions while asking for English", () => {
  const allowed = ["Kukus selama 15 minit."];
  const request = buildSocialRecipeRequest("extract", allowed);
  expect(request.systemPrompt).toContain("English");
  const validate = new Ajv({ strict: false }).compile(request.responseSchema!);
  const recipe = JSON.parse(response());
  expect(validate(recipe)).toBe(true);
  recipe.recipe.steps[0].sourceQuote = "Steamed egg is ready";
  expect(validate(recipe)).toBe(false);
});

it("requires enough translated steps to cover each explicit cooking instruction", () => {
  const request = buildSocialRecipeRequest("extract", [
    "Kacau sehingga sebati.",
    "Kukus selama 15 minit.",
  ]);
  const validate = new Ajv({ strict: false }).compile(request.responseSchema!);
  expect(validate(JSON.parse(response()))).toBe(false);
});
