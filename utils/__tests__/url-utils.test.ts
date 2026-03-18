import { describe, it, expect, jest } from "@jest/globals";
import {
  isValidTikTokUrl,
  isValidInstagramUrl,
  extractTikTokVideoId,
  extractInstagramPostId,
  extractDomain,
  isValidHttpUrl,
  analyzeUrl,
  isKnownRecipeDomain,
  getUrlSourceName,
} from "../url-utils";
import * as youtubeUtils from "../youtube-utils";

// Mock youtube-utils for analyzeUrl tests since it's an external dependency of url-utils
jest.mock("../youtube-utils", () => ({
  extractYouTubeVideoId: jest.fn(),
}));

describe("url-utils", () => {
  describe("isValidTikTokUrl", () => {
    it("should return true for valid TikTok URLs", () => {
      expect(isValidTikTokUrl("https://www.tiktok.com/@user/video/1234567890")).toBe(true);
      expect(isValidTikTokUrl("http://tiktok.com/@some.user-name/video/987654321")).toBe(true);
      expect(isValidTikTokUrl("https://vm.tiktok.com/ZMdoRqPXY/")).toBe(true);
      expect(isValidTikTokUrl("https://vt.tiktok.com/ZSdoRqPXY/")).toBe(true);
      expect(isValidTikTokUrl("https://www.tiktok.com/t/ZT8Jxyz123/")).toBe(true);
    });

    it("should return false for invalid TikTok URLs", () => {
      expect(isValidTikTokUrl("https://www.tiktok.com/@user")).toBe(false); // missing video id
      expect(isValidTikTokUrl("https://www.youtube.com/watch?v=123")).toBe(false);
      expect(isValidTikTokUrl("not a url")).toBe(false);
      expect(isValidTikTokUrl("")).toBe(false);
    });
  });

  describe("isValidInstagramUrl", () => {
    it("should return true for valid Instagram URLs", () => {
      expect(isValidInstagramUrl("https://www.instagram.com/p/ABCdef123/")).toBe(true);
      expect(isValidInstagramUrl("http://instagram.com/reel/XYZ987")).toBe(true);
      expect(isValidInstagramUrl("https://www.instagram.com/reels/XYZ987/")).toBe(true);
      expect(isValidInstagramUrl("https://instagr.am/p/ABCdef123/")).toBe(true);
    });

    it("should return false for invalid Instagram URLs", () => {
      expect(isValidInstagramUrl("https://www.instagram.com/username/")).toBe(false); // missing post id
      expect(isValidInstagramUrl("https://www.youtube.com/watch?v=123")).toBe(false);
      expect(isValidInstagramUrl("not a url")).toBe(false);
      expect(isValidInstagramUrl("")).toBe(false);
    });
  });

  describe("extractTikTokVideoId", () => {
    it("should extract the video ID from standard TikTok URLs", () => {
      expect(extractTikTokVideoId("https://www.tiktok.com/@user/video/1234567890")).toBe(
        "1234567890"
      );
      expect(extractTikTokVideoId("http://tiktok.com/@some.user/video/987654321")).toBe(
        "987654321"
      );
    });

    it("should return null for short URLs without a direct video ID in the path", () => {
      // Note: extractTikTokVideoId only looks for /video/(\d+)
      expect(extractTikTokVideoId("https://vm.tiktok.com/ZMdoRqPXY/")).toBe(null);
    });

    it("should return null for invalid URLs", () => {
      expect(extractTikTokVideoId("https://www.instagram.com/p/123")).toBe(null);
      expect(extractTikTokVideoId("")).toBe(null);
    });
  });

  describe("extractInstagramPostId", () => {
    it("should extract the post ID from valid Instagram URLs", () => {
      expect(extractInstagramPostId("https://www.instagram.com/p/ABCdef123/")).toBe("ABCdef123");
      expect(extractInstagramPostId("http://instagram.com/reel/XYZ_987")).toBe("XYZ_987");
      expect(extractInstagramPostId("https://www.instagram.com/reels/XYZ-987/")).toBe("XYZ-987");
    });

    it("should return null for invalid URLs", () => {
      expect(extractInstagramPostId("https://www.instagram.com/username")).toBe(null);
      expect(extractInstagramPostId("")).toBe(null);
    });
  });

  describe("extractDomain", () => {
    it("should extract the domain from valid URLs", () => {
      expect(extractDomain("https://www.example.com/path")).toBe("example.com"); // strips www.
      expect(extractDomain("http://sub.example.com")).toBe("sub.example.com");
      expect(extractDomain("https://example.com")).toBe("example.com");
    });

    it("should return null for invalid URLs", () => {
      expect(extractDomain("not a url")).toBe(null);
      expect(extractDomain("")).toBe(null);
    });
  });

  describe("isValidHttpUrl", () => {
    it("should return true for valid HTTP/HTTPS URLs", () => {
      expect(isValidHttpUrl("http://example.com")).toBe(true);
      expect(isValidHttpUrl("https://example.com")).toBe(true);
      expect(isValidHttpUrl("https://www.example.com/path?query=1")).toBe(true);
    });

    it("should return false for invalid URLs or non-HTTP protocols", () => {
      expect(isValidHttpUrl("ftp://example.com")).toBe(false);
      expect(isValidHttpUrl("mailto:user@example.com")).toBe(false);
      expect(isValidHttpUrl("not a url")).toBe(false);
      expect(isValidHttpUrl("")).toBe(false);
    });
  });

  describe("analyzeUrl", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should correctly identify YouTube URLs", () => {
      (youtubeUtils.extractYouTubeVideoId as jest.Mock).mockReturnValue("yt123");

      const result = analyzeUrl("https://youtube.com/watch?v=yt123");

      expect(result).toEqual({
        type: "youtube",
        isValid: true,
        url: "https://youtube.com/watch?v=yt123",
        normalizedUrl: "https://www.youtube.com/watch?v=yt123",
        videoId: "yt123",
      });
      expect(youtubeUtils.extractYouTubeVideoId).toHaveBeenCalledWith(
        "https://youtube.com/watch?v=yt123"
      );
    });

    it("should correctly identify TikTok URLs", () => {
      (youtubeUtils.extractYouTubeVideoId as jest.Mock).mockReturnValue(null);

      const result = analyzeUrl("https://www.tiktok.com/@user/video/12345");

      expect(result).toEqual({
        type: "tiktok",
        isValid: true,
        url: "https://www.tiktok.com/@user/video/12345",
        normalizedUrl: "https://www.tiktok.com/@user/video/12345",
        postId: "12345",
      });
    });

    it("should correctly identify short TikTok URLs without postId", () => {
      (youtubeUtils.extractYouTubeVideoId as jest.Mock).mockReturnValue(null);

      const result = analyzeUrl("https://vm.tiktok.com/ZMdoRqPXY/");

      expect(result).toEqual({
        type: "tiktok",
        isValid: true,
        url: "https://vm.tiktok.com/ZMdoRqPXY/",
        normalizedUrl: "https://vm.tiktok.com/ZMdoRqPXY/",
        postId: undefined,
      });
    });

    it("should correctly identify Instagram URLs", () => {
      (youtubeUtils.extractYouTubeVideoId as jest.Mock).mockReturnValue(null);

      const result = analyzeUrl("https://www.instagram.com/p/ABC/");

      expect(result).toEqual({
        type: "instagram",
        isValid: true,
        url: "https://www.instagram.com/p/ABC/",
        normalizedUrl: "https://www.instagram.com/p/ABC/",
        postId: "ABC",
      });
    });

    it("should correctly identify generic website URLs", () => {
      (youtubeUtils.extractYouTubeVideoId as jest.Mock).mockReturnValue(null);

      const result = analyzeUrl("https://www.allrecipes.com/recipe/123/test/");

      expect(result).toEqual({
        type: "website",
        isValid: true,
        url: "https://www.allrecipes.com/recipe/123/test/",
        normalizedUrl: "https://www.allrecipes.com/recipe/123/test/",
        domain: "allrecipes.com",
      });
    });

    it("should correctly identify unknown/invalid URLs", () => {
      (youtubeUtils.extractYouTubeVideoId as jest.Mock).mockReturnValue(null);

      const result = analyzeUrl("not a real url");

      expect(result).toEqual({
        type: "unknown",
        isValid: false,
        url: "not a real url",
        normalizedUrl: "not a real url",
      });
    });

    it("should trim the input URL before analysis", () => {
      (youtubeUtils.extractYouTubeVideoId as jest.Mock).mockReturnValue(null);

      const result = analyzeUrl("  https://example.com  ");

      expect(result.url).toBe("https://example.com");
      expect(result.type).toBe("website");
    });
  });

  describe("isKnownRecipeDomain", () => {
    it("should return true for known recipe domains", () => {
      expect(isKnownRecipeDomain("allrecipes.com")).toBe(true);
      expect(isKnownRecipeDomain("www.foodnetwork.com")).toBe(true);
      expect(isKnownRecipeDomain("sub.epicurious.com")).toBe(true);
      expect(isKnownRecipeDomain("BBCGOODFOOD.COM")).toBe(true);
    });

    it("should return false for unknown domains", () => {
      expect(isKnownRecipeDomain("example.com")).toBe(false);
      expect(isKnownRecipeDomain("google.com")).toBe(false);
      expect(isKnownRecipeDomain("notadomain")).toBe(false);
    });
  });

  describe("getUrlSourceName", () => {
    it("should return appropriate names based on analysis type", () => {
      expect(getUrlSourceName({ type: "youtube", isValid: true, url: "", normalizedUrl: "" })).toBe(
        "YouTube"
      );
      expect(getUrlSourceName({ type: "tiktok", isValid: true, url: "", normalizedUrl: "" })).toBe(
        "TikTok"
      );
      expect(
        getUrlSourceName({ type: "instagram", isValid: true, url: "", normalizedUrl: "" })
      ).toBe("Instagram");

      expect(
        getUrlSourceName({
          type: "website",
          isValid: true,
          url: "",
          normalizedUrl: "",
          domain: "example.com",
        })
      ).toBe("example.com");

      // Fallback for website without domain
      expect(getUrlSourceName({ type: "website", isValid: true, url: "", normalizedUrl: "" })).toBe(
        "Website"
      );

      expect(
        getUrlSourceName({ type: "unknown", isValid: false, url: "", normalizedUrl: "" })
      ).toBe("Unknown");
    });
  });
});
