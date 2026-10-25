import { readRecipeVideoCoverFrames } from "../recipe-video-cover.native";
jest.mock("~/utils/logger", () => ({ log: { debug: jest.fn() } }));
const sample = jest.fn();
const moduleMock = jest.fn(() => ({ sampleVideoCoverFrames: sample }));
jest.mock("expo", () => ({ requireOptionalNativeModule: () => moduleMock() }));
beforeEach(() => jest.clearAllMocks());
it("reads bounded decoded frames from the public player and requests TikTok's embedded player", async () => {
  sample.mockResolvedValueOnce({
    frames: JSON.stringify([
      { timestamp: 1, mimeType: "image/jpeg", data: "YWJj" },
      { timestamp: 2, mimeType: "image/jpeg", data: "<html>" },
    ]),
  });
  expect(
    await readRecipeVideoCoverFrames("https://www.tiktok.com/@chef/video/7538296153562008840")
  ).toEqual([{ timestamp: 1, mimeType: "image/jpeg", data: "YWJj" }]);
  expect(sample.mock.calls[0]?.[0]).toBe(
    "https://www.tiktok.com/player/v1/7538296153562008840?autoplay=1&muted=1&controls=0"
  );
  expect(sample.mock.calls[0]?.[1]).toContain("drawImage(video");
});
it("never opens an untrusted URL", async () => {
  expect(await readRecipeVideoCoverFrames("https://attacker.test/video")).toEqual([]);
  expect(sample).not.toHaveBeenCalled();
});
it("bounds native messages and respects cancellation before sampling", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    readRecipeVideoCoverFrames("https://vt.tiktok.com/ZSguquYyJ/", { signal: controller.signal })
  ).rejects.toThrow();
  expect(sample).not.toHaveBeenCalled();
});
