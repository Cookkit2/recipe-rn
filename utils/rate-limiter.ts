/**
 * Rate Limiter for preventing brute force attacks
 * Limits the number of attempts per identifier within a time window
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxAttempts: config?.maxAttempts || 5,
      windowMs: config?.windowMs || 300000, // 5 minutes default
    };
  }

  /**
   * Check if an attempt is allowed for the given identifier
   * @param identifier - Unique identifier (email, IP, etc.)
   * @returns true if attempt is allowed, false if rate limited
   */
  canAttempt(identifier: string): boolean {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry) {
      // First attempt
      this.attempts.set(identifier, {
        count: 1,
        windowStart: now,
      });
      return true;
    }

    // Check if window has expired
    if (now - entry.windowStart > this.config.windowMs) {
      // Reset window
      this.attempts.set(identifier, {
        count: 1,
        windowStart: now,
      });
      return true;
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxAttempts) {
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  /**
   * Get remaining attempts for the identifier
   * @param identifier - Unique identifier
   * @returns Number of remaining attempts
   */
  getRemainingAttempts(identifier: string): number {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry) {
      return this.config.maxAttempts;
    }

    // Check if window has expired
    if (now - entry.windowStart > this.config.windowMs) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - entry.count);
  }

  /**
   * Get time until rate limit resets (in milliseconds)
   * @param identifier - Unique identifier
   * @returns Time until reset, or 0 if not rate limited
   */
  getResetTime(identifier: string): number {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry) {
      return 0;
    }

    // Check if window has expired
    if (now - entry.windowStart > this.config.windowMs) {
      return 0;
    }

    // If not rate limited, return 0
    if (entry.count < this.config.maxAttempts) {
      return 0;
    }

    // Return time until window expires
    return this.config.windowMs - (now - entry.windowStart);
  }

  /**
   * Reset attempts for an identifier
   * @param identifier - Unique identifier
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    const expiredEntries: string[] = [];

    for (const [identifier, entry] of this.attempts.entries()) {
      if (now - entry.windowStart > this.config.windowMs) {
        expiredEntries.push(identifier);
      }
    }

    expiredEntries.forEach((id) => this.attempts.delete(id));
  }
}

// Create singleton instances for different use cases
export const authRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 300000, // 5 minutes
});

export const apiRateLimiter = new RateLimiter({
  maxAttempts: 100,
  windowMs: 60000, // 1 minute
});

// Clean up expired entries every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    authRateLimiter.cleanup();
    apiRateLimiter.cleanup();
  }, 600000); // 10 minutes
}
