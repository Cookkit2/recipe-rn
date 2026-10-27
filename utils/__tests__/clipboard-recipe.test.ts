import { getClipboardRecipe } from "../clipboard-recipe";

describe("clipboard video links", () => {
  it.each([
    "https://youtu.be/abcdefghijk?si=tracking",
    "https://www.youtube.com/watch?v=abcdefghijk&list=123",
    "https://m.youtube.com/shorts/abcdefghijk",
    "https://youtube.com/live/abcdefghijk",
  ])("canonicalizes %s to one video identity", (url) => {
    expect(getClipboardRecipe(url)).toEqual({
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      platform: "YouTube",
      text: undefined,
    });
  });
  it.each([
    "https://vt.tiktok.com/ZSgH2hh7B/",
    "https://vm.tiktok.com/ZSgH2hh7B/",
    "https://www.tiktok.com/t/ZSgH2hh7B/",
    "https://www.tiktok.com/@chef/video/7538296153562008840",
  ])("accepts TikTok video links: %s", (url) => {
    expect(getClipboardRecipe(`Recipe: mix 2 eggs. ${url}?utm_source=copy`)).toMatchObject({
      url,
      platform: "TikTok",
      text: "Recipe: mix 2 eggs.",
    });
  });
  it.each([
    "https://youtube.com.attacker.test/watch?v=abcdefghijk",
    "https://youtube.com@attacker.test/watch?v=abcdefghijk",
    "https://user:pass@youtube.com/watch?v=abcdefghijk",
    "https://youtube.com:8080/watch?v=abcdefghijk",
    "https://youtube.com/@chef",
    "https://youtube.com/watch?v=bad",
    "https://tiktok.com/@chef",
    "https://vt.tiktok.com/path/another",
    "https://example.com/recipe",
    "file:///youtube.com/watch?v=abcdefghijk",
    "ordinary text",
  ])("ignores unsupported or deceptive clipboard content: %s", (text) => {
    expect(getClipboardRecipe(text)).toBeNull();
  });
});
