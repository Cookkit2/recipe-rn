import { normalizeSharedRecipe } from "../shared-recipe";
it("accepts a shared social URL and separates the caption", () => {
  expect(
    normalizeSharedRecipe({
      text: "Boil 200g pasta. Stir in pesto. https://www.instagram.com/p/abc/",
    })
  ).toEqual({ url: "https://www.instagram.com/p/abc/", text: "Boil 200g pasta. Stir in pesto." });
});
it("accepts URL-only and caption-only shares", () => {
  expect(normalizeSharedRecipe({ webUrl: "https://youtu.be/abc" })).toEqual({
    url: "https://youtu.be/abc",
    text: undefined,
  });
  expect(normalizeSharedRecipe({ text: "2 eggs. Whisk and fry." })).toEqual({
    url: undefined,
    text: "2 eggs. Whisk and fry.",
  });
});
it("rejects empty, file and executable URL payloads", () => {
  expect(normalizeSharedRecipe({})).toBeNull();
  expect(normalizeSharedRecipe({ webUrl: "file:///private/file" })).toBeNull();
  expect(normalizeSharedRecipe({ webUrl: "javascript:alert(1)" })).toBeNull();
});
it("bounds shared text and strips sentence punctuation from URLs", () => {
  expect(normalizeSharedRecipe({ text: "Try https://example.com/recipe)." })?.url).toBe(
    "https://example.com/recipe"
  );
  expect(normalizeSharedRecipe({ text: "a".repeat(40000) })?.text?.length).toBe(32000);
});
