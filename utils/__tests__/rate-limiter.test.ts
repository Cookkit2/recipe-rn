import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Initialization", () => {
    it("should initialize with default config", () => {
      const limiter = new RateLimiter();
      expect(limiter.getRemainingAttempts("test")).toBe(5);
    });

    it("should initialize with custom config", () => {
      const limiter = new RateLimiter({ maxAttempts: 3, windowMs: 10000 });
      expect(limiter.getRemainingAttempts("test")).toBe(3);
    });
  });

  describe("canAttempt", () => {
    it("should allow first attempt", () => {
      const limiter = new RateLimiter();
      expect(limiter.canAttempt("test")).toBe(true);
    });

    it("should allow attempts up to maxAttempts", () => {
      const limiter = new RateLimiter({ maxAttempts: 3 });
      expect(limiter.canAttempt("test")).toBe(true);
      expect(limiter.canAttempt("test")).toBe(true);
      expect(limiter.canAttempt("test")).toBe(true);
    });

    it("should block attempts after maxAttempts", () => {
      const limiter = new RateLimiter({ maxAttempts: 3 });
      limiter.canAttempt("test");
      limiter.canAttempt("test");
      limiter.canAttempt("test");
      expect(limiter.canAttempt("test")).toBe(false);
    });

    it("should reset after windowMs", () => {
      const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 1000 });
      expect(limiter.canAttempt("test")).toBe(true);
      expect(limiter.canAttempt("test")).toBe(false);

      jest.advanceTimersByTime(1001);
      expect(limiter.canAttempt("test")).toBe(true);
    });

    it("should track separate identifiers independently", () => {
      const limiter = new RateLimiter({ maxAttempts: 1 });
      expect(limiter.canAttempt("user1")).toBe(true);
      expect(limiter.canAttempt("user1")).toBe(false);

      expect(limiter.canAttempt("user2")).toBe(true);
      expect(limiter.canAttempt("user2")).toBe(false);
    });
  });

  describe("getRemainingAttempts", () => {
    it("should return maxAttempts for new identifier", () => {
      const limiter = new RateLimiter({ maxAttempts: 5 });
      expect(limiter.getRemainingAttempts("test")).toBe(5);
    });

    it("should decrease correctly after attempts", () => {
      const limiter = new RateLimiter({ maxAttempts: 5 });
      limiter.canAttempt("test");
      limiter.canAttempt("test");
      expect(limiter.getRemainingAttempts("test")).toBe(3);
    });

    it("should not go below 0", () => {
      const limiter = new RateLimiter({ maxAttempts: 1 });
      limiter.canAttempt("test");
      limiter.canAttempt("test");
      expect(limiter.getRemainingAttempts("test")).toBe(0);
    });

    it("should reset after window expires", () => {
      const limiter = new RateLimiter({ maxAttempts: 3, windowMs: 1000 });
      limiter.canAttempt("test");

      jest.advanceTimersByTime(1001);
      expect(limiter.getRemainingAttempts("test")).toBe(3);
    });
  });

  describe("getResetTime", () => {
    it("should return 0 for new identifier", () => {
      const limiter = new RateLimiter();
      expect(limiter.getResetTime("test")).toBe(0);
    });

    it("should return 0 when not rate limited", () => {
      const limiter = new RateLimiter({ maxAttempts: 2 });
      limiter.canAttempt("test");
      expect(limiter.getResetTime("test")).toBe(0);
    });

    it("should return remaining time when rate limited", () => {
      const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 10000 });
      limiter.canAttempt("test");

      jest.advanceTimersByTime(2000);
      expect(limiter.getResetTime("test")).toBe(8000);
    });

    it("should return 0 after window expires", () => {
      const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 1000 });
      limiter.canAttempt("test");

      jest.advanceTimersByTime(1001);
      expect(limiter.getResetTime("test")).toBe(0);
    });
  });

  describe("reset", () => {
    it("should clear attempts for specific identifier", () => {
      const limiter = new RateLimiter({ maxAttempts: 1 });
      limiter.canAttempt("test");
      expect(limiter.canAttempt("test")).toBe(false);

      limiter.reset("test");
      expect(limiter.canAttempt("test")).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries", () => {
      const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 1000 });
      limiter.canAttempt("test1");

      jest.advanceTimersByTime(500);
      limiter.canAttempt("test2");

      jest.advanceTimersByTime(501);

      limiter.cleanup();

      expect(limiter.getRemainingAttempts("test1")).toBe(1);
      expect(limiter.getRemainingAttempts("test2")).toBe(0);
    });

    it("should actually remove entries from map", () => {
      const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 1000 });
      limiter.canAttempt("test1");

      jest.advanceTimersByTime(1001);

      expect((limiter as any).attempts.size).toBe(1);

      limiter.cleanup();

      expect((limiter as any).attempts.size).toBe(0);
    });
  });
});
