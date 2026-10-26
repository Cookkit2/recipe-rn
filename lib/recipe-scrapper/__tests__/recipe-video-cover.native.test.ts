import { readRecipePlayerEvidence, readRecipeVideoCoverFrames } from "../recipe-video-cover.native";
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
it("samples the selected YouTube player rather than its publisher thumbnail", async () => {
  sample.mockResolvedValueOnce({
    frames: JSON.stringify([{ timestamp: 20, mimeType: "image/jpeg", data: "YWJj" }]),
  });
  expect(await readRecipeVideoCoverFrames("https://youtu.be/abcdef12345?si=tracking")).toHaveLength(
    1
  );
  expect(sample.mock.calls[0]?.[0]).toBe(
    "https://www.youtube.com/embed/abcdef12345?autoplay=1&mute=1&controls=0&playsinline=1&cc_load_policy=1&cc_lang_pref=en"
  );
  expect(sample.mock.calls[0]?.[1]).toContain('expectedYouTubeId="abcdef12345"');
});
it("bounds native messages and respects cancellation before sampling", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    readRecipeVideoCoverFrames("https://vt.tiktok.com/ZSguquYyJ/", { signal: controller.signal })
  ).rejects.toThrow();
  expect(sample).not.toHaveBeenCalled();
});

it("retains public-player captions even when no suitable video frame is available", async () => {
  sample.mockResolvedValueOnce({
    frames: "[]",
    transcript: "Cook the chicken for 9 minutes.",
    title: "Katsu curry",
    caption: "Chicken 400g",
  });
  expect(await readRecipePlayerEvidence("https://youtu.be/-Ksv82YLW-A")).toMatchObject({
    frames: [],
    transcript: "Cook the chicken for 9 minutes.",
    title: "Katsu curry",
    caption: "Chicken 400g",
  });
});
