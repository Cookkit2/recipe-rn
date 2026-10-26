import vm from "node:vm";
import { selectRecipeVideoCover, videoCoverFramesScript } from "../shared/video-cover";
import { generateAIContent } from "~/lib/ai/client";
jest.mock("~/lib/ai/client", () => ({ generateAIContent: jest.fn() }));
const generate = jest.mocked(generateAIContent);
beforeEach(() => jest.resetAllMocks());
it("saves the actual finished-food frame chosen by vision, rather than the final portrait", async () => {
  const frames = [
    { timestamp: 1, mimeType: "image/jpeg" as const, data: "YWJj" },
    { timestamp: 2, mimeType: "image/jpeg" as const, data: "ZGVm" },
    { timestamp: 3, mimeType: "image/jpeg" as const, data: "Z2hp" },
  ];
  generate.mockResolvedValueOnce('{"frameNumber":2}');
  expect(await selectRecipeVideoCover(frames)).toBe("data:image/jpeg;base64,ZGVm");
  expect(generate.mock.calls[0]?.[0].images).toHaveLength(3);
  expect(generate.mock.calls[0]?.[0].prompt).toContain("whole prepared dish");
});
it("leaves the cover unset when no actual frame shows a suitable finished dish", async () => {
  generate.mockResolvedValueOnce('{"frameNumber":0}');
  expect(
    await selectRecipeVideoCover([{ timestamp: 1, mimeType: "image/jpeg", data: "YWJj" }])
  ).toBeUndefined();
});
it("ignores missing, malformed and oversized frame data", async () => {
  expect(await selectRecipeVideoCover([])).toBeUndefined();
  expect(
    await selectRecipeVideoCover([
      { timestamp: 1, mimeType: "image/jpeg", data: "x".repeat(180001) },
    ])
  ).toBeUndefined();
  expect(
    await selectRecipeVideoCover([{ timestamp: 1, mimeType: "image/jpeg", data: "<script>" }])
  ).toBeUndefined();
  expect(generate).not.toHaveBeenCalled();
});
it("automatically seeks and captures six decoded frames from the public player", async () => {
  let tick: () => Promise<void> = async () => {};
  const postMessage = jest.fn();
  const ready = new Set<() => void>();
  const video = {
    crossOrigin: "anonymous",
    duration: 18,
    readyState: 2,
    videoWidth: 720,
    videoHeight: 1280,
    pause: jest.fn(),
    muted: false,
    addEventListener: (_name: string, callback: () => void) => ready.add(callback),
    removeEventListener: (_name: string, callback: () => void) => ready.delete(callback),
  };
  let time = 0;
  Object.defineProperty(video, "currentTime", {
    get: () => time,
    set: (value: number) => {
      time = value;
      for (const callback of ready) {
        ready.delete(callback);
        callback();
      }
    },
  });
  const drawImage = jest.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage }),
    toDataURL: () => "data:image/jpeg;base64," + Buffer.from("frame:" + time).toString("base64"),
  };
  vm.runInNewContext(videoCoverFramesScript(), {
    window: { webkit: { messageHandlers: { cookkitVideo: { postMessage } } } },
    location: { hostname: "www.tiktok.com", pathname: "/player/v1/7538296153562008840" },
    document: { querySelector: () => video, createElement: () => canvas },
    setInterval: (callback: () => Promise<void>) => {
      tick = callback;
      return 1;
    },
    clearInterval: jest.fn(),
    setTimeout: jest.fn(),
    clearTimeout: jest.fn(),
    Date,
  });
  await tick();
  const frames = JSON.parse(JSON.parse(postMessage.mock.calls[0]?.[0]).frames);
  expect(drawImage).toHaveBeenCalledTimes(6);
  expect(frames.map((frame: { timestamp: number }) => frame.timestamp)).toEqual([
    0.18, 1.08, 2.88, 7.2, 12.6, 16.2,
  ]);
  expect(new Set(frames.map((frame: { data: string }) => frame.data)).size).toBe(6);
});

it("continues a resolved TikTok short link in the same post's public player", () => {
  const replace = jest.fn();
  const setInterval = jest.fn();
  vm.runInNewContext(videoCoverFramesScript(), {
    window: {},
    location: { hostname: "www.tiktok.com", pathname: "/@chef/video/7538296153562008840", replace },
    setInterval,
  });
  expect(replace).toHaveBeenCalledWith(
    "https://www.tiktok.com/player/v1/7538296153562008840?autoplay=1&muted=1&controls=0"
  );
  expect(setInterval).not.toHaveBeenCalled();
});

it("captures only the selected YouTube video's own caption response before the player loads", async () => {
  let tick: () => Promise<void> = async () => {};
  let clock = 0;
  const postMessage = jest.fn();
  const request = async (url: string) => ({
    url,
    clone: () => ({
      text: async () =>
        JSON.stringify({ events: [{ segs: [{ utf8: "Cook the chicken for 9 minutes." }] }] }),
    }),
  });
  const browser = {
    fetch: request,
    webkit: { messageHandlers: { cookkitVideo: { postMessage } } },
  };
  vm.runInNewContext(videoCoverFramesScript({ youtubeVideoId: "-Ksv82YLW-A" }), {
    window: browser,
    URL,
    location: {
      href: "https://www.youtube.com/embed/-Ksv82YLW-A",
      hostname: "www.youtube.com",
      pathname: "/embed/-Ksv82YLW-A",
    },
    document: {
      querySelector: () => null,
      getElementById: () => ({ getVideoData: () => ({ video_id: "-Ksv82YLW-A" }) }),
    },
    setInterval: (callback: () => Promise<void>) => {
      tick = callback;
      return 1;
    },
    clearInterval: jest.fn(),
    Date: { now: () => clock },
  });
  await browser.fetch("https://attacker.test/api/timedtext?v=-Ksv82YLW-A");
  await browser.fetch("https://www.youtube.com/api/timedtext?v=other-video");
  clock = 14000;
  await tick();
  expect(JSON.parse(postMessage.mock.calls[0]?.[0]).transcript).toBe("");
  await browser.fetch("https://www.youtube.com/api/timedtext?v=-Ksv82YLW-A&fmt=json3");
  await tick();
  expect(JSON.parse(postMessage.mock.calls[1]?.[0]).transcript).toBe(
    "Cook the chicken for 9 minutes."
  );
});
