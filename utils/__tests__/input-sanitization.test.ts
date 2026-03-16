import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import {
  sanitizeForDatabase,
  sanitizeSearchTerm,
  sanitizeEmail,
  sanitizeUrl,
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

describe("sanitizeUrl", () => {
  it("accepts valid http, https, ftp, ftps URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
    expect(sanitizeUrl("https://example.com/path?q=1")).toBe("https://example.com/path?q=1");
    expect(sanitizeUrl("ftp://ftp.example.com")).toBe("ftp://ftp.example.com");
    expect(sanitizeUrl("ftps://ftps.example.com")).toBe("ftps://ftps.example.com");
  });

  it("trims whitespace from URLs", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com");
  });

  it("rejects invalid protocols (e.g. javascript:, data:)", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeUrl("data:text/html,<html>")).toBe("");
    expect(sanitizeUrl("file:///etc/passwd")).toBe("");
  });

  it("rejects invalid URL formats", () => {
    expect(sanitizeUrl("not-a-url")).toBe("");
    expect(sanitizeUrl("://invalid")).toBe("");
  });

  it("returns empty string for non-string or empty inputs", () => {
    expect(sanitizeUrl(null as any)).toBe("");
    expect(sanitizeUrl(undefined as any)).toBe("");
    expect(sanitizeUrl(123 as any)).toBe("");
    expect(sanitizeUrl("")).toBe("");
  });

  it("removes control characters", () => {
    expect(sanitizeUrl("https://example.com/\x00test")).toBe("https://example.com/test");
  });
});
