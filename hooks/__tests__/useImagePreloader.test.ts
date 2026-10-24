import { renderHook, act } from "@testing-library/react-native";
import { useImagePreloader } from "../useImagePreloader";
import { Image } from "expo-image";
import { log } from "~/utils/logger";

jest.mock("~/utils/logger", () => ({ log: { warn: jest.fn() } }));

jest.mock("expo-image", () => ({
  Image: {
    prefetch: jest.fn().mockResolvedValue(true),
  },
}));

describe("useImagePreloader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("filters out insecure http URLs", async () => {
    const { result } = await renderHook(() => useImagePreloader({ priority: "high" }));

    await act(async () => {
      const promise = result.current.prefetch([
        "http://example.com/image.jpg",
        "https://example.com/image2.jpg",
      ]);
      jest.runAllTimers();
      await promise;
    });

    expect(Image.prefetch).toHaveBeenCalledWith(
      ["https://example.com/image2.jpg"],
      expect.any(Object)
    );
  });

  it("uses the default batch size of 8 (no more than 8 URLs per prefetch call)", async () => {
    const { result } = await renderHook(() => useImagePreloader({ priority: "high" }));
    const urls = Array.from({ length: 20 }, (_, i) => `https://example.com/img-${i}.jpg`);

    await act(async () => {
      const promise = result.current.prefetch(urls);
      jest.runAllTimers();
      await promise;
    });

    // 20 URLs / batch of 8 => 3 prefetch calls (8, 8, 4).
    expect(Image.prefetch).toHaveBeenCalledTimes(3);
    expect((Image.prefetch as jest.Mock).mock.calls[0][0]).toHaveLength(8);
    expect((Image.prefetch as jest.Mock).mock.calls[2][0]).toHaveLength(4);
  });

  it("honors a lower concurrency cap (1 URL per batch on low-tier devices)", async () => {
    const { result } = await renderHook(() =>
      useImagePreloader({ priority: "high", concurrency: 1 })
    );
    const urls = Array.from({ length: 3 }, (_, i) => `https://example.com/img-${i}.jpg`);

    await act(async () => {
      const promise = result.current.prefetch(urls);
      jest.runAllTimers();
      await promise;
    });

    expect(Image.prefetch).toHaveBeenCalledTimes(3);
    for (const call of (Image.prefetch as jest.Mock).mock.calls) {
      expect(call[0]).toHaveLength(1);
    }
  });

  it("clamps an explicit concurrency of 0 to 1 (no empty/infinite batch)", async () => {
    const { result } = await renderHook(() =>
      useImagePreloader({ priority: "high", concurrency: 0 })
    );

    await act(async () => {
      const promise = result.current.prefetch(["https://example.com/a.jpg"]);
      jest.runAllTimers();
      await promise;
    });

    expect(Image.prefetch).toHaveBeenCalledTimes(1);
    expect((Image.prefetch as jest.Mock).mock.calls[0][0]).toHaveLength(1);
  });

  it("skips prefetch entirely when enabled is false (offline)", async () => {
    const { result } = await renderHook(() =>
      useImagePreloader({ priority: "high", enabled: false })
    );

    await act(async () => {
      const promise = result.current.prefetch([
        "https://example.com/a.jpg",
        "https://example.com/b.jpg",
      ]);
      jest.runAllTimers();
      const ret = await promise;
      expect(ret).toBe(true);
    });

    expect(Image.prefetch).not.toHaveBeenCalled();
  });

  it("settles the prefetch promise and loading state if a completion callback throws", async () => {
    const failure = new Error("Subscriber failed");
    const { result } = await renderHook(() =>
      useImagePreloader({
        priority: "high",
        onComplete: () => {
          throw failure;
        },
      })
    );
    await act(async () => {
      const promise = result.current.prefetch("https://example.com/callback.jpg");
      jest.runAllTimers();
      expect(await promise).toBe(true);
    });
    expect(result.current.isPreloading).toBe(false);
    expect(log.warn).toHaveBeenCalledWith("Image prefetch completion failed", failure);
  });

  it("waits for the current batch and deduplicates overlapping requests", async () => {
    jest.useFakeTimers();
    const finishes: Array<() => void> = [];
    jest.mocked(Image.prefetch).mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finishes.push(() => resolve(true));
        })
    );
    const { result, unmount } = await renderHook(() =>
      useImagePreloader({ priority: "high", concurrency: 2 })
    );
    let first!: Promise<boolean | void>;
    let second!: Promise<boolean | void>;
    try {
      await act(async () => {
        first = result.current.prefetch([
          "https://example.com/pending-a",
          "https://example.com/pending-b",
          "https://example.com/pending-c",
        ]);
        second = result.current.prefetch(["https://example.com/pending-a"]);
        jest.runAllTimers();
      });
      expect(Image.prefetch).toHaveBeenCalledTimes(1);
      expect(jest.mocked(Image.prefetch).mock.calls[0]?.[0]).toHaveLength(2);
      await act(async () => {
        finishes.shift()!();
      });
      expect(Image.prefetch).toHaveBeenCalledTimes(2);
      await act(async () => {
        finishes.shift()!();
        await Promise.all([first, second]);
      });
      await unmount();
    } finally {
      jest.mocked(Image.prefetch).mockResolvedValue(true);
      jest.useRealTimers();
    }
  });
});
