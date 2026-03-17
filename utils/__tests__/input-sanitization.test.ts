import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import {
  sanitizeForDatabase,
  sanitizeSearchTerm,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeFilename,
  sanitizeObject,
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

  it("strips HTML characters by default", () => {
    expect(sanitizeForDatabase("<script>alert(1)</script>")).toBe("alert(1)/");
  });

  it("retains HTML characters when allowHtml is true", () => {
    expect(sanitizeForDatabase("<b>hello</b>", { allowHtml: true })).toBe("<b>hello</b>");
  });

  it("strips special characters when allowSpecialChars is false", () => {
    expect(sanitizeForDatabase("hello @world! #1", { allowSpecialChars: false })).toBe(
      "hello world 1"
    );
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

describe("sanitizeFilename", () => {
  it("returns empty string for falsy or non-string inputs", () => {
    expect(sanitizeFilename(null as any)).toBe("");
    expect(sanitizeFilename(undefined as any)).toBe("");
    expect(sanitizeFilename("")).toBe("");
    expect(sanitizeFilename(123 as any)).toBe("");
    expect(sanitizeFilename({} as any)).toBe("");
  });

  it("trims whitespace from the filename", () => {
    expect(sanitizeFilename("  my-file.txt  ")).toBe("my-file.txt");
  });

  it("removes path traversal attempts", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("etcpasswd");
    expect(sanitizeFilename("folder/../file.txt")).toBe("folderfile.txt");
    expect(sanitizeFilename("folder\\..\\file.txt")).toBe("folderfile.txt");
  });

  it("removes dangerous characters", () => {
    expect(sanitizeFilename("file<name>.txt")).toBe("filename.txt");
    expect(sanitizeFilename("file:name.txt")).toBe("filename.txt");
    expect(sanitizeFilename('file"name.txt')).toBe("filename.txt");
    expect(sanitizeFilename("file|name.txt")).toBe("filename.txt");
    expect(sanitizeFilename("file?name.txt")).toBe("filename.txt");
    expect(sanitizeFilename("file*name.txt")).toBe("filename.txt");
  });

  it("removes control characters", () => {
    expect(sanitizeFilename("file\x00name.txt")).toBe("filename.txt");
    expect(sanitizeFilename("file\x1Fname.txt")).toBe("filename.txt");
    // Ensure printable ASCII characters are kept
    expect(sanitizeFilename("file-name_123.txt")).toBe("file-name_123.txt");
  });

  it("limits length to 255 characters while preserving the extension", () => {
    const longName = "a".repeat(300);
    const extension = "txt";
    const filename = `${longName}.${extension}`;

    const result = sanitizeFilename(filename);

    expect(result.length).toBe(255);
    expect(result.endsWith(".txt")).toBe(true);
    // 255 - 3 (length of 'txt') - 1 (length of '.') = 251 characters of the name
    expect(result).toBe("a".repeat(251) + ".txt");
  });

  it("limits length to 255 characters for files without extension", () => {
    const longName = "a".repeat(300);

    const result = sanitizeFilename(longName);

    expect(result.length).toBe(255);
    expect(result).toBe("a".repeat(255));
  });

  it("handles empty extension correctly when limiting length", () => {
    const longName = "a".repeat(300);
    const filename = `${longName}.`;

    const result = sanitizeFilename(filename);

    expect(result.length).toBe(255);
    expect(result.endsWith(".")).toBe(true);
    expect(result).toBe("a".repeat(254) + ".");
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
