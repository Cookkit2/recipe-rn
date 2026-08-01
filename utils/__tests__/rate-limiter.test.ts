import { authRateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  const TEST_ID = "test-user@example.com";
  const TEST_ID_2 = "test-user2@example.com";

  // authRateLimiter config is maxAttempts: 5, windowMs: 300000 (5 minutes)
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 300000;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    // Clear state before each test
    authRateLimiter.reset(TEST_ID);
    authRateLimiter.reset(TEST_ID_2);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("canAttempt", () => {
    it("should allow the first attempt", () => {
      expect(authRateLimiter.canAttempt(TEST_ID)).toBe(true);
    });

    it("should allow multiple attempts within the limit", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        expect(authRateLimiter.canAttempt(TEST_ID)).toBe(true);
      }
    });

    it("should deny attempts after limit is reached", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        authRateLimiter.canAttempt(TEST_ID);
      }
      expect(authRateLimiter.canAttempt(TEST_ID)).toBe(false);
    });

    it("should track separate limits for different identifiers", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        authRateLimiter.canAttempt(TEST_ID);
      }
      expect(authRateLimiter.canAttempt(TEST_ID)).toBe(false);
      expect(authRateLimiter.canAttempt(TEST_ID_2)).toBe(true); // Should still be allowed
    });

    it("should allow attempts again after the window expires", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        authRateLimiter.canAttempt(TEST_ID);
      }
      expect(authRateLimiter.canAttempt(TEST_ID)).toBe(false);

      // Advance time by WINDOW_MS + 1ms to simulate window expiry
      jest.advanceTimersByTime(WINDOW_MS + 1);

      expect(authRateLimiter.canAttempt(TEST_ID)).toBe(true);
    });
  });

  describe("getRemainingAttempts", () => {
    it("should return MAX_ATTEMPTS for a new identifier", () => {
      expect(authRateLimiter.getRemainingAttempts(TEST_ID)).toBe(MAX_ATTEMPTS);
    });

    it("should correctly decrement as attempts are made", () => {
      authRateLimiter.canAttempt(TEST_ID);
      expect(authRateLimiter.getRemainingAttempts(TEST_ID)).toBe(MAX_ATTEMPTS - 1);

      authRateLimiter.canAttempt(TEST_ID);
      expect(authRateLimiter.getRemainingAttempts(TEST_ID)).toBe(MAX_ATTEMPTS - 2);
    });

    it("should not return a negative number", () => {
      for (let i = 0; i < MAX_ATTEMPTS + 2; i++) {
        authRateLimiter.canAttempt(TEST_ID);
      }
      expect(authRateLimiter.getRemainingAttempts(TEST_ID)).toBe(0);
    });

    it("should return MAX_ATTEMPTS after the window expires", () => {
      authRateLimiter.canAttempt(TEST_ID);
      jest.advanceTimersByTime(WINDOW_MS + 1);
      expect(authRateLimiter.getRemainingAttempts(TEST_ID)).toBe(MAX_ATTEMPTS);
    });
  });

  describe("getResetTime", () => {
    it("should return 0 for a new identifier", () => {
      expect(authRateLimiter.getResetTime(TEST_ID)).toBe(0);
    });

    it("should return 0 if limit is not exceeded", () => {
      authRateLimiter.canAttempt(TEST_ID);
      expect(authRateLimiter.getResetTime(TEST_ID)).toBe(0);
    });

    it("should return time until reset if limit is exceeded", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        authRateLimiter.canAttempt(TEST_ID);
      }
      expect(authRateLimiter.getResetTime(TEST_ID)).toBe(WINDOW_MS);

      // Advance time by half the window
      jest.advanceTimersByTime(WINDOW_MS / 2);
      expect(authRateLimiter.getResetTime(TEST_ID)).toBe(WINDOW_MS / 2);
    });

    it("should return 0 after the window expires", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        authRateLimiter.canAttempt(TEST_ID);
      }
      jest.advanceTimersByTime(WINDOW_MS + 1);
      expect(authRateLimiter.getResetTime(TEST_ID)).toBe(0);
    });
  });

  describe("reset", () => {
    it("should clear the attempts for a given identifier", () => {
      authRateLimiter.canAttempt(TEST_ID);
      expect(authRateLimiter.getRemainingAttempts(TEST_ID)).toBe(MAX_ATTEMPTS - 1);

      authRateLimiter.reset(TEST_ID);
      expect(authRateLimiter.getRemainingAttempts(TEST_ID)).toBe(MAX_ATTEMPTS);
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries but keep active ones", () => {
      authRateLimiter.canAttempt(TEST_ID);

      // Advance time half way, then add another identifier
      jest.advanceTimersByTime(WINDOW_MS / 2);
      authRateLimiter.canAttempt(TEST_ID_2);

      // Advance past the first identifier's window
      jest.advanceTimersByTime((WINDOW_MS / 2) + 1);

      authRateLimiter.cleanup();

      // TEST_ID should have been cleaned up and treated as fresh
      expect(authRateLimiter.getRemainingAttempts(TEST_ID)).toBe(MAX_ATTEMPTS);

      // TEST_ID_2 should still be active and have 1 attempt used
      expect(authRateLimiter.getRemainingAttempts(TEST_ID_2)).toBe(MAX_ATTEMPTS - 1);
    });
  });
});
