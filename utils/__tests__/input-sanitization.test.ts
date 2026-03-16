import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import {
  sanitizeForDatabase,
  sanitizeSearchTerm,
  sanitizeEmail,
  sanitizeObject,
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

describe("sanitizeObject", () => {
  it("returns non-object inputs unmodified", () => {
    expect(sanitizeObject(null as any)).toBeNull();
    expect(sanitizeObject("string" as any)).toBe("string");
    expect(sanitizeObject(123 as any)).toBe(123);
  });

  it("sanitizes flat objects with mixed types", () => {
    const input = {
      text: "'; DROP TABLE stock; --",
      safeText: "Hello World",
      num: 123,
      bool: true,
      nullable: null,
    };

    const expected = {
      text: "TABLE stock",
      safeText: "Hello World",
      num: 123,
      bool: true,
      nullable: null,
    };

    expect(sanitizeObject(input)).toEqual(expected);
  });

  it("sanitizes nested objects", () => {
    const input = {
      user: {
        name: "Bob",
        query: "SELECT * FROM users",
      },
    };

    const expected = {
      user: {
        name: "Bob",
        query: "* FROM users",
      },
    };

    expect(sanitizeObject(input)).toEqual(expected);
  });

  it("sanitizes arrays within objects", () => {
    const input = {
      items: ["safe", "DROP TABLE", { nested: "1' OR '1'='1" }, 456, null],
    };

    const expected = {
      items: ["safe", "TABLE", { nested: "1 OR 1=1" }, 456, null],
    };

    expect(sanitizeObject(input)).toEqual(expected);
  });

  it("passes options down to string sanitization", () => {
    const input = {
      text: "1234567890",
      nested: {
        text: "1234567890",
      },
      items: ["1234567890", { text: "1234567890" }],
    };

    const expected = {
      text: "12345",
      nested: {
        text: "12345",
      },
      items: ["12345", { text: "12345" }],
    };

    expect(sanitizeObject(input, { maxLength: 5 })).toEqual(expected);
  });
});
