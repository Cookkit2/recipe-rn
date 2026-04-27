import { safeJsonParse } from "../json-parsing";

// Mock logger
jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("safeJsonParse", () => {
  it("should return fallback for undefined input", () => {
    const result = safeJsonParse(undefined, "fallback");
    expect(result).toBe("fallback");
  });

  it("should return fallback for null input", () => {
    const result = safeJsonParse(null, "fallback");
    expect(result).toBe("fallback");
  });

  it("should return fallback for empty string", () => {
    const result = safeJsonParse("", "fallback");
    expect(result).toBe("fallback");
  });

  it("should parse valid JSON string", () => {
    const result = safeJsonParse('{"key":"value"}', {});
    expect(result).toEqual({ key: "value" });
  });

  it("should parse valid JSON array", () => {
    const result = safeJsonParse("[1,2,3]", []);
    expect(result).toEqual([1, 2, 3]);
  });

  it("should parse valid JSON number", () => {
    const result = safeJsonParse("42", 0);
    expect(result).toBe(42);
  });

  it("should return fallback for invalid JSON", () => {
    const result = safeJsonParse("invalid json", { default: true });
    expect(result).toEqual({ default: true });
  });

  it("should return fallback when parsed type doesn't match array fallback", () => {
    const result = safeJsonParse('{"key":"value"}', [] as any);
    expect(result).toEqual([]);
  });

  it("should return fallback when parsed type doesn't match object fallback", () => {
    const result = safeJsonParse("[1,2,3]", {} as any);
    expect(result).toEqual({});
  });

  it("should return fallback when parsed is null but fallback is object", () => {
    const result = safeJsonParse("null", {} as any);
    expect(result).toEqual({});
  });

  it("should handle null fallback value", () => {
    const result = safeJsonParse("null", null);
    expect(result).toBe(null);
  });

  it("should parse complex objects", () => {
    const input = JSON.stringify({
      nested: { value: 42 },
      array: [1, 2, 3],
    });
    const result = safeJsonParse(input, {} as any);
    expect(result).toEqual({
      nested: { value: 42 },
      array: [1, 2, 3],
    });
  });

  it("should parse boolean values", () => {
    const result = safeJsonParse("true", false);
    expect(result).toBe(true);
  });

  it("should handle strings with whitespace", () => {
    const result = safeJsonParse('  {"key":"value"}  ', {} as any);
    expect(result).toEqual({ key: "value" });
  });
});
