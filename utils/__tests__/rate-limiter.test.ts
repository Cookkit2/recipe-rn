import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  it("limits attempts within a time window", async () => {
    const rl = new RateLimiter({ maxAttempts: 2, windowMs: 50 });
    const id = "test";

    expect(rl.canAttempt(id)).toBe(true);
    expect(rl.canAttempt(id)).toBe(true);
    expect(rl.canAttempt(id)).toBe(false); // 3rd attempt fails

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Should be allowed again
    expect(rl.canAttempt(id)).toBe(true);
  });
});
