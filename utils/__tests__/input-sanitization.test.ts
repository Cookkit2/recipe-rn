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

  it("strips HTML characters by default", () => {
    expect(sanitizeForDatabase("<script>alert(1)</script>")).toBe("alert(1)/");
  });

  it("retains HTML characters when allowHtml is true", () => {
    expect(sanitizeForDatabase("<b>hello</b>", { allowHtml: true })).toBe("<b>hello</b>");
  });

  it("strips special characters when allowSpecialChars is false", () => {
    expect(sanitizeForDatabase("hello @world! #1", { allowSpecialChars: false })).toBe("hello world 1");
  });

  it("removes characters matching custom removePattern", () => {
    expect(sanitizeForDatabase("foo bar baz", { removePattern: /bar /g })).toBe("foo baz");
  });

  it("removes control characters and null bytes", () => {
    // \x00 is null byte, \x07 is bell
    expect(sanitizeForDatabase("hello\x00world\x07")).toBe("helloworld");
  });

  it("escapes SQL wildcards and backslashes", () => {
    expect(sanitizeForDatabase("100% _sure \\test")).toBe("100\\% \\_sure \\\\test");
  });

  it("cleans up extra whitespace", () => {
    expect(sanitizeForDatabase("  hello    world  ")).toBe("hello world");
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
