import { publishRecipeShare, fetchRecipeShare } from "../recipeShareApi";
import type { Recipe } from "~/types/Recipe";
import { buildRecipeShareSnapshot } from "~/utils/recipe-share-snapshot";

const getSession = jest.fn();
const signInAnonymously = jest.fn();
const rpc = jest.fn();
const abortSignal = jest.fn();
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
  rpc.mockReturnValue({ abortSignal });
  getSession.mockResolvedValue({ data: { session: { access_token: "session" } }, error: null });
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json({ service: "cookkit-recipe-links", ready: true }));
});
afterEach(() => jest.restoreAllMocks());
it("publishes only the displayed snapshot and returns an HTTPS token link", async () => {
  abortSignal.mockResolvedValue({ data: token, error: null });
  await expect(publishRecipeShare(recipe)).resolves.toBe(
    `https://recipe-web-mings-projects-6bb85e23.vercel.app/r/${token}`
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
it("doesn't generate a broken public link before the domain is ready", async () => {
  jest.mocked(fetch).mockRejectedValueOnce(new Error("Domain unavailable"));
  await expect(publishRecipeShare(recipe)).rejects.toThrow("Domain unavailable");
  expect(rpc).not.toHaveBeenCalled();
});
it("validates remote data and distinguishes unavailable links", async () => {
  abortSignal.mockResolvedValueOnce({ data: buildRecipeShareSnapshot(recipe), error: null });
  await expect(fetchRecipeShare(token)).resolves.toEqual(buildRecipeShareSnapshot(recipe));
  abortSignal.mockResolvedValueOnce({ data: null, error: null });
  await expect(fetchRecipeShare(token)).rejects.toThrow("no longer available");
  abortSignal.mockResolvedValueOnce({ data: null, error: { message: "Private upstream details" } });
  await expect(fetchRecipeShare(token)).rejects.toThrow("Check your connection");
});
