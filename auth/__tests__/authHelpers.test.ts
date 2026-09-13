import { normalizeRateLimitId } from "../authHelpers";

describe("normalizeRateLimitId", () => {
  it("should normalize a valid email", () => {
    expect(normalizeRateLimitId("Test@Example.com")).toBe("test@example.com");
  });

  it("should trim whitespace", () => {
    expect(normalizeRateLimitId("  user@example.com  ")).toBe("user@example.com");
  });

  it("should return fallback for undefined email", () => {
    expect(normalizeRateLimitId(undefined)).toBe("anonymous");
  });

  it("should return fallback for empty string", () => {
    expect(normalizeRateLimitId("")).toBe("anonymous");
  });

  it("should return custom fallback for undefined email", () => {
    expect(normalizeRateLimitId(undefined, "custom-fallback")).toBe("custom-fallback");
  });

  it("should return custom fallback for empty string", () => {
    expect(normalizeRateLimitId("", "custom-fallback")).toBe("custom-fallback");
  });
});
