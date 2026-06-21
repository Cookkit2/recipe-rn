import { withRetryBackoff, computeBackoffDelay, defaultIsTerminalError } from "../withRetryBackoff";

describe("computeBackoffDelay", () => {
  it("grows exponentially with attempt and is capped by maxDelayMs", () => {
    const base = 500;
    // Mock Math.random to the upper jitter bound (0.5 of the half) so the
    // deterministic half dominates the assertion.
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(1);

    // attempt 1: exp = min(500*2^0, cap)=500; half=250 + jitter[0,250) -> <= 500
    const d1 = computeBackoffDelay(1, base, 30_000);
    expect(d1).toBeGreaterThanOrEqual(250);
    expect(d1).toBeLessThanOrEqual(500);

    // attempt 5: exp = min(500*2^4=8000, cap); half=4000 + jitter[0,4000) -> <=8000
    const d5 = computeBackoffDelay(5, base, 30_000);
    expect(d5).toBeGreaterThanOrEqual(4000);
    expect(d5).toBeLessThanOrEqual(8000);

    randomSpy.mockRestore();
  });

  it("never exceeds maxDelayMs", () => {
    jest.spyOn(Math, "random").mockReturnValue(1);
    const capped = computeBackoffDelay(50, 500, 1000);
    expect(capped).toBeLessThanOrEqual(1000);
    jest.spyOn(Math, "random").mockRestore();
  });

  it("is always non-negative", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    expect(computeBackoffDelay(1, 500, 30_000)).toBeGreaterThanOrEqual(0);
    jest.spyOn(Math, "random").mockRestore();
  });
});

describe("defaultIsTerminalError", () => {
  it("marks auth/validation/not-found errors as terminal", () => {
    expect(defaultIsTerminalError(new Error("Unauthorized"))).toBe(true);
    expect(defaultIsTerminalError(new Error("403 Forbidden"))).toBe(true);
    expect(defaultIsTerminalError(new Error("Recipe not found"))).toBe(true);
    expect(defaultIsTerminalError(new Error("Invalid payload"))).toBe(true);
    expect(defaultIsTerminalError(new Error("Conflict 409"))).toBe(true);
  });

  it("treats network/timeout errors as retryable (not terminal)", () => {
    expect(defaultIsTerminalError(new Error("network request failed"))).toBe(false);
    expect(defaultIsTerminalError(new Error("ETIMEDOUT"))).toBe(false);
    expect(defaultIsTerminalError(new Error("fetch failed"))).toBe(false);
  });

  it("treats non-Error throws and unknown errors as retryable", () => {
    expect(defaultIsTerminalError("string error")).toBe(false);
    expect(defaultIsTerminalError({ code: 500 })).toBe(false);
  });
});

describe("withRetryBackoff", () => {
  const noSleep = async () => {}; // tests never actually wait

  it("resolves on the first success without retrying", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await withRetryBackoff(fn, { sleep: noSleep });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on a retryable error up to maxAttempts, then succeeds", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce("ok");

    const result = await withRetryBackoff(fn, { maxAttempts: 3, sleep: noSleep });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("rejects with the last error when attempts are exhausted", async () => {
    const err = new Error("persistent network failure");
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withRetryBackoff(fn, { maxAttempts: 2, sleep: noSleep })).rejects.toThrow(
      "persistent network failure"
    );
    // initial try + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry a terminal error (rejects immediately)", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("Unauthorized"));
    await expect(withRetryBackoff(fn, { maxAttempts: 5, sleep: noSleep })).rejects.toThrow(
      "Unauthorized"
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("honors a custom isTerminalError predicate", async () => {
    // Custom predicate: treat any Error starting with "FATAL" as terminal.
    const fn = jest.fn().mockRejectedValue(new Error("FATAL: boom"));
    const isTerminal = (e: unknown) => e instanceof Error && e.message.startsWith("FATAL");
    await expect(
      withRetryBackoff(fn, { maxAttempts: 5, isTerminalError: isTerminal, sleep: noSleep })
    ).rejects.toThrow("FATAL: boom");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("respects the injected sleep schedule (waits between retries)", async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const fn = jest.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce("ok");

    await withRetryBackoff(fn, {
      maxAttempts: 2,
      baseDelayMs: 1000,
      maxDelayMs: 30_000,
      sleep,
    });

    expect(sleep).toHaveBeenCalledTimes(1);
    const waited = sleep.mock.calls[0][0];
    // attempt 1 backoff: exp=1000, half=500 + jitter[0,500) => [500, 1000)
    expect(waited).toBeGreaterThanOrEqual(500);
    expect(waited).toBeLessThanOrEqual(1000);
  });

  it("does not call sleep on first attempt or on terminal error", async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    // success
    await withRetryBackoff(jest.fn().mockResolvedValue(1), { sleep });
    expect(sleep).not.toHaveBeenCalled();

    // terminal
    sleep.mockClear();
    await expect(
      withRetryBackoff(jest.fn().mockRejectedValue(new Error("not found")), { sleep })
    ).rejects.toThrow();
    expect(sleep).not.toHaveBeenCalled();
  });
});
