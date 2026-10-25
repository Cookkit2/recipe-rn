import { resolveSharedRecipe } from "../resolve-shared-recipe";
import type { RecipeShareSnapshot } from "~/utils/recipe-share-snapshot";

const token = "430138cb-2b17-42c8-a72b-b67e1c5ac927";
const snapshot: RecipeShareSnapshot = {
  version: 1,
  title: "Pasta",
  description: "Dinner",
  imageUrl: "",
  tags: [],
  prepMinutes: 0,
  cookMinutes: 10,
  servings: 2,
  difficultyStars: 1,
  ingredients: [{ name: "Pasta", quantity: 200, unit: "g" }],
  instructions: [{ step: 1, title: "Cook", description: "Boil pasta" }],
};
const deps = {
  getRecipeById: jest.fn(),
  fetchSnapshot: jest.fn(),
  createRecipe: jest.fn(),
};
beforeEach(() => jest.resetAllMocks());
it("imports another person's full recipe without needing the sender's local ID", async () => {
  deps.getRecipeById.mockResolvedValue(null);
  deps.fetchSnapshot.mockResolvedValue(snapshot);
  deps.createRecipe.mockResolvedValue({ id: token });
  await expect(resolveSharedRecipe(token, deps)).resolves.toBe(token);
  expect(deps.createRecipe).toHaveBeenCalledWith(
    expect.objectContaining({
      id: token,
      title: "Pasta",
      ingredients: snapshot.ingredients,
      steps: snapshot.instructions,
    })
  );
});
it("reuses a saved copy offline and preserves local edits on repeat opens", async () => {
  deps.getRecipeById.mockResolvedValue({ id: token });
  await expect(resolveSharedRecipe(token, deps)).resolves.toBe(token);
  expect(deps.fetchSnapshot).not.toHaveBeenCalled();
  expect(deps.createRecipe).not.toHaveBeenCalled();
});
it("does not save a partial recipe if the link is missing or cannot be loaded", async () => {
  deps.getRecipeById.mockResolvedValue(null);
  deps.fetchSnapshot.mockRejectedValue(new Error("Unavailable"));
  await expect(resolveSharedRecipe(token, deps)).rejects.toThrow("Unavailable");
  expect(deps.createRecipe).not.toHaveBeenCalled();
});
