import { redirectSharedRecipeIntent } from "../native-share-route";
it.each([
  "cookkit://dataUrl=group.app.cookkit.cookkit#text",
  "dataUrl=group.app.cookkit.cookkit#weburl",
  "cookkit://expo-sharing",
  "cookkit://expo-sharing?source=android",
  "/expo-sharing",
])("routes a share launch through the app shell", (path) =>
  expect(redirectSharedRecipeIntent(path)).toBe("/")
);
it.each([
  "cookkit://recipe/one",
  "/recipes/one",
  "https://example.com/recipe",
  "https://expo-sharing/",
])("preserves other deep links", (path) => expect(redirectSharedRecipeIntent(path)).toBe(path));
