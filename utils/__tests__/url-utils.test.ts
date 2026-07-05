import { analyzeUrl } from "../url-utils";

describe("analyzeUrl", () => {
  describe("YouTube URLs", () => {
    it("should correctly identify standard YouTube watch URLs", () => {
      const result = analyzeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result).toEqual({
        type: "youtube",
        isValid: true,
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        normalizedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
      });
    });

    it("should correctly identify short YouTube URLs", () => {
      const result = analyzeUrl("https://youtu.be/dQw4w9WgXcQ");
      expect(result).toEqual({
        type: "youtube",
        isValid: true,
        url: "https://youtu.be/dQw4w9WgXcQ",
        normalizedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
      });
    });

    it("should correctly identify YouTube Shorts URLs", () => {
      const result = analyzeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ");
      expect(result).toEqual({
        type: "youtube",
        isValid: true,
        url: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        normalizedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
      });
    });

    it("should correctly identify YouTube embed URLs", () => {
      const result = analyzeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
      expect(result).toEqual({
        type: "youtube",
        isValid: true,
        url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        normalizedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
      });
    });

    it("should correctly identify YouTube live URLs", () => {
      const result = analyzeUrl("https://www.youtube.com/live/dQw4w9WgXcQ");
      expect(result).toEqual({
        type: "youtube",
        isValid: true,
        url: "https://www.youtube.com/live/dQw4w9WgXcQ",
        normalizedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
      });
    });
  });

  describe("TikTok URLs", () => {
    it("should correctly identify long TikTok URLs with video ID", () => {
      const result = analyzeUrl("https://www.tiktok.com/@user/video/1234567890123456789");
      expect(result).toEqual({
        type: "tiktok",
        isValid: true,
        url: "https://www.tiktok.com/@user/video/1234567890123456789",
        normalizedUrl: "https://www.tiktok.com/@user/video/1234567890123456789",
        postId: "1234567890123456789",
      });
    });

    it("should correctly identify vm.tiktok URLs", () => {
      const result = analyzeUrl("https://vm.tiktok.com/ZMxxxxxxx/");
      expect(result).toEqual({
        type: "tiktok",
        isValid: true,
        url: "https://vm.tiktok.com/ZMxxxxxxx/",
        normalizedUrl: "https://vm.tiktok.com/ZMxxxxxxx/",
        postId: undefined,
      });
    });

    it("should correctly identify vt.tiktok URLs", () => {
      const result = analyzeUrl("https://vt.tiktok.com/ZSxxxxxxx/");
      expect(result).toEqual({
        type: "tiktok",
        isValid: true,
        url: "https://vt.tiktok.com/ZSxxxxxxx/",
        normalizedUrl: "https://vt.tiktok.com/ZSxxxxxxx/",
        postId: undefined,
      });
    });

    it("should correctly identify tiktok.com/t/ URLs", () => {
      const result = analyzeUrl("https://www.tiktok.com/t/ZTxxxxxxx/");
      expect(result).toEqual({
        type: "tiktok",
        isValid: true,
        url: "https://www.tiktok.com/t/ZTxxxxxxx/",
        normalizedUrl: "https://www.tiktok.com/t/ZTxxxxxxx/",
        postId: undefined,
      });
    });
  });

  describe("Instagram URLs", () => {
    it("should correctly identify Instagram post URLs", () => {
      const result = analyzeUrl("https://www.instagram.com/p/C1234567890/");
      expect(result).toEqual({
        type: "instagram",
        isValid: true,
        url: "https://www.instagram.com/p/C1234567890/",
        normalizedUrl: "https://www.instagram.com/p/C1234567890/",
        postId: "C1234567890",
      });
    });

    it("should correctly identify Instagram reel URLs", () => {
      const result = analyzeUrl("https://www.instagram.com/reel/C1234567890/");
      expect(result).toEqual({
        type: "instagram",
        isValid: true,
        url: "https://www.instagram.com/reel/C1234567890/",
        normalizedUrl: "https://www.instagram.com/reel/C1234567890/",
        postId: "C1234567890",
      });
    });

    it("should correctly identify Instagram reels URLs", () => {
      const result = analyzeUrl("https://www.instagram.com/reels/C1234567890/");
      expect(result).toEqual({
        type: "instagram",
        isValid: true,
        url: "https://www.instagram.com/reels/C1234567890/",
        normalizedUrl: "https://www.instagram.com/reels/C1234567890/",
        postId: "C1234567890",
      });
    });

    it("should correctly identify instagr.am short URLs", () => {
      const result = analyzeUrl("https://instagr.am/p/C1234567890/");
      expect(result).toEqual({
        type: "instagram",
        isValid: true,
        url: "https://instagr.am/p/C1234567890/",
        normalizedUrl: "https://instagr.am/p/C1234567890/",
        postId: "C1234567890",
      });
    });
  });

  describe("Website URLs", () => {
    it("should correctly identify standard website URLs", () => {
      const result = analyzeUrl("https://www.allrecipes.com/recipe/12345/best-recipe/");
      expect(result).toEqual({
        type: "website",
        isValid: true,
        url: "https://www.allrecipes.com/recipe/12345/best-recipe/",
        normalizedUrl: "https://www.allrecipes.com/recipe/12345/best-recipe/",
        domain: "allrecipes.com",
      });
    });

    it("should correctly identify website URLs without www", () => {
      const result = analyzeUrl("https://budgetbytes.com/recipe-name/");
      expect(result).toEqual({
        type: "website",
        isValid: true,
        url: "https://budgetbytes.com/recipe-name/",
        normalizedUrl: "https://budgetbytes.com/recipe-name/",
        domain: "budgetbytes.com",
      });
    });

    it("should correctly identify website URLs with subdomains", () => {
      const result = analyzeUrl("https://blog.example.com/recipe/");
      expect(result).toEqual({
        type: "website",
        isValid: true,
        url: "https://blog.example.com/recipe/",
        normalizedUrl: "https://blog.example.com/recipe/",
        domain: "blog.example.com",
      });
    });

    it("should correctly identify http website URLs", () => {
      const result = analyzeUrl("http://example.com/recipe/");
      expect(result).toEqual({
        type: "website",
        isValid: true,
        url: "http://example.com/recipe/",
        normalizedUrl: "http://example.com/recipe/",
        domain: "example.com",
      });
    });
  });

  describe("Invalid/Unknown URLs", () => {
    it("should return unknown for invalid URLs", () => {
      const result = analyzeUrl("not a url");
      expect(result).toEqual({
        type: "unknown",
        isValid: false,
        url: "not a url",
        normalizedUrl: "not a url",
      });
    });

    it("should return unknown for empty strings", () => {
      const result = analyzeUrl("");
      expect(result).toEqual({
        type: "unknown",
        isValid: false,
        url: "",
        normalizedUrl: "",
      });
    });

    it("should return unknown for whitespace-only strings", () => {
      const result = analyzeUrl("   ");
      expect(result).toEqual({
        type: "unknown",
        isValid: false,
        url: "",
        normalizedUrl: "",
      });
    });

    it("should return unknown for non-http/https protocols", () => {
      const result = analyzeUrl("ftp://example.com/recipe");
      expect(result).toEqual({
        type: "unknown",
        isValid: false,
        url: "ftp://example.com/recipe",
        normalizedUrl: "ftp://example.com/recipe",
      });
    });

    it("should trim whitespace around valid URLs", () => {
      const result = analyzeUrl("  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ");
      expect(result).toEqual({
        type: "youtube",
        isValid: true,
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        normalizedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
      });
    });
  });
});
