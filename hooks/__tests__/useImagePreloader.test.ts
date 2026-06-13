import { renderHook, act } from "@testing-library/react-native";
import { useImagePreloader } from "../useImagePreloader";
import { Image } from "expo-image";

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
    const { result } = renderHook(() => useImagePreloader({ priority: "high" }));

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
});
