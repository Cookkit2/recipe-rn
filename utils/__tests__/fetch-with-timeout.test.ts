import { fetchWithTimeout } from "../fetch-with-timeout";

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("resolves successfully if fetch completes before timeout", async () => {
    const mockResponse = new Response("ok");
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const promise = fetchWithTimeout("https://example.com", {}, 1000);

    const result = await promise;
    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("rejects with AbortError if timeout fires", async () => {
    // Mock fetch to just wait, simulating a slow network request
    (global.fetch as jest.Mock).mockImplementation((url, { signal }: any = {}) => {
      return new Promise((resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("abort", "AbortError")));
      });
    });

    const promise = fetchWithTimeout("https://example.com", {}, 1000);

    // Advance time past the timeout
    jest.advanceTimersByTime(1001);

    await expect(promise).rejects.toThrow(/abort/i);
  });

  it("honors an external signal being aborted", async () => {
    (global.fetch as jest.Mock).mockImplementation((url, { signal }: any = {}) => {
      return new Promise((resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("abort", "AbortError")));
      });
    });

    const controller = new AbortController();
    const promise = fetchWithTimeout("https://example.com", { signal: controller.signal }, 1000);

    // Abort the external signal before the timeout
    controller.abort();

    await expect(promise).rejects.toThrow(/abort/i);
  });

  it("cleans up timeout on success", async () => {
    const mockResponse = new Response("ok");
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    await fetchWithTimeout("https://example.com", {}, 1000);

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
