import { fetchWithTimeout } from "../fetch-with-timeout";

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, "fetch").mockImplementation(() => Promise.resolve(new Response("ok")));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("resolves with the fetch response if the request finishes before the timeout", async () => {
    const mockResponse = new Response("mock response");
    jest.spyOn(global, "fetch").mockImplementationOnce(() => Promise.resolve(mockResponse));

    const promise = fetchWithTimeout("https://example.com", {}, 1000);

    // Fast-forward slightly, but before the timeout
    jest.advanceTimersByTime(500);

    const response = await promise;
    expect(response).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("aborts the request and throws an error when the timeout is reached", async () => {
    // Make fetch hang forever so the timeout triggers
    jest.spyOn(global, "fetch").mockImplementationOnce(() => {
      return new Promise((resolve, reject) => {
        // Will never resolve unless aborted
      });
    });

    const promise = fetchWithTimeout("https://example.com", {}, 1000);

    // Fast-forward past the timeout
    jest.advanceTimersByTime(1500);

    // The fetch should be aborted, which usually results in an AbortError from fetch.
    // However, in our mock, fetch doesn't automatically throw when signal aborts,
    // but AbortController.abort() will be called.

    // To properly simulate fetch throwing on abort:
    jest.spyOn(global, "fetch").mockImplementationOnce((url, options) => {
      return new Promise((resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener("abort", () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          });
        }
      });
    });

    const failingPromise = fetchWithTimeout("https://example.com", {}, 1000);
    jest.advanceTimersByTime(1500);

    await expect(failingPromise).rejects.toThrow("The operation was aborted");
  });

  it("aborts the request if an external signal is aborted", async () => {
    jest.spyOn(global, "fetch").mockImplementationOnce((url, options) => {
      return new Promise((resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener("abort", () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          });
        }
      });
    });

    const controller = new AbortController();
    const promise = fetchWithTimeout("https://example.com", { signal: controller.signal }, 1000);

    // Abort the external signal
    controller.abort();

    await expect(promise).rejects.toThrow("The operation was aborted");
  });

  it("passes through additional options to fetch", async () => {
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "value" }),
    };

    const promise = fetchWithTimeout("https://example.com", options, 1000);
    jest.advanceTimersByTime(100);
    await promise;

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "value" }),
        signal: expect.any(AbortSignal),
      })
    );
  });
});
