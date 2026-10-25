import {
  isAllowedVideoMediaUrl,
  normalizeVideoPostUrl,
  videoResolverScript,
} from "../shared/video-source";
import { runInNewContext } from "node:vm";

function resolvePage(scope: string, itemId = "7538296153562008840") {
  const postMessage = jest.fn();
  const item = {
    id: itemId,
    desc: "Egg 5, water 375 ml. Steam for 15 minutes.",
    video: { playAddr: "https://v16-webapp-prime.tiktok.com/video/example.mp4" },
  };
  runInNewContext(videoResolverScript(), {
    window: { webkit: { messageHandlers: { cookkitVideo: { postMessage } } } },
    document: {
      title: "TikTok · teefoodd",
      getElementById: (id: string) =>
        id === "__UNIVERSAL_DATA_FOR_REHYDRATION__"
          ? {
              textContent: JSON.stringify({
                __DEFAULT_SCOPE__: { [scope]: { itemInfo: { itemStruct: item } } },
              }),
            }
          : null,
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    location: { href: "https://www.tiktok.com/@teefoodd/video/7538296153562008840" },
    navigator: { userAgent: "iPhone Safari" },
    URL,
    setInterval: () => 0,
    setTimeout: () => 0,
    clearInterval: () => {},
  });
  return postMessage;
}

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
  it.each(["webapp.video-detail", "webapp.reflow.video.detail"])(
    "resolves the selected TikTok video from %s metadata",
    (scope) => {
      const send = resolvePage(scope);
      expect(send).toHaveBeenCalledTimes(1);
      expect(JSON.parse(send.mock.calls[0]![0])).toEqual(
        expect.objectContaining({
          mediaUrl: "https://v16-webapp-prime.tiktok.com/video/example.mp4",
          caption: "Egg 5, water 375 ml. Steam for 15 minutes.",
        })
      );
    }
  );
  it("does not resolve metadata for a different TikTok video", () => {
    expect(resolvePage("webapp.reflow.video.detail", "1111111111111111111")).not.toHaveBeenCalled();
  });
});

it("resolves the reported Instagram reel when the player uses a blob URL", () => {
  const postMessage = jest.fn();
  const media = {
    code: "Db18zFIR5k-",
    caption: { text: "Easy summer drink idea! - peach oolong" },
    video_versions: [
      { type: 101, url: "https://instagram.example.fna.fbcdn.net/peach.mp4?signature=abc" },
    ],
  };
  const script = {
    textContent: JSON.stringify({
      require: [
        [
          "ScheduledServerJS",
          "handle",
          null,
          [
            {
              __bbox: {
                require: [
                  [
                    "RelayPrefetchedStreamCache",
                    "next",
                    [],
                    [
                      "query",
                      {
                        __bbox: {
                          result: {
                            data: {
                              xig_polaris_media: {
                                code: "Db18zFIR5k-",
                                if_not_gated_logged_out: media,
                              },
                            },
                          },
                        },
                      },
                    ],
                  ],
                ],
              },
            },
          ],
        ],
      ],
    }),
  };
  runInNewContext(videoResolverScript(), {
    window: { webkit: { messageHandlers: { cookkitVideo: { postMessage } } } },
    document: {
      title: "Peach oolong",
      getElementById: () => null,
      querySelector: (selector: string) =>
        selector === "video"
          ? {
              currentSrc: "blob:https://www.instagram.com/abc",
              muted: false,
              play: () => Promise.resolve(),
            }
          : null,
      querySelectorAll: (selector: string) =>
        selector.includes("application/json") ? [script] : [],
    },
    location: { href: "https://www.instagram.com/reel/Db18zFIR5k-/" },
    navigator: { userAgent: "iPhone Safari" },
    URL,
    setInterval: () => 0,
    setTimeout: () => 0,
    clearInterval: () => {},
  });
  expect(postMessage).toHaveBeenCalledTimes(1);
  expect(JSON.parse(postMessage.mock.calls[0]![0])).toMatchObject({
    mediaUrl: media.video_versions[0]!.url,
    caption: media.caption.text,
  });
});
