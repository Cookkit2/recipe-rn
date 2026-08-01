import { normalizeRateLimitId } from "../authHelpers";

describe("normalizeRateLimitId", () => {
  it("should lower case and trim valid emails", () => {
    expect(normalizeRateLimitId(" Test@Example.com ")).toBe("test@example.com");
    expect(normalizeRateLimitId("USER@DOMAIN.COM")).toBe("user@domain.com");
  });

  it("should fallback when email is undefined", () => {
    expect(normalizeRateLimitId(undefined)).toBe("anonymous");
  });

  it("should use custom fallback when email is undefined and fallback is provided", () => {
    expect(normalizeRateLimitId(undefined, "custom-fallback")).toBe("custom-fallback");
  });

  it("should fallback when email is empty string or whitespace", () => {
    expect(normalizeRateLimitId("")).toBe("anonymous");
    expect(normalizeRateLimitId("   ")).toBe("anonymous");
  });
});
