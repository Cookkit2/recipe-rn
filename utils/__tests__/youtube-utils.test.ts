import { extractYouTubeVideoId } from "../youtube-utils";

describe("YouTube Utils - extractYouTubeVideoId", () => {
  const VIDEO_ID = "dQw4w9WgXcQ";

  it("should extract video ID from standard watch URLs", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(extractYouTubeVideoId(`https://youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(extractYouTubeVideoId(`http://www.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("should extract video ID from short URLs", () => {
    expect(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(extractYouTubeVideoId(`http://youtu.be/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("should extract video ID from embed URLs", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("should extract video ID from old embed URLs", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/v/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("should extract video ID from Shorts URLs", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("should extract video ID from Live URLs", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/live/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("should extract video ID from mobile URLs", () => {
    expect(extractYouTubeVideoId(`https://m.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("should extract video ID from URLs with additional query parameters", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}&t=42s`)).toBe(
      VIDEO_ID
    );
    expect(
      extractYouTubeVideoId(`https://www.youtube.com/watch?list=PL_foo&v=${VIDEO_ID}&t=42s`)
    ).toBe(VIDEO_ID);
    expect(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}?t=42s`)).toBe(VIDEO_ID);
  });

  it("should handle whitespace in URLs", () => {
    expect(extractYouTubeVideoId(`  https://www.youtube.com/watch?v=${VIDEO_ID}  `)).toBe(VIDEO_ID);
    expect(extractYouTubeVideoId(`\nhttps://youtu.be/${VIDEO_ID}\t`)).toBe(VIDEO_ID);
  });

  it("should return null for invalid or empty inputs", () => {
    // @ts-ignore - Testing invalid types
    expect(extractYouTubeVideoId(null)).toBeNull();
    // @ts-ignore - Testing invalid types
    expect(extractYouTubeVideoId(undefined)).toBeNull();
    expect(extractYouTubeVideoId("")).toBeNull();
    expect(extractYouTubeVideoId("   ")).toBeNull();
    // @ts-ignore - Testing invalid types
    expect(extractYouTubeVideoId(123)).toBeNull();
    // @ts-ignore - Testing invalid types
    expect(extractYouTubeVideoId({})).toBeNull();
  });

  it("should return null for non-YouTube URLs", () => {
    expect(extractYouTubeVideoId("https://vimeo.com/123456")).toBeNull();
    expect(extractYouTubeVideoId("https://www.google.com")).toBeNull();
    expect(extractYouTubeVideoId("just some random text")).toBeNull();
  });

  it("should return null for URLs with invalid video IDs", () => {
    // Video IDs are always 11 characters
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=tooshort")).toBeNull();
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=waytoolongvideo")).toBeNull();
    // Valid 11 chars but contains invalid characters like $ or %
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9Wg$cQ")).toBeNull();
  });
});
