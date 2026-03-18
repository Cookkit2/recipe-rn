import { jest, describe, beforeEach, afterEach, it, expect } from "@jest/globals";
import { fetchWithTimeout } from "../fetch-with-timeout";

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("should successfully return response when fetch completes before timeout", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    jest.spyOn(global, "fetch").mockImplementation(() => {
      return Promise.resolve(mockResponse);
    });

    const promise = fetchWithTimeout("https://example.com", {}, 1000);
    const response = await promise;

    expect(response).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("should abort when timeout is exceeded", async () => {
    jest.spyOn(global, "fetch").mockImplementation((url, init) => {
      return new Promise<Response>((resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        if (signal) {
          signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
          if (signal.aborted) {
            reject(new DOMException("The operation was aborted.", "AbortError"));
            return;
          }
        }
      });
    });

    const promise = fetchWithTimeout("https://example.com", {}, 1000);

    // Fast-forward time so the setTimeout callback runs
    jest.advanceTimersByTime(1001);

    await expect(promise).rejects.toThrow("The operation was aborted.");
  });

  it("should abort when external signal is aborted", async () => {
    jest.spyOn(global, "fetch").mockImplementation((url, init) => {
      return new Promise<Response>((resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        if (signal) {
          signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
          if (signal.aborted) {
            reject(new DOMException("The operation was aborted.", "AbortError"));
            return;
          }
        }
      });
    });

    const externalController = new AbortController();

    const promise = fetchWithTimeout(
      "https://example.com",
      { signal: externalController.signal },
      1000
    );

    // Abort the external signal before the timeout
    externalController.abort();

    await expect(promise).rejects.toThrow("The operation was aborted.");
  });
});
