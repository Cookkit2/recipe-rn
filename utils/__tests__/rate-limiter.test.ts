import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("limits attempts within a time window", () => {
    const rl = new RateLimiter({ maxAttempts: 2, windowMs: 50 });
    const id = "test";

    expect(rl.canAttempt(id)).toBe(true);
    expect(rl.canAttempt(id)).toBe(true);
    expect(rl.canAttempt(id)).toBe(false);

    jest.advanceTimersByTime(51);

    expect(rl.canAttempt(id)).toBe(true);
  });
});
