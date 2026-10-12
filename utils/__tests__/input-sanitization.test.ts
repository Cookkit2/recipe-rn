import { sanitizeSearchTerm } from "../input-sanitization";

describe("sanitizeSearchTerm", () => {
  it("should wrap a standard search term with wildcards", () => {
    expect(sanitizeSearchTerm("apple")).toBe("%apple%");
  });

  it("should handle empty strings and whitespace", () => {
    expect(sanitizeSearchTerm("")).toBe("%%");
    expect(sanitizeSearchTerm("   ")).toBe("%%");
  });

  it("should handle non-string inputs gracefully", () => {
    expect(sanitizeSearchTerm(null as any)).toBe("%%");
    expect(sanitizeSearchTerm(undefined as any)).toBe("%%");
    expect(sanitizeSearchTerm(123 as any)).toBe("%%");
  });

  it("should collapse multiple spaces and trim", () => {
    expect(sanitizeSearchTerm("  fresh   apple  ")).toBe("%fresh apple%");
  });

  it("should escape SQL wildcards (%, _, \\)", () => {
    expect(sanitizeSearchTerm("100% juice")).toBe("%100\\% juice%");
    expect(sanitizeSearchTerm("user_name")).toBe("%user\\_name%");
    expect(sanitizeSearchTerm("path\\to")).toBe("%path\\\\to%");
  });

  it("should strip HTML tags by default", () => {
    expect(sanitizeSearchTerm('<script>alert("xss")</script>')).toBe('%scriptalert("xss")/script%');
  });

  it("should allow special characters by default", () => {
    expect(sanitizeSearchTerm("apple & banana!")).toBe("%apple & banana!%");
  });

  it("should truncate strings to 100 characters by default", () => {
    const longString = "a".repeat(150);
    const result = sanitizeSearchTerm(longString);
    expect(result).toHaveLength(102); // 100 + 2 wildcards
    expect(result).toBe(`%${"a".repeat(100)}%`);
  });

  it("should accept custom sanitization options", () => {
    expect(sanitizeSearchTerm("apple", { maxLength: 3 })).toBe("%app%");
    expect(sanitizeSearchTerm("<tag>", { allowHtml: true })).toBe("%<tag>%");
    expect(sanitizeSearchTerm("apple & banana!", { allowSpecialChars: false })).toBe(
      "%apple  banana%"
    );
  });
});
