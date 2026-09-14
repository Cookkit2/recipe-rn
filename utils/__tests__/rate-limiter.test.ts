import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2023-01-01T00:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows attempts below maxAttempts limit", () => {
    const limiter = new RateLimiter({ maxAttempts: 3, windowMs: 1000 });

    expect(limiter.canAttempt("user1")).toBe(true);
    expect(limiter.canAttempt("user1")).toBe(true);
    expect(limiter.canAttempt("user1")).toBe(true);
  });

  it("blocks attempts exceeding maxAttempts limit within window", () => {
    const limiter = new RateLimiter({ maxAttempts: 2, windowMs: 1000 });

    expect(limiter.canAttempt("user1")).toBe(true);
    expect(limiter.canAttempt("user1")).toBe(true);
    expect(limiter.canAttempt("user1")).toBe(false);
    expect(limiter.canAttempt("user1")).toBe(false);
  });

  it("resets attempts after window expires", () => {
    const limiter = new RateLimiter({ maxAttempts: 2, windowMs: 1000 });

    expect(limiter.canAttempt("user1")).toBe(true);
    expect(limiter.canAttempt("user1")).toBe(true);
    expect(limiter.canAttempt("user1")).toBe(false);

    // Advance time past the window
    jest.advanceTimersByTime(1001);

    // Should be allowed again
    expect(limiter.canAttempt("user1")).toBe(true);
    expect(limiter.canAttempt("user1")).toBe(true);
    expect(limiter.canAttempt("user1")).toBe(false);
  });

  it("tracks different identifiers independently", () => {
    const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 1000 });

    expect(limiter.canAttempt("user1")).toBe(true);
    expect(limiter.canAttempt("user1")).toBe(false);

    expect(limiter.canAttempt("user2")).toBe(true);
    expect(limiter.canAttempt("user2")).toBe(false);
  });

  describe("getRemainingAttempts", () => {
    it("returns config.maxAttempts for new identifiers", () => {
      const limiter = new RateLimiter({ maxAttempts: 5, windowMs: 1000 });
      expect(limiter.getRemainingAttempts("user1")).toBe(5);
    });

    it("returns correct remaining attempts after some usage", () => {
      const limiter = new RateLimiter({ maxAttempts: 5, windowMs: 1000 });
      limiter.canAttempt("user1");
      limiter.canAttempt("user1");

      expect(limiter.getRemainingAttempts("user1")).toBe(3);
    });

    it("returns 0 when rate limited", () => {
      const limiter = new RateLimiter({ maxAttempts: 2, windowMs: 1000 });
      limiter.canAttempt("user1");
      limiter.canAttempt("user1");
      limiter.canAttempt("user1");

      expect(limiter.getRemainingAttempts("user1")).toBe(0);
    });

    it("resets remaining attempts after window expires", () => {
      const limiter = new RateLimiter({ maxAttempts: 2, windowMs: 1000 });
      limiter.canAttempt("user1");
      limiter.canAttempt("user1");

      expect(limiter.getRemainingAttempts("user1")).toBe(0);

      jest.advanceTimersByTime(1001);

      expect(limiter.getRemainingAttempts("user1")).toBe(2);
    });
  });

  describe("getResetTime", () => {
    it("returns 0 for new identifiers", () => {
      const limiter = new RateLimiter({ maxAttempts: 5, windowMs: 1000 });
      expect(limiter.getResetTime("user1")).toBe(0);
    });

    it("returns 0 when not rate limited", () => {
      const limiter = new RateLimiter({ maxAttempts: 5, windowMs: 1000 });
      limiter.canAttempt("user1");

      expect(limiter.getResetTime("user1")).toBe(0);
    });

    it("returns time until window expires when rate limited", () => {
      const windowMs = 1000;
      const limiter = new RateLimiter({ maxAttempts: 2, windowMs });

      limiter.canAttempt("user1");

      // Advance by 200ms before second attempt
      jest.advanceTimersByTime(200);
      limiter.canAttempt("user1");

      // The reset time should be based on the start of the window (first attempt)
      // First attempt was at 0ms, window expires at 1000ms.
      // Current time is 200ms. Time until window expires is 800ms.
      expect(limiter.getResetTime("user1")).toBe(800);

      // Advance by another 300ms
      jest.advanceTimersByTime(300);

      // Current time is 500ms. Time until window expires is 500ms.
      expect(limiter.getResetTime("user1")).toBe(500);
    });

    it("returns 0 after window expires", () => {
      const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 1000 });
      limiter.canAttempt("user1");

      jest.advanceTimersByTime(1001);

      expect(limiter.getResetTime("user1")).toBe(0);
    });
  });

  describe("reset", () => {
    it("clears attempts for an identifier", () => {
      const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 1000 });
      limiter.canAttempt("user1");
      expect(limiter.canAttempt("user1")).toBe(false);

      limiter.reset("user1");

      expect(limiter.canAttempt("user1")).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("removes expired entries", () => {
      const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 1000 });
      limiter.canAttempt("user1");

      // Advance time so user1's window expires
      jest.advanceTimersByTime(1001);

      // Create a fresh entry for user2
      limiter.canAttempt("user2");

      // Verify internal state before cleanup (using casting to access private property for testing)
      const attemptsMap = (limiter as any).attempts as Map<string, any>;
      expect(attemptsMap.has("user1")).toBe(true);
      expect(attemptsMap.has("user2")).toBe(true);

      limiter.cleanup();

      // user1 should be cleaned up, user2 should remain
      expect(attemptsMap.has("user1")).toBe(false);
      expect(attemptsMap.has("user2")).toBe(true);
    });
  });
});
