import { readRecipeVideo } from "../recipe-video.native";

const frame = { timestamp: 8, mimeType: "image/jpeg", data: "YWJj" };
const mockNative = { resolveVideo: jest.fn(), prepareVideo: jest.fn() };
const mockModule = jest.fn((): object | null => mockNative);
const mockSpeech = jest.fn();
const mockDownload = { downloadAsync: jest.fn(), cancelAsync: jest.fn(async () => {}) };
const mockFiles = {
  cacheDirectory: "file:///cache/",
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(async () => {}),
  getInfoAsync: jest.fn(),
  createDownloadResumable: jest.fn(() => mockDownload),
};
jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockModule() }));
jest.mock("expo-file-system/legacy", () => mockFiles);
jest.mock("../video-speech", () => ({
  transcribeVideoAudio: (...args: unknown[]) => mockSpeech(...args),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockModule.mockReturnValue(mockNative);
  mockNative.prepareVideo.mockResolvedValue({ duration: 18, frames: [frame], audioChunks: [] });
  mockFiles.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, size: 2000 });
  mockSpeech.mockResolvedValue({ transcript: "Steam for 15 minutes", warnings: [] });
  mockNative.resolveVideo.mockResolvedValue({
    mediaUrl: "https://v16.tiktokcdn.com/video.mp4",
    title: "Egg",
    caption: "5 eggs",
    userAgent: "Safari",
  });
  mockDownload.downloadAsync.mockResolvedValue({ status: 200 });
});

it("copies the picked file, prepares it locally and deletes only its own temporary directory", async () => {
  const evidence = await readRecipeVideo({
    videoUri: "file:///picked/original.mov",
    language: "zh-CN",
  });
  expect(mockNative.resolveVideo).not.toHaveBeenCalled();
  expect(mockFiles.copyAsync).toHaveBeenCalledWith({
    from: "file:///picked/original.mov",
    to: expect.stringMatching(/^file:\/\/\/cache\/recipe-video-.*\/video.mp4$/),
  });
  expect(mockSpeech).toHaveBeenCalledWith([], "zh-CN", expect.any(String), expect.any(Object));
  expect(evidence.frames).toEqual([frame]);
  expect(mockFiles.deleteAsync).toHaveBeenCalledWith(
    expect.stringMatching(/^file:\/\/\/cache\/recipe-video-.*\/$/),
    { idempotent: true }
  );
  expect(mockFiles.deleteAsync).not.toHaveBeenCalledWith(
    "file:///picked/original.mov",
    expect.anything()
  );
});

it("rejects untrusted resolved media and cleans up without downloading", async () => {
  mockNative.resolveVideo.mockResolvedValueOnce({ mediaUrl: "http://127.0.0.1/private" });
  await expect(readRecipeVideo({ url: "https://vt.tiktok.com/ZSgH2hh7B/" })).rejects.toThrow(
    "Choose a saved video"
  );
  expect(mockFiles.createDownloadResumable).not.toHaveBeenCalled();
  expect(mockFiles.deleteAsync).toHaveBeenCalledTimes(1);
});

it("enforces the local file size limit before decoding", async () => {
  mockFiles.getInfoAsync.mockResolvedValueOnce({
    exists: true,
    isDirectory: false,
    size: 40_000_001,
  });
  await expect(readRecipeVideo({ videoUri: "file:///large.mp4" })).rejects.toThrow("40 MB");
  expect(mockNative.prepareVideo).not.toHaveBeenCalled();
  expect(mockFiles.deleteAsync).toHaveBeenCalledTimes(1);
});

it("offers recovery when running an older native binary", async () => {
  mockModule.mockReturnValueOnce(null);
  await expect(readRecipeVideo({ videoUri: "file:///picked.mp4" })).rejects.toThrow(
    "Update Cookkit"
  );
  expect(mockFiles.makeDirectoryAsync).not.toHaveBeenCalled();
});

it("keeps frame evidence when native audio decoding is unavailable", async () => {
  mockNative.prepareVideo.mockResolvedValueOnce({
    duration: 18,
    frames: [frame],
    audioChunks: [],
    warnings: ["Audio unavailable"],
  });
  mockSpeech.mockResolvedValueOnce({ transcript: "", warnings: [] });
  const evidence = await readRecipeVideo({ url: "https://vt.tiktok.com/ZSgH2hh7B/" });
  expect(evidence.frames).toHaveLength(1);
  expect(evidence.warnings).toContain("Audio unavailable");
  expect(mockDownload.downloadAsync).toHaveBeenCalledTimes(1);
});
