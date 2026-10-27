import { cleanRecipeDescription } from "../recipe-description";

it("hides the old automatic ingredient and yield estimate paragraphs", () => {
  expect(
    cleanRecipeDescription(
      "Crispy chicken with curry.\n\nIngredient amounts include AI estimates for 2 servings."
    )
  ).toBe("Crispy chicken with curry.");
  expect(cleanRecipeDescription("Serving size estimated by AI: 2 servings.")).toBe("");
});
it("preserves recipe prose and user-written discussion of estimated amounts", () => {
  const description = "A family favourite.\n\nAdjust ingredient amounts for 2 servings.\n";
  expect(cleanRecipeDescription(description)).toBe(description);
  expect(
    cleanRecipeDescription("Ingredient amounts include AI estimates for 2 servings. Use 200g rice.")
  ).toContain("Use 200g rice.");
  expect(cleanRecipeDescription(null)).toBe("");
});
