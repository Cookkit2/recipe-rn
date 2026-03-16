import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { sanitizeForDatabase, sanitizeSearchTerm, sanitizeEmail } from "../input-sanitization";

describe("sanitizeForDatabase", () => {
  it("removes SQL keywords and prevents injection patterns", () => {
    expect(sanitizeForDatabase("'; DROP TABLE stock; --")).not.toMatch(/DROP|;|'/);
    expect(sanitizeForDatabase("1' OR '1'='1")).not.toMatch(/'/);
  });

  it("enforces maxLength", () => {
    const long = "a".repeat(300);
    expect(sanitizeForDatabase(long, { maxLength: 255 }).length).toBe(255);
  });

  it("returns empty for non-string input", () => {
    expect(sanitizeForDatabase(null as any)).toBe("");
    expect(sanitizeForDatabase(123 as any)).toBe("");
  });
});

describe("sanitizeSearchTerm", () => {
  it("wraps term in wildcards for LIKE", () => {
    expect(sanitizeSearchTerm("foo")).toBe("%foo%");
  });
});

describe("sanitizeEmail", () => {
  it("accepts valid email", () => {
    expect(sanitizeEmail("user@example.com")).toBe("user@example.com");
  });

  it("trims and lowercases valid email", () => {
    expect(sanitizeEmail("  USER@EXAMPLE.COM  ")).toBe("user@example.com");
  });

  it("returns empty string for null, undefined, and non-string inputs", () => {
    expect(sanitizeEmail(null as any)).toBe("");
    expect(sanitizeEmail(undefined as any)).toBe("");
    expect(sanitizeEmail(123 as any)).toBe("");
    expect(sanitizeEmail({ email: "user@example.com" } as any)).toBe("");
  });

  it("removes control characters", () => {
    // \x00 is a control character, \x20 is space (valid but trimmed), \x7E is ~ (valid)
    expect(sanitizeEmail("user\x00@example.com")).toBe("user@example.com");
    expect(sanitizeEmail("\x1Fuser@example.com\x7F")).toBe("user@example.com");
  });

  it("rejects invalid email formats", () => {
    expect(sanitizeEmail("not-an-email")).toBe("");
    expect(sanitizeEmail("user@.com")).toBe("");
    expect(sanitizeEmail("user@example")).toBe("");
    expect(sanitizeEmail("user@example.c")).toBe("");
    expect(sanitizeEmail("@example.com")).toBe("");
  });

  it("rejects emails exceeding 254 characters", () => {
    const longLocalPart = "a".repeat(250);
    expect(sanitizeEmail(`${longLocalPart}@example.com`)).toBe("");
  });

  it("accepts emails just under or at 254 characters", () => {
    // 242 + 1 + 11 = 254 chars
    const maxLocalPart = "a".repeat(242);
    expect(sanitizeEmail(`${maxLocalPart}@example.com`)).toBe(`${maxLocalPart}@example.com`);
  });
});
