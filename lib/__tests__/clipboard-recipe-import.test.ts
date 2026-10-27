import { createClipboardRecipeMonitor } from "../clipboard-recipe-import";
import type { ClipboardRecipe } from "~/utils/clipboard-recipe";

const url = "https://youtu.be/abcdefghijk";
let available: boolean;
let history: string[];
let choose: ((accept: boolean) => void) | undefined;
const read = jest.fn<Promise<string>, []>();
const onImport = jest.fn();
const prompt = jest.fn((_recipe: ClipboardRecipe, reply: (accept: boolean) => void) => {
  choose = reply;
});
const setup = () =>
  createClipboardRecipeMonitor({
    read,
    hash: async (identity) => `hash:${identity}`,
    available: () => available,
    readHistory: () => history,
    writeHistory: (next) => {
      history = next;
    },
    prompt,
    onImport,
  });
beforeEach(() => {
  jest.clearAllMocks();
  history = [];
  available = true;
  choose = undefined;
  read.mockResolvedValue(url);
});
it("offers a cold-start link without importing until confirmation", async () => {
  const monitor = setup();
  await monitor.check();
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(onImport).not.toHaveBeenCalled();
  choose?.(true);
  choose?.(true);
  expect(onImport).toHaveBeenCalledTimes(1);
});
it("persists dismissal across monitor recreation and URL tracking variations", async () => {
  await setup().check();
  choose?.(false);
  read.mockResolvedValue("https://youtube.com/shorts/abcdefghijk?si=123");
  await setup().check();
  expect(prompt).toHaveBeenCalledTimes(1);
});
it("waits for onboarding, navigation and other imports before reading", async () => {
  available = false;
  const monitor = setup();
  await monitor.check();
  expect(read).not.toHaveBeenCalled();
  available = true;
  await monitor.check();
  expect(prompt).toHaveBeenCalledTimes(1);
});
it("ignores results when a native share or background transition interrupts a read", async () => {
  let resolve!: (value: string) => void;
  read.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      })
  );
  const monitor = setup();
  const checking = monitor.check();
  available = false;
  resolve(url);
  await checking;
  expect(prompt).not.toHaveBeenCalled();
  expect(history).toHaveLength(0);
  available = true;
  await monitor.check();
  expect(prompt).toHaveBeenCalledTimes(1);
});
it("serializes rapid resume requests and keeps one prompt open", async () => {
  const monitor = setup();
  await Promise.all([monitor.check(), monitor.check(), monitor.check()]);
  expect(read).toHaveBeenCalledTimes(1);
  await monitor.check();
  expect(prompt).toHaveBeenCalledTimes(1);
});
it("fails silently on denied clipboard access and retries on the next foreground", async () => {
  read.mockRejectedValueOnce(new Error("denied"));
  const monitor = setup();
  await monitor.check();
  expect(prompt).not.toHaveBeenCalled();
  await monitor.check();
  expect(prompt).toHaveBeenCalledTimes(1);
});
it("does not overwrite a native share arriving while the confirmation is open", async () => {
  await setup().check();
  available = false;
  choose?.(true);
  expect(onImport).not.toHaveBeenCalled();
});
it("bounds history to 100 digests without storing the caption", async () => {
  history = Array.from({ length: 100 }, (_, i) => `digest-${i}`);
  read.mockResolvedValue(`Secret caption ${url}`);
  await setup().check();
  expect(history).toHaveLength(100);
  expect(history.join()).not.toContain("Secret caption");
  expect(history).not.toContain("digest-0");
});
it("ignores unrecognized content", async () => {
  read.mockResolvedValue("https://example.com");
  await setup().check();
  expect(prompt).not.toHaveBeenCalled();
});
it("rechecks after a foreground event interrupts an unfinished clipboard read", async () => {
  let finish!: (value: string) => void;
  read.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const monitor = setup();
  const first = monitor.check();
  available = false;
  monitor.pause();
  available = true;
  read.mockResolvedValue("https://vt.tiktok.com/ZSgH2hh7B/");
  await monitor.check();
  finish(url);
  await first;
  expect(read).toHaveBeenCalledTimes(2);
  expect(prompt.mock.calls[0]?.[0].platform).toBe("TikTok");
});
it("invalidates old reads even when background/resume renders are batched", async () => {
  let version = 0;
  let finish!: (value: string) => void;
  read.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const monitor = createClipboardRecipeMonitor({
    read,
    hash: async (id) => id,
    version: () => version,
    available: () => true,
    readHistory: () => [],
    writeHistory: jest.fn(),
    prompt,
    onImport,
  });
  const first = monitor.check();
  version += 1;
  read.mockResolvedValue("https://vt.tiktok.com/ZSgH2hh7B/");
  await monitor.check();
  finish(url);
  await first;
  expect(prompt.mock.calls[0]?.[0].platform).toBe("TikTok");
});
