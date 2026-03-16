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

  it("handles empty strings and non-string inputs", () => {
    expect(sanitizeSearchTerm("")).toBe("%%");
    expect(sanitizeSearchTerm(null as any)).toBe("%%");
    expect(sanitizeSearchTerm(undefined as any)).toBe("%%");
  });

  it("escapes existing SQL wildcards and backslashes", () => {
    expect(sanitizeSearchTerm("100%")).toBe("%100\\%%");
    expect(sanitizeSearchTerm("user_name")).toBe("%user\\_name%");
    expect(sanitizeSearchTerm("path\\to\\file")).toBe("%path\\\\to\\\\file%");
  });

  it("removes SQL keywords and injection patterns", () => {
    // DROP and SELECT are reserved keywords removed by sanitizeForDatabase
    expect(sanitizeSearchTerm("DROP TABLE users")).toBe("%TABLE users%");
    expect(sanitizeSearchTerm("SELECT * FROM users;")).toBe("%* FROM users%");
  });

  it("removes HTML tags by default", () => {
    // SCRIPT is a keyword that gets removed! So <script> becomes <>, then <> is removed by allowHtml=false
    expect(sanitizeSearchTerm("<script>alert('xss')</script>")).toBe("%alert(xss)/%");
    // "b" is not a keyword
    expect(sanitizeSearchTerm("<b>bold</b>")).toBe("%bbold/b%");
  });

  it("enforces default maxLength of 100", () => {
    const long = "a".repeat(150);
    const result = sanitizeSearchTerm(long);
    expect(result.length).toBe(102);
    expect(result).toBe(`%${"a".repeat(100)}%`);
  });

  it("allows custom options to override defaults", () => {
    const long = "a".repeat(150);
    const result = sanitizeSearchTerm(long, { maxLength: 50 });
    expect(result.length).toBe(52); // % + 50 + %

    // allowHtml: true preserves <>
    expect(sanitizeSearchTerm("<b>bold</b>", { allowHtml: true })).toBe("%<b>bold</b>%");
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
