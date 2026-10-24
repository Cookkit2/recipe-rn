import { buildRecipeShareLink, parseRecipeShareLink } from "../recipe-share-link";
import { buildRecipeShareSnapshot, parseRecipeShareSnapshot } from "../recipe-share-snapshot";
import type { Recipe } from "~/types/Recipe";

export const token = "430138cb-2b17-42c8-a72b-b67e1c5ac927";
export const sharedRecipe: Recipe = {
  id: "private-device-id",
  title: "Pasta",
  description: "Dinner",
  imageUrl: "file:///private/photo.jpg",
  isFavorite: true,
  servings: 2,
  sourceUrl: "https://example.com/pasta",
  ingredients: [{ name: "Pasta", quantity: 200, unit: "g", relatedIngredientId: "pantry-id" }],
  instructions: [
    { step: 1, title: "Cook", description: "Boil pasta", relatedIngredientIds: ["pantry-id"] },
  ],
};

it("round trips public and browser Open in Cookkit links", () => {
  expect(parseRecipeShareLink(buildRecipeShareLink(token))).toBe(token);
  expect(parseRecipeShareLink(`cookkit://share/${token}`)).toBe(token);
  expect(parseRecipeShareLink(`${buildRecipeShareLink(token)}/?utm_source=chat`)).toBe(token);
});
it.each([
  `http://recipe-web-mings-projects-6bb85e23.vercel.app/r/${token}`,
  `https://evil.example/r/${token}`,
  `https://recipe-web-mings-projects-6bb85e23.vercel.app.evil.example/r/${token}`,
  `https://user@recipe-web-mings-projects-6bb85e23.vercel.app/r/${token}`,
  `https://recipe-web-mings-projects-6bb85e23.vercel.app/r/${token}/extra`,
  "https://recipe-web-mings-projects-6bb85e23.vercel.app/r/not-a-token",
  null,
])("rejects unrelated or malformed link %s", (value) => {
  expect(parseRecipeShareLink(value)).toBeNull();
});
it("only publishes the explicit recipe fields and keeps source attribution", () => {
  const snapshot = buildRecipeShareSnapshot(sharedRecipe);
  expect(snapshot.sourceUrl).toBe(sharedRecipe.sourceUrl);
  expect(snapshot.imageUrl).toBe("");
  expect(JSON.stringify(snapshot)).not.toMatch(/private-device-id|pantry-id|isFavorite/);
  expect(snapshot.ingredients[0]?.quantity).toBe(200);
});
it("rejects malformed snapshots and unsafe external URLs", () => {
  const snapshot = buildRecipeShareSnapshot(sharedRecipe);
  expect(() => parseRecipeShareSnapshot({ ...snapshot, ingredients: [] })).toThrow();
  expect(() => parseRecipeShareSnapshot({ ...snapshot, servings: NaN })).toThrow();
  expect(
    parseRecipeShareSnapshot({ ...snapshot, sourceUrl: "javascript:alert(1)" }).sourceUrl
  ).toBeUndefined();
});
