import { redirectSharedRecipeIntent } from "../native-share-route";
it.each([
  "cookkit://dataUrl=group.app.cookkit.cookkit#text",
  "dataUrl=group.app.cookkit.cookkit#weburl",
])("routes a share launch through the app shell", (path) =>
  expect(redirectSharedRecipeIntent(path)).toBe("/")
);
it.each(["cookkit://recipe/one", "/recipes/one", "https://example.com/recipe"])(
  "preserves other deep links",
  (path) => expect(redirectSharedRecipeIntent(path)).toBe(path)
);
