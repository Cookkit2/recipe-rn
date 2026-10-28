import { normalizeWebRecipeQuery, normalizeWebRecipeUrl } from "../web-recipe-search";

it("normalizes equivalent queries without changing local search", () => {
  expect(normalizeWebRecipeQuery(" Egg   Fried Rice ")).toBe("egg fried rice");
});
it("normalizes fragments, trailing slashes and tracking params while retaining recipe selectors", () => {
  expect(
    normalizeWebRecipeUrl("https://recipes.test/rice/?utm_source=x&id=2&fbclid=y#recipe")
  ).toBe("https://recipes.test/rice?id=2");
});
it.each([
  "file:///tmp/recipe",
  "javascript:alert(1)",
  "https://user:pass@example.com/recipe",
  "http://localhost/rice",
  "http://127.0.0.1",
  "http://0x7f000001",
  "http://192.168.1.1",
  "http://172.16.0.1",
  "http://[::1]",
  "https://host.local/rice",
  null,
])("rejects an unsupported discovery URL: %s", (url) => {
  expect(normalizeWebRecipeUrl(url)).toBeNull();
});
