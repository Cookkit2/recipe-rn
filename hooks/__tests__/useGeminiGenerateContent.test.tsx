import { renderHook, act } from "@testing-library/react-hooks";
import { useGeminiGenerateContent, useGeminiListModels } from "../useGeminiGenerateContent";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { GeminiAPI, DEFAULT_GEMINI_MODEL } from "~/utils/gemini-api";

// Create the mock variables
const mockGenerateContent = jest.fn();
const mockListModels = jest.fn();

// Mock the whole module
jest.mock("~/utils/gemini-api", () => {
  return {
    GeminiAPI: jest.fn().mockImplementation(function () {
      return {
        generateContent: (...args: any[]) => mockGenerateContent(...args),
        listModels: (...args: any[]) => mockListModels(...args),
      };
    }),
  };
});

describe("useGeminiGenerateContent hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Suppress console errors from react-test-renderer/act since they clutter test output
    // but the tests function correctly
    jest.spyOn(console, "error").mockImplementation((...args) => {
      // Ignore act warnings, renderer warnings, and query data undefined warnings
      return;
    });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("useGeminiGenerateContent", () => {
    it("should successfully generate content with default model", async () => {
      mockGenerateContent.mockResolvedValue("Mock response content");

      const { result, waitForNextUpdate } = renderHook(() => useGeminiGenerateContent(), {
        wrapper,
      });

      act(() => {
        result.current.mutate({ body: "test prompt" });
      });

      await waitForNextUpdate();

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toBe("Mock response content");
      expect(mockGenerateContent).toHaveBeenCalledWith(
        DEFAULT_GEMINI_MODEL,
        "test prompt",
        expect.any(AbortSignal)
      );
    });

    it("should successfully generate content with custom model", async () => {
      mockGenerateContent.mockResolvedValue("Mock response content");

      const { result, waitForNextUpdate } = renderHook(() => useGeminiGenerateContent(), {
        wrapper,
      });

      act(() => {
        result.current.mutate({ model: "gemini-1.5-pro", body: "test prompt" });
      });

      await waitForNextUpdate();

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toBe("Mock response content");
      expect(mockGenerateContent).toHaveBeenCalledWith(
        "gemini-1.5-pro",
        "test prompt",
        expect.any(AbortSignal)
      );
    });

    it("should handle errors correctly", async () => {
      const error = new Error("API Error");
      mockGenerateContent.mockRejectedValue(error);

      const { result, waitForNextUpdate } = renderHook(() => useGeminiGenerateContent(), {
        wrapper,
      });

      act(() => {
        result.current.mutate({ body: "test prompt" });
      });

      await waitForNextUpdate();

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
    });

    it("should cleanup the timeout when mutation finishes", async () => {
      // Use fake timers to verify timeout cleanup
      jest.useFakeTimers();

      const spyClearTimeout = jest.spyOn(globalThis, "clearTimeout");
      mockGenerateContent.mockResolvedValue("Mock response content");

      const { result, waitForNextUpdate } = renderHook(() => useGeminiGenerateContent(), {
        wrapper,
      });

      act(() => {
        result.current.mutate({ body: "test prompt" });
      });

      // Need to advance timers/promises together
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });

      expect(spyClearTimeout).toHaveBeenCalled();

      jest.useRealTimers();
      spyClearTimeout.mockRestore();
    });
  });

  describe("useGeminiListModels", () => {
    it("should not fetch initially if not enabled", () => {
      mockListModels.mockResolvedValue([]);

      const { result } = renderHook(() => useGeminiListModels(), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(mockListModels).not.toHaveBeenCalled();
    });

    it("should fetch when enabled", async () => {
      const mockModels = [{ id: "model-1" }, { id: "model-2" }];
      mockListModels.mockResolvedValue(mockModels);

      const { result, waitForNextUpdate } = renderHook(
        () => useGeminiListModels({ enabled: true }),
        { wrapper }
      );

      expect(result.current.isFetching).toBe(true);

      await waitForNextUpdate();

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockModels);
      expect(mockListModels).toHaveBeenCalledWith(expect.any(AbortSignal));
    });
  });
});
