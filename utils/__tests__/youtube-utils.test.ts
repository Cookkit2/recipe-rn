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
  it("extracts standard watch URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(extractYouTubeVideoId("http://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts youtu.be short URLs", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts embed URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts old v URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/v/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts shorts URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts live URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("handles URLs with extra query parameters", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?feature=player_embedded&v=dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe("dQw4w9WgXcQ");
  });

  it("handles URLs with whitespace", () => {
    expect(extractYouTubeVideoId("  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("returns null for invalid or non-YouTube URLs", () => {
    expect(extractYouTubeVideoId("https://vimeo.com/123456")).toBeNull();
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=too_short")).toBeNull();
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=this_is_too_long")).toBeNull();
    expect(extractYouTubeVideoId("not a url at all")).toBeNull();
  });

  it("returns null for invalid inputs", () => {
    expect(extractYouTubeVideoId("")).toBeNull();
    expect(extractYouTubeVideoId(null as any)).toBeNull();
    expect(extractYouTubeVideoId(undefined as any)).toBeNull();
    expect(extractYouTubeVideoId(123 as any)).toBeNull();
  });
});

describe("isValidYouTubeUrl", () => {
  it("should return true for valid YouTube URLs", () => {
    expect(isValidYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isValidYouTubeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isValidYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isValidYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true);
    expect(isValidYouTubeUrl("https://www.youtube.com/v/dQw4w9WgXcQ")).toBe(true);
    expect(isValidYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(true);
    expect(isValidYouTubeUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  it("should return false for invalid URLs", () => {
    expect(isValidYouTubeUrl("https://www.google.com")).toBe(false);
    expect(isValidYouTubeUrl("not a url")).toBe(false);
    expect(isValidYouTubeUrl("https://youtube.com")).toBe(false);
    expect(isValidYouTubeUrl("")).toBe(false);
    expect(isValidYouTubeUrl(null as any)).toBe(false);
    expect(isValidYouTubeUrl(undefined as any)).toBe(false);
  });
});
