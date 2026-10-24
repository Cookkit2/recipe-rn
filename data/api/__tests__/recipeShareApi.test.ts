import { publishRecipeShare, fetchRecipeShare } from "../recipeShareApi";
import type { Recipe } from "~/types/Recipe";
import { buildRecipeShareSnapshot } from "~/utils/recipe-share-snapshot";
import { buildRecipeShareLink } from "~/utils/recipe-share-link";

const getSession = jest.fn();
const signInAnonymously = jest.fn();
const rpc = jest.fn();
const abortSignal = jest.fn();
const cachedValues = new Map<string, unknown>();
jest.mock("~/data/storage", () => ({
  storageFacade: {
    get: (key: string) => cachedValues.get(key) ?? null,
    set: (key: string, value: unknown) => cachedValues.set(key, value),
    delete: (key: string) => cachedValues.delete(key),
  },
}));
jest.mock("~/lib/supabase/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      signInAnonymously: (...args: unknown[]) => signInAnonymously(...args),
    },
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));
const token = "430138cb-2b17-42c8-a72b-b67e1c5ac927";
const recipe: Recipe = {
  id: "private-id",
  title: "Pasta",
  description: "Dinner",
  imageUrl: "file:///private.jpg",
  ingredients: [{ name: "Pasta", quantity: 200, unit: "g", relatedIngredientId: "pantry-id" }],
  instructions: [{ step: 1, title: "Cook", description: "Boil pasta", relatedIngredientIds: [] }],
};
beforeEach(() => {
  jest.resetAllMocks();
  cachedValues.clear();
  rpc.mockReturnValue({ abortSignal });
  getSession.mockResolvedValue({ data: { session: { access_token: "session" } }, error: null });
  jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () =>
      Response.json({ service: "cookkit-recipe-links", ready: true })
    );
});
afterEach(() => jest.restoreAllMocks());
it("publishes only the displayed snapshot and returns an HTTPS token link", async () => {
  abortSignal.mockResolvedValue({ data: token, error: null });
  await expect(publishRecipeShare(recipe)).resolves.toBe(
    "https://recipe-web-mings-projects-6bb85e23.vercel.app/r/QwE4yysXQsinK7Z-HFrJJw"
  );
  expect(rpc).toHaveBeenCalledWith("create_recipe_share", {
    p_snapshot: buildRecipeShareSnapshot(recipe),
  });
  expect(signInAnonymously).not.toHaveBeenCalled();
});
it("uses guest authentication when the user has no account session", async () => {
  getSession.mockResolvedValue({ data: { session: null }, error: null });
  signInAnonymously.mockResolvedValue({ data: { session: {} }, error: null });
  abortSignal.mockResolvedValue({ data: token, error: null });
  await publishRecipeShare(recipe);
  expect(signInAnonymously).toHaveBeenCalledTimes(1);
});
it("doesn't publish if authentication fails", async () => {
  getSession.mockResolvedValue({ error: new Error("Expired") });
  await expect(publishRecipeShare(recipe)).rejects.toThrow("Couldn't connect");
  expect(rpc).not.toHaveBeenCalled();
});
it("reuses a published link without website, session, or publishing requests", async () => {
  abortSignal.mockResolvedValue({ data: token, error: null });
  const link = await publishRecipeShare(recipe);
  await expect(publishRecipeShare(recipe)).resolves.toBe(link);
  expect(fetch).not.toHaveBeenCalled();
  expect(getSession).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledTimes(1);
});
it("reuses links after the publishing module reloads", async () => {
  abortSignal.mockResolvedValue({ data: token, error: null });
  const link = await publishRecipeShare(recipe);
  jest.resetModules();
  const reloaded = await import("../recipeShareApi");
  await expect(reloaded.publishRecipeShare(recipe)).resolves.toBe(link);
  expect(rpc).toHaveBeenCalledTimes(1);
});
it("publishes a new snapshot when the displayed servings or recipe content changes", async () => {
  const newToken = "b22530b9-d036-4c95-b319-21cef0ea281f";
  abortSignal
    .mockResolvedValueOnce({ data: token, error: null })
    .mockResolvedValue({ data: newToken, error: null });
  const firstLink = await publishRecipeShare(recipe);
  const changed = { ...recipe, servings: 4 };
  await expect(publishRecipeShare(changed)).resolves.not.toBe(firstLink);
  await publishRecipeShare({ ...changed, title: "New pasta" });
  expect(rpc).toHaveBeenCalledTimes(3);
});
it("doesn't republish for changes to private recipe state", async () => {
  abortSignal.mockResolvedValue({ data: token, error: null });
  const link = await publishRecipeShare(recipe);
  await expect(
    publishRecipeShare({
      ...recipe,
      isFavorite: true,
      ingredients: recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        relatedIngredientId: "another-pantry-id",
      })),
    })
  ).resolves.toBe(link);
  expect(rpc).toHaveBeenCalledTimes(1);
});
it("coalesces simultaneous shares of the same recipe", async () => {
  abortSignal.mockResolvedValue({ data: token, error: null });
  const links = await Promise.all([publishRecipeShare(recipe), publishRecipeShare(recipe)]);
  expect(links[0]).toBe(links[1]);
  expect(rpc).toHaveBeenCalledTimes(1);
});
it("allows retrying a failed publish", async () => {
  abortSignal
    .mockResolvedValueOnce({ data: null, error: { message: "Offline" } })
    .mockResolvedValueOnce({ data: token, error: null });
  await expect(publishRecipeShare(recipe)).rejects.toThrow("Couldn't create");
  await expect(publishRecipeShare(recipe)).resolves.toBe(buildRecipeShareLink(token));
  expect(rpc).toHaveBeenCalledTimes(2);
});
it("validates remote data and distinguishes unavailable links", async () => {
  abortSignal.mockResolvedValueOnce({ data: buildRecipeShareSnapshot(recipe), error: null });
  await expect(fetchRecipeShare(token)).resolves.toEqual(buildRecipeShareSnapshot(recipe));
  abortSignal.mockResolvedValueOnce({ data: null, error: null });
  await expect(fetchRecipeShare(token)).rejects.toThrow("no longer available");
  abortSignal.mockResolvedValueOnce({ data: null, error: { message: "Private upstream details" } });
  await expect(fetchRecipeShare(token)).rejects.toThrow("Check your connection");
});
