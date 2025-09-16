/**
 * Input Sanitization Tests
 *
 * Tests for the input sanitization utilities to ensure they properly
 * prevent SQL injection and other security vulnerabilities.
 */

import {
  sanitizeForDatabase,
  sanitizeSearchTerm,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeFilename,
  sanitizeUrl,
  sanitizeObject,
} from "../../utils/input-sanitization";

describe("Input Sanitization", () => {
  describe("sanitizeForDatabase", () => {
    it("should remove SQL injection attempts", () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "admin'--",
        "1' OR '1'='1",
        "'; DELETE FROM recipes; --",
        "UNION SELECT * FROM passwords",
        "INSERT INTO admin VALUES ('hacker')",
      ];

      maliciousInputs.forEach((input) => {
        const result = sanitizeForDatabase(input);
        expect(result).not.toContain("DROP");
        expect(result).not.toContain("DELETE");
        expect(result).not.toContain("INSERT");
        expect(result).not.toContain("UNION");
        expect(result).not.toContain("--");
        expect(result).not.toContain(";");
        expect(result).not.toContain("'");
        expect(result).not.toContain('"');
      });
    });

    it("should escape SQL wildcards", () => {
      const input = "search%term_with*wildcards";
      const result = sanitizeForDatabase(input);
      expect(result).toContain("\\%");
      expect(result).toContain("\\_");
    });

    it("should limit string length", () => {
      const longInput = "a".repeat(300);
      const result = sanitizeForDatabase(longInput, { maxLength: 100 });
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it("should remove control characters", () => {
      const input = "test\x00\x01\x1Fstring";
      const result = sanitizeForDatabase(input);
      expect(result).toBe("teststring");
    });

    it("should handle HTML when not allowed", () => {
      const input = "<script>alert('xss')</script>normal text";
      const result = sanitizeForDatabase(input, { allowHtml: false });
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).toContain("normal text");
    });

    it("should preserve safe text", () => {
      const input = "This is a safe search term with numbers 123";
      const result = sanitizeForDatabase(input);
      expect(result).toContain("This is a safe search term with numbers 123");
    });
  });

  describe("sanitizeSearchTerm", () => {
    it("should wrap clean terms with wildcards", () => {
      const input = "chicken";
      const result = sanitizeSearchTerm(input);
      expect(result).toBe("%chicken%");
    });

    it("should sanitize and wrap malicious terms", () => {
      const input = "'; DROP TABLE users; --";
      const result = sanitizeSearchTerm(input);
      expect(result).toMatch(/^%.*%$/);
      expect(result).not.toContain("DROP");
      expect(result).not.toContain("--");
    });

    it("should handle empty or null input", () => {
      expect(sanitizeSearchTerm("")).toBe("%%");
      expect(sanitizeSearchTerm("   ")).toBe("%%");
    });
  });

  describe("sanitizeEmail", () => {
    it("should validate and sanitize good emails", () => {
      const goodEmails = [
        "user@example.com",
        "test.email+tag@domain.co.uk",
        "valid.email@sub.domain.com",
      ];

      goodEmails.forEach((email) => {
        const result = sanitizeEmail(email);
        expect(result).toBe(email.toLowerCase());
      });
    });

    it("should reject invalid emails", () => {
      const badEmails = [
        "not-an-email",
        "@domain.com",
        "user@",
        "user@domain",
        "user name@domain.com",
        "",
        null as unknown as string,
      ];

      badEmails.forEach((email) => {
        if (email === null || email === undefined) {
          expect(() => sanitizeEmail(email)).not.toThrow();
          return;
        }
        const result = sanitizeEmail(email);
        expect(result).toBe("");
      });
    });

    it("should reject overly long emails", () => {
      const longEmail = "a".repeat(300) + "@example.com";
      const result = sanitizeEmail(longEmail);
      expect(result).toBe("");
    });
  });

  describe("sanitizeNumber", () => {
    it("should parse valid numbers", () => {
      expect(sanitizeNumber("123")).toBe(123);
      expect(sanitizeNumber("123.45")).toBe(123.45);
      expect(sanitizeNumber(456)).toBe(456);
      expect(sanitizeNumber("-78.9")).toBe(-78.9);
    });

    it("should reject invalid numbers", () => {
      expect(sanitizeNumber("abc")).toBeNull();
      expect(sanitizeNumber("")).toBeNull();
      expect(sanitizeNumber("123abc")).toBeNull();
      expect(sanitizeNumber("Infinity")).toBeNull();
      expect(sanitizeNumber("NaN")).toBeNull();
    });

    it("should enforce bounds", () => {
      expect(sanitizeNumber("50", { min: 0, max: 100 })).toBe(50);
      expect(sanitizeNumber("-10", { min: 0, max: 100 })).toBeNull();
      expect(sanitizeNumber("150", { min: 0, max: 100 })).toBeNull();
    });
  });

  describe("sanitizeFilename", () => {
    it("should remove dangerous characters", () => {
      const dangerous = "file<name>:with|bad?chars*.txt";
      const result = sanitizeFilename(dangerous);
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).not.toContain(":");
      expect(result).not.toContain("|");
      expect(result).not.toContain("?");
      expect(result).not.toContain("*");
      expect(result).toContain(".txt");
    });

    it("should prevent path traversal", () => {
      const traversal = "../../../etc/passwd";
      const result = sanitizeFilename(traversal);
      expect(result).not.toContain("../");
      expect(result).not.toContain("/");
      expect(result).not.toContain("\\");
    });

    it("should limit filename length", () => {
      const longName = "a".repeat(300) + ".txt";
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith(".txt")).toBe(true);
    });
  });

  describe("sanitizeUrl", () => {
    it("should validate and preserve good URLs", () => {
      const goodUrls = [
        "https://example.com",
        "http://sub.domain.com/path?query=value",
        "ftp://files.example.com/file.zip",
      ];

      goodUrls.forEach((url) => {
        const result = sanitizeUrl(url);
        expect(result).toBe(url);
      });
    });

    it("should reject dangerous protocols", () => {
      const dangerousUrls = [
        "javascript:alert('xss')",
        "data:text/html,<script>alert('xss')</script>",
        "file:///etc/passwd",
        "vbscript:msgbox('xss')",
      ];

      dangerousUrls.forEach((url) => {
        const result = sanitizeUrl(url);
        expect(result).toBe("");
      });
    });

    it("should reject malformed URLs", () => {
      const badUrls = [
        "not-a-url",
        "htp://example.com", // typo in protocol
        "://example.com",
        "",
      ];

      badUrls.forEach((url) => {
        const result = sanitizeUrl(url);
        expect(result).toBe("");
      });
    });
  });

  describe("sanitizeObject", () => {
    it("should sanitize string values in objects", () => {
      const input = {
        name: "John'; DROP TABLE users; --",
        description: "Safe description",
        nested: {
          title: "Nested'; DELETE FROM data; --",
        },
      };

      const result = sanitizeObject(input);
      expect(result.name).not.toContain("DROP");
      expect(result.name).not.toContain("--");
      expect(result.description).toContain("Safe description");
      expect(result.nested.title).not.toContain("DELETE");
      expect(result.nested.title).not.toContain("--");
    });

    it("should sanitize arrays of strings", () => {
      const input = {
        tags: ["safe tag", "'; DROP TABLE tags; --", "another safe tag"],
        numbers: [1, 2, 3],
      };

      const result = sanitizeObject(input);
      expect(result.tags[0]).toBe("safe tag");
      expect(result.tags[1]).not.toContain("DROP");
      expect(result.tags[2]).toBe("another safe tag");
      expect(result.numbers).toEqual([1, 2, 3]);
    });

    it("should preserve non-string values", () => {
      const input = {
        count: 42,
        isActive: true,
        date: new Date(),
        nullValue: null,
      };

      const result = sanitizeObject(input);
      expect(result.count).toBe(42);
      expect(result.isActive).toBe(true);
      expect(result.date).toEqual(input.date);
      expect(result.nullValue).toBeNull();
    });
  });
});
