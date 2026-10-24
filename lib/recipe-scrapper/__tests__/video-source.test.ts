import {
  isAllowedVideoMediaUrl,
  normalizeVideoPostUrl,
  videoResolverScript,
} from "../shared/video-source";

describe("on-device social video sources", () => {
  it("accepts the reported TikTok and strips tracking from Instagram posts", () => {
    expect(normalizeVideoPostUrl("https://vt.tiktok.com/ZSgH2hh7B/")).toBe(
      "https://vt.tiktok.com/ZSgH2hh7B/"
    );
    expect(normalizeVideoPostUrl("https://www.instagram.com/reel/abc/?igsh=test")).toBe(
      "https://www.instagram.com/reel/abc/"
    );
  });
  it.each([
    "https://www.tiktok.com.attacker.test/@a/video/123",
    "https://www.tiktok.com@127.0.0.1/a",
    "http://vt.tiktok.com/abcd/",
    "https://www.instagram.com/accounts/login/",
    "https://www.tiktok.com:8443/@a/video/123",
  ])("rejects unsupported post URL %s", (value) => {
    expect(normalizeVideoPostUrl(value)).toBeUndefined();
  });
  it.each([
    "blob:https://www.tiktok.com/abc",
    "http://video.tiktok.com/a.mp4",
    "https://cdninstagram.com.attacker.test/a.mp4",
    "https://127.0.0.1/a.mp4",
    "https://user:secret@video.tiktok.com/a.mp4",
  ])("never downloads untrusted media %s", (value) =>
    expect(isAllowedVideoMediaUrl(value)).toBe(false)
  );
  it("allows signed platform CDN streams", () => {
    expect(
      isAllowedVideoMediaUrl(
        "https://v16-webapp-prime.tiktok.com/video/tos/example/?mime_type=video_mp4&signature=abc"
      )
    ).toBe(true);
    expect(isAllowedVideoMediaUrl("https://scontent.cdninstagram.com/a.mp4")).toBe(true);
  });
  it("emits valid JavaScript without embedding credentials", () => {
    expect(() => new Function(videoResolverScript())).not.toThrow();
    expect(videoResolverScript()).not.toMatch(/cookie|NEBIUS|Authorization/);
  });
});
