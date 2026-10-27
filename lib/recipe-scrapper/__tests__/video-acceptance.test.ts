import { isAcceptedVideoRecipe } from "../shared/video-acceptance";
import type { RecipeAnalysisResult } from "~/types/ScrappedRecipe";
const analysis: RecipeAnalysisResult = {
  isCookingVideo: true,
  confidence: 0.9,
  recipe: {
    title: "Eggs",
    description: "",
    prepMinutes: 0,
    cookMinutes: 2,
    servings: 1,
    difficultyStars: 1,
    ingredients: [{ name: "egg", quantity: 2, unit: "piece" }],
    steps: [{ step: 1, title: "Fry", description: "Fry the eggs." }],
    tags: [],
    sourceUrl: "",
  },
};
it("accepts a complete, confident recipe", () =>
  expect(isAcceptedVideoRecipe(analysis)).toBe(true));
it.each([0, 0.6, 0.79, NaN, Infinity, 1.01])("rejects invalid confidence %s", (confidence) => {
  expect(isAcceptedVideoRecipe({ ...analysis, confidence })).toBe(false);
});
it("rejects food-only classification and missing recipes", () => {
  expect(isAcceptedVideoRecipe({ ...analysis, isCookingVideo: false })).toBe(false);
  expect(isAcceptedVideoRecipe({ ...analysis, recipe: undefined })).toBe(false);
});
it("rejects a partially invalid recipe rather than dropping its invalid ingredients", () => {
  expect(
    isAcceptedVideoRecipe({
      ...analysis,
      recipe: {
        ...analysis.recipe!,
        ingredients: [...analysis.recipe!.ingredients, { name: "", quantity: 0, unit: "" }],
      },
    })
  ).toBe(false);
});
