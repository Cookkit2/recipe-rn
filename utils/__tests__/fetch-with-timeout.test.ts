import { fetchWithTimeout } from "../fetch-with-timeout";

// Mock global fetch
(globalThis as any).fetch = jest.fn();

// Mock timers
jest.useFakeTimers();

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call fetch with correct parameters", async () => {
    const mockResponse = { ok: true } as Response;
    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout("https://api.example.com", {}, 5000);

    expect(globalThis.fetch).toHaveBeenCalledWith("https://api.example.com", {
      signal: expect.any(AbortSignal),
    });
    expect(result).toBe(mockResponse);
  });

  it("should pass through options to fetch", async () => {
    const mockResponse = { ok: true } as Response;
    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const options: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"data":"test"}',
    };

    await fetchWithTimeout("https://api.example.com", options, 5000);

    expect(globalThis.fetch).toHaveBeenCalledWith("https://api.example.com", {
      ...options,
      signal: expect.any(AbortSignal),
    });
  });

  it("should clear timeout on successful response", async () => {
    const mockResponse = { ok: true } as Response;
    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const clearTimeoutSpy = jest.spyOn(globalThis, "clearTimeout");

    await fetchWithTimeout("https://api.example.com", {}, 5000);

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("should cleanup event listener after fetch completes", async () => {
    const mockResponse = { ok: true } as Response;
    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const externalController = new AbortController();
    const removeEventListenerSpy = jest.spyOn(externalController.signal, "removeEventListener");

    const options: RequestInit = {
      signal: externalController.signal,
    };

    await fetchWithTimeout("https://api.example.com", options, 5000);

    expect(removeEventListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});
