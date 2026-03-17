import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import {
  sanitizeForDatabase,
  sanitizeSearchTerm,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeFilename,
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
