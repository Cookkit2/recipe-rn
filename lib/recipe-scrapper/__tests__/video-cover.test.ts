import vm from "node:vm";
import { selectRecipeVideoCover, videoCoverFramesScript } from "../shared/video-cover";
import { generateAIContent } from "~/lib/ai/client";
jest.mock("~/lib/ai/client", () => ({ generateAIContent: jest.fn() }));
const generate = jest.mocked(generateAIContent);
beforeEach(() => jest.resetAllMocks());
it("saves the actual finished-food frame chosen by vision, rather than the final portrait", async () => {
  const frames = [
    { timestamp: 1, mimeType: "image/jpeg" as const, data: "YWJj" },
    { timestamp: 15, mimeType: "image/jpeg" as const, data: "ZGVm" },
  ];
  generate.mockResolvedValueOnce('{"frameIndex":0}');
  expect(await selectRecipeVideoCover(frames)).toBe("data:image/jpeg;base64,YWJj");
  expect(generate.mock.calls[0]?.[0].images).toHaveLength(2);
  expect(generate.mock.calls[0]?.[0].prompt).toContain("whole prepared dish");
});
it("leaves the cover unset when no actual frame shows a suitable finished dish", async () => {
  generate.mockResolvedValueOnce('{"frameIndex":-1}');
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
