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
  findMatchingRecipe: jest.fn(),
  getResolvedRecipeId: jest.fn(),
  rememberResolvedRecipeId: jest.fn(),
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

it("does not turn an existing recipe into three copies after opening two share links", async () => {
  const library = new Map([["original-gin-fizz", { id: "original-gin-fizz" }]]);
  const resolver = {
    getRecipeById: async (id: string) => library.get(id) ?? null,
    fetchSnapshot: async () => ({ ...snapshot, title: "Gin Fizz" }),
    findMatchingRecipe: async () => "original-gin-fizz",
    getResolvedRecipeId: () => undefined,
    rememberResolvedRecipeId: jest.fn(),
    createRecipe: jest.fn(async (data: { id?: string }) => {
      const recipe = { id: data.id! };
      library.set(recipe.id, recipe);
      return recipe;
    }),
  };
  const first = await resolveSharedRecipe(token, resolver);
  const second = await resolveSharedRecipe("530138cb-2b17-42c8-a72b-b67e1c5ac927", resolver);
  expect([first, second]).toEqual(["original-gin-fizz", "original-gin-fizz"]);
  expect(library.size).toBe(1);
  expect(resolver.createRecipe).not.toHaveBeenCalled();
});

it("reopens a matched recipe offline after local edits", async () => {
  deps.getResolvedRecipeId.mockReturnValue("original-gin-fizz");
  deps.getRecipeById.mockResolvedValue({ id: "original-gin-fizz" });
  await expect(resolveSharedRecipe(token, deps)).resolves.toBe("original-gin-fizz");
  expect(deps.fetchSnapshot).not.toHaveBeenCalled();
  expect(deps.createRecipe).not.toHaveBeenCalled();
});

it("imports again if a remembered recipe was deleted", async () => {
  deps.getResolvedRecipeId.mockReturnValue("deleted-recipe");
  deps.getRecipeById.mockResolvedValue(null);
  deps.fetchSnapshot.mockResolvedValue(snapshot);
  deps.createRecipe.mockResolvedValue({ id: token });
  await expect(resolveSharedRecipe(token, deps)).resolves.toBe(token);
  expect(deps.rememberResolvedRecipeId).toHaveBeenCalledWith(token, token);
});

it("serializes different share tokens so simultaneous opens only save once", async () => {
  let saved: string | undefined;
  deps.getRecipeById.mockResolvedValue(null);
  deps.fetchSnapshot.mockResolvedValue(snapshot);
  deps.findMatchingRecipe.mockImplementation(async () => saved);
  deps.createRecipe.mockImplementation(async (data: { id: string }) => {
    await Promise.resolve();
    saved = data.id;
    return { id: saved };
  });
  await expect(
    Promise.all([
      resolveSharedRecipe(token, deps),
      resolveSharedRecipe("530138cb-2b17-42c8-a72b-b67e1c5ac927", deps),
    ])
  ).resolves.toEqual([token, token]);
  expect(deps.createRecipe).toHaveBeenCalledTimes(1);
});

it("does not block later imports after a database write fails", async () => {
  deps.getRecipeById.mockResolvedValue(null);
  deps.fetchSnapshot.mockResolvedValue(snapshot);
  deps.createRecipe
    .mockRejectedValueOnce(new Error("Write failed"))
    .mockResolvedValueOnce({ id: token });
  await expect(resolveSharedRecipe(token, deps)).rejects.toThrow("Write failed");
  await expect(resolveSharedRecipe(token, deps)).resolves.toBe(token);
});
