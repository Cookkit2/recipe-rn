import { extractYouTubeVideoId, isValidYouTubeUrl, quickCookingCheck } from "../youtube-utils";

describe("quickCookingCheck", () => {
  it("identifies strong cooking-related titles", () => {
    // 3 unique matches = confidence 1.0 (isCooking: true)
    const result = quickCookingCheck("How to Cook a Perfect Steak Recipe for Dinner");
    expect(result.isCooking).toBe(true);
    expect(result.confidence).toBe(1.0);
  });

  it("identifies moderate cooking-related titles", () => {
    // 1 match = confidence ~0.33 (isCooking: true)
    const result = quickCookingCheck("My Favorite Chicken");
    expect(result.isCooking).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.33);
    expect(result.confidence).toBeLessThan(0.34);
  });

  it("rejects non-cooking titles", () => {
    // 0 matches = confidence 0 (isCooking: false)
    const result = quickCookingCheck("Latest Tech Review 2024");
    expect(result.isCooking).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it("handles empty titles", () => {
    const result = quickCookingCheck("");
    expect(result.isCooking).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it("counts unique keywords only", () => {
    // "chicken" appears 3 times, but only counts as 1 unique match
    // confidence should be ~0.33
    const result = quickCookingCheck("Chicken chicken CHICKEN");
    expect(result.isCooking).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.33);
    expect(result.confidence).toBeLessThan(0.34);
  });

  it("is case insensitive", () => {
    // 2 unique matches = confidence ~0.66
    const result = quickCookingCheck("RECIPE for HOMEMADE bread");
    expect(result.isCooking).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.66);
    expect(result.confidence).toBeLessThan(0.67);
  });

  it("handles partial word boundaries correctly", () => {
    const result = quickCookingCheck("Uncooked or overcooked?");
    expect(result.isCooking).toBe(false);
    expect(result.confidence).toBe(0);
  });
});

describe("extractYouTubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", "standard watch URL"],
    ["http://youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", "standard http watch URL"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ", "youtu.be short URL"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ", "embed URL"],
    ["https://www.youtube.com/v/dQw4w9WgXcQ", "dQw4w9WgXcQ", "old v URL"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ", "shorts URL"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ", "live URL"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", "mobile URL"],
    [
      "https://www.youtube.com/watch?feature=player_embedded&v=dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
      "extra query parameters before",
    ],
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
      "dQw4w9WgXcQ",
      "extra query parameters after",
    ],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "dQw4w9WgXcQ", "short URL with query parameters"],
    ["  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ", "dQw4w9WgXcQ", "URL with whitespace"],
  ])("extracts from %s (%s)", (url, expected) => {
    expect(extractYouTubeVideoId(url)).toBe(expected);
  });

  it.each([
    ["https://vimeo.com/123456", "non-YouTube URL"],
    ["https://www.youtube.com/watch?v=too_short", "too short ID"],
    ["https://www.youtube.com/watch?v=this_is_too_long", "too long ID"],
    ["not a url at all", "invalid string"],
    ["", "empty string"],
    [null as any, "null"],
    [undefined as any, "undefined"],
    [123 as any, "number"],
  ])("returns null for %s", (url) => {
    expect(extractYouTubeVideoId(url)).toBeNull();
  });
});

describe("isValidYouTubeUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "standard watch URL"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ", "watch URL without www"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtu.be short URL"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "embed URL"],
    ["https://www.youtube.com/v/dQw4w9WgXcQ", "old v URL"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "shorts URL"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "mobile URL"],
  ])("returns true for %s (%s)", (url) => {
    expect(isValidYouTubeUrl(url)).toBe(true);
  });

  it.each([
    ["https://www.google.com", "non-YouTube URL"],
    ["not a url", "invalid string"],
    ["https://youtube.com", "YouTube domain without video"],
    ["", "empty string"],
    [null as any, "null"],
    [undefined as any, "undefined"],
  ])("returns false for %s (%s)", (url) => {
    expect(isValidYouTubeUrl(url)).toBe(false);
  });
});
