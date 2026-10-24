import { redirectSharedRecipeIntent } from "../native-share-route";
it.each([
  "cookkit://dataUrl=group.app.cookkit.cookkit#text",
  "dataUrl=group.app.cookkit.cookkit#weburl",
  "cookkit://expo-sharing",
  "cookkit://expo-sharing?source=android",
  "/expo-sharing",
  "https://recipe-web-mings-projects-6bb85e23.vercel.app/r/430138cb-2b17-42c8-a72b-b67e1c5ac927",
  "cookkit://share/430138cb-2b17-42c8-a72b-b67e1c5ac927",
])("opens the app shell while the shared recipe is imported automatically", (path) =>
  expect(redirectSharedRecipeIntent(path)).toBe("/")
);
it.each([
  "cookkit://recipe/one",
  "/recipes/one",
  "https://example.com/recipe",
  "https://expo-sharing/",
])("preserves other deep links", (path) => expect(redirectSharedRecipeIntent(path)).toBe(path));
