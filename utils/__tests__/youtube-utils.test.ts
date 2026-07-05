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
    it("should return isCooking true for cooking-related titles", () => {
      const result = quickCookingCheck("How to make chocolate chip cookies - easy recipe");
      expect(result.isCooking).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should return isCooking false for non-cooking titles", () => {
      const result = quickCookingCheck("Top 10 programming languages in 2024");
      expect(result.isCooking).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });
});
