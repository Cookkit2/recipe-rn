/**
 * URL detection for social-video recipe import (TikTok + Instagram).
 *
 * These tests exercise the REAL url-utils.ts (no mocks) so they verify the
 * detection patterns the import router relies on via analyzeUrl(). Per the
 * issue spec (#747), import must recognise TikTok and Instagram URLs in
 * addition to the existing YouTube + website support.
 */
import {
  analyzeUrl,
  isValidTikTokUrl,
  isValidInstagramUrl,
  extractTikTokVideoId,
  extractInstagramPostId,
  getUrlSourceName,
} from "../url-utils";

describe("TikTok URL detection", () => {
  it.each([
    "https://www.tiktok.com/@chef/video/7300000000000000000",
    "https://tiktok.com/@some.user/video/1234567890",
    "https://vm.tiktok.com/ZMhabcdef/",
    "https://vt.tiktok.com/ZSabcd1234",
    "https://www.tiktok.com/t/abcdEFG-/",
  ])("recognises valid TikTok URL: %s", (url) => {
    expect(isValidTikTokUrl(url)).toBe(true);
  });

  it("rejects non-TikTok URLs", () => {
    expect(isValidTikTokUrl("https://youtube.com/watch?v=abc")).toBe(false);
    expect(isValidTikTokUrl("https://example.com/tiktok")).toBe(false);
    expect(isValidTikTokUrl("not a url")).toBe(false);
  });

  it("extracts the video id from canonical @user/video URLs", () => {
    expect(extractTikTokVideoId("https://www.tiktok.com/@chef/video/7300000000000000000")).toBe(
      "7300000000000000000"
    );
  });

  it("returns null for short-link URLs that have no numeric video id", () => {
    expect(extractTikTokVideoId("https://vm.tiktok.com/ZMhabcdef/")).toBeNull();
  });
});

describe("Instagram URL detection", () => {
  it.each([
    "https://www.instagram.com/p/Cabc123_-/",
    "https://instagram.com/reel/Cdef456/",
    "https://www.instagram.com/reels/Cghi789xyz/",
    "https://instagr.am/p/Cjkl012/",
  ])("recognises valid Instagram URL: %s", (url) => {
    expect(isValidInstagramUrl(url)).toBe(true);
  });

  it("rejects non-Instagram URLs", () => {
    expect(isValidInstagramUrl("https://youtube.com/watch?v=abc")).toBe(false);
    expect(isValidInstagramUrl("https://example.com/p/abc")).toBe(false);
    expect(isValidInstagramUrl("not a url")).toBe(false);
  });

  it.each([
    ["https://www.instagram.com/p/Cabc123_-/", "Cabc123_-"],
    ["https://www.instagram.com/reel/Cdef456/", "Cdef456"],
    ["https://www.instagram.com/reels/Cghi789xyz/", "Cghi789xyz"],
  ])("extracts post/reel id from %s", (url, expected) => {
    expect(extractInstagramPostId(url)).toBe(expected);
  });
});

describe("analyzeUrl routing for social-video URLs", () => {
  it("classifies TikTok URLs as the tiktok type with a postId when available", () => {
    const result = analyzeUrl("https://www.tiktok.com/@chef/video/7300000000000000000");
    expect(result.type).toBe("tiktok");
    expect(result.isValid).toBe(true);
    expect(result.postId).toBe("7300000000000000000");
    expect(result.normalizedUrl).toBeTruthy();
  });

  it("classifies Instagram reel URLs as the instagram type", () => {
    const result = analyzeUrl("https://www.instagram.com/reel/Cdef456/");
    expect(result.type).toBe("instagram");
    expect(result.isValid).toBe(true);
    expect(result.postId).toBe("Cdef456");
  });

  it("still classifies YouTube and website URLs alongside the new social types", () => {
    expect(analyzeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ").type).toBe("youtube");
    expect(analyzeUrl("https://www.allrecipes.com/recipe/123").type).toBe("website");
  });

  it("flags garbage input as unknown/invalid", () => {
    const result = analyzeUrl("just some text");
    expect(result.type).toBe("unknown");
    expect(result.isValid).toBe(false);
  });
});

describe("getUrlSourceName for social platforms", () => {
  it("returns friendly platform names", () => {
    expect(getUrlSourceName({ type: "tiktok", isValid: true, url: "", normalizedUrl: "" })).toBe(
      "TikTok"
    );
    expect(getUrlSourceName({ type: "instagram", isValid: true, url: "", normalizedUrl: "" })).toBe(
      "Instagram"
    );
    expect(getUrlSourceName({ type: "youtube", isValid: true, url: "", normalizedUrl: "" })).toBe(
      "YouTube"
    );
  });
});
