import { jest, describe, it, expect } from "@jest/globals";
import { isValidYouTubeUrl, extractYouTubeVideoId, quickCookingCheck } from "../youtube-utils";

describe("youtube-utils", () => {
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

  describe("extractYouTubeVideoId", () => {
    it("should extract video ID from standard watch URL", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        "dQw4w9WgXcQ"
      );
    });

    it("should extract video ID from short URL", () => {
      expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("should handle URLs with extra parameters", () => {
      expect(
        extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be")
      ).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?t=10s&v=dQw4w9WgXcQ")).toBe(
        "dQw4w9WgXcQ"
      );
    });

    it("should return null for invalid URLs", () => {
      expect(extractYouTubeVideoId("https://www.google.com")).toBe(null);
      expect(extractYouTubeVideoId("not a url")).toBe(null);
    });
  });

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
});
