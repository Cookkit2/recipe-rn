import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import {
  sanitizeForDatabase,
  sanitizeSearchTerm,
  sanitizeEmail,
  sanitizeNumber,
} from "../input-sanitization";

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

  it("rejects invalid email", () => {
    expect(sanitizeEmail("not-an-email")).toBe("");
  });
});

describe("sanitizeNumber", () => {
  it("handles null, undefined, and empty string", () => {
    expect(sanitizeNumber(null as any)).toBeNull();
    expect(sanitizeNumber(undefined as any)).toBeNull();
    expect(sanitizeNumber("")).toBeNull();
  });

  it("handles valid numbers", () => {
    expect(sanitizeNumber(0)).toBe(0);
    expect(sanitizeNumber(42)).toBe(42);
    expect(sanitizeNumber(-42)).toBe(-42);
    expect(sanitizeNumber(3.14)).toBe(3.14);
  });

  it("handles valid numeric strings", () => {
    expect(sanitizeNumber("0")).toBe(0);
    expect(sanitizeNumber("42")).toBe(42);
    expect(sanitizeNumber("-42")).toBe(-42);
    expect(sanitizeNumber("3.14")).toBe(3.14);
  });

  it("rejects invalid numeric strings", () => {
    expect(sanitizeNumber("abc")).toBeNull();
    expect(sanitizeNumber("12abc")).toBeNull();
    expect(sanitizeNumber("abc12")).toBeNull();
    expect(sanitizeNumber("12 34")).toBeNull();
  });

  it("rejects NaN and Infinity", () => {
    expect(sanitizeNumber(NaN)).toBeNull();
    expect(sanitizeNumber(Infinity)).toBeNull();
    expect(sanitizeNumber(-Infinity)).toBeNull();
  });

  it("enforces min and max options", () => {
    expect(sanitizeNumber(10, { min: 5, max: 15 })).toBe(10);
    expect(sanitizeNumber(4, { min: 5, max: 15 })).toBeNull();
    expect(sanitizeNumber(16, { min: 5, max: 15 })).toBeNull();
  });
});
