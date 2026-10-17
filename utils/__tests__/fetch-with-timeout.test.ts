import { fetchWithTimeout } from "../fetch-with-timeout";

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function abortableFetch() {
    return jest.spyOn(global, "fetch").mockImplementation(
      (_url, options) =>
        new Promise<Response>((_resolve, reject) => {
          const rejectAbort = () =>
            reject(new DOMException("The operation was aborted", "AbortError"));
          if (options?.signal?.aborted) rejectAbort();
          else options?.signal?.addEventListener("abort", rejectAbort, { once: true });
        })
    );
  }

  it("passes request options through and clears the timer after success", async () => {
    const response = new Response("ok");
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(response);
    const options = { method: "POST", body: "recipe" };
    await expect(fetchWithTimeout("https://example.com", options, 1000)).resolves.toBe(response);
    expect(fetchMock).toHaveBeenCalledWith("https://example.com", {
      ...options,
      signal: expect.any(AbortSignal),
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("aborts at the deadline and releases the timer", async () => {
    abortableFetch();
    const rejection = expect(
      fetchWithTimeout("https://example.com", {}, 1000)
    ).rejects.toMatchObject({ name: "AbortError" });
    await jest.advanceTimersByTimeAsync(1000);
    await rejection;
    expect(jest.getTimerCount()).toBe(0);
  });

  it("honors cancellation after the request starts and removes its listener", async () => {
    abortableFetch();
    const controller = new AbortController();
    const removeListener = jest.spyOn(controller.signal, "removeEventListener");
    const rejection = expect(
      fetchWithTimeout("https://example.com", { signal: controller.signal }, 1000)
    ).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejection;
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("honors a signal cancelled before the request starts", async () => {
    abortableFetch();
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchWithTimeout("https://example.com", { signal: controller.signal }, 1000)
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("releases resources after a network error", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    const controller = new AbortController();
    const removeListener = jest.spyOn(controller.signal, "removeEventListener");
    await expect(
      fetchWithTimeout("https://example.com", { signal: controller.signal }, 1000)
    ).rejects.toThrow("offline");
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(jest.getTimerCount()).toBe(0);
  });
});
