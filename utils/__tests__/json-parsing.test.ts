import { safeJsonParse } from "../json-parsing";
import { log } from "~/utils/logger";

jest.mock("~/utils/logger", () => ({
  log: {
    warn: jest.fn(),
  },
}));

describe("safeJsonParse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("valid parsing", () => {
    it("should successfully parse valid JSON object", () => {
      const validJson = `{"foo":"bar"}`;
      const result = safeJsonParse(validJson, { foo: "fallback" });
      expect(result).toEqual({ foo: "bar" });
      expect(log.warn).not.toHaveBeenCalled();
    });

    it("should successfully parse valid JSON array", () => {
      const validJson = `[1, 2, 3]`;
      const result = safeJsonParse(validJson, [0]);
      expect(result).toEqual([1, 2, 3]);
      expect(log.warn).not.toHaveBeenCalled();
    });

    it("should successfully parse primitive values when fallback is primitive", () => {
      expect(safeJsonParse("123", 0)).toBe(123);
      expect(safeJsonParse("true", false)).toBe(true);
      expect(safeJsonParse('"string"', "fallback")).toBe("string");
      expect(log.warn).not.toHaveBeenCalled();
    });
  });

  describe("invalid parsing or input errors", () => {
    it("should return fallback for invalid JSON", () => {
      const invalidJson = "invalid_json";
      const fallback = { fallback: true };
      const result = safeJsonParse(invalidJson, fallback);
      expect(result).toBe(fallback);
      expect(log.warn).toHaveBeenCalledWith(
        "Failed to safely parse JSON. Returning fallback value."
      );
    });

    it("should return fallback for undefined or null input", () => {
      const fallback = { fallback: true };
      expect(safeJsonParse(undefined, fallback)).toBe(fallback);
      expect(safeJsonParse(null, fallback)).toBe(fallback);
      expect(log.warn).not.toHaveBeenCalled();
    });

    it("should return fallback for empty string input", () => {
      const fallback = { fallback: true };
      expect(safeJsonParse("", fallback)).toBe(fallback);
      expect(log.warn).not.toHaveBeenCalled();
    });
  });

  describe("shape validation", () => {
    it("should return fallback when fallback is an array but parsed JSON is not", () => {
      const json = `{"foo": "bar"}`;
      const fallback = [1, 2, 3];
      const result = safeJsonParse(json, fallback);
      expect(result).toBe(fallback);
      expect(log.warn).toHaveBeenCalledWith(
        "safeJsonParse: Parsed JSON is not an array, falling back."
      );
    });

    it("should return fallback when fallback is an object but parsed JSON is a primitive", () => {
      const json = "123";
      const fallback = { foo: "bar" };
      const result = safeJsonParse(json, fallback);
      expect(result).toBe(fallback);
      expect(log.warn).toHaveBeenCalledWith(
        "safeJsonParse: Parsed JSON is not a matching object type, falling back."
      );
    });

    it("should return fallback when fallback is an object but parsed JSON is null", () => {
      const json = "null";
      const fallback = { foo: "bar" };
      const result = safeJsonParse(json, fallback);
      expect(result).toBe(fallback);
      expect(log.warn).toHaveBeenCalledWith(
        "safeJsonParse: Parsed JSON is not a matching object type, falling back."
      );
    });

    it("should return fallback when fallback is an object but parsed JSON is an array", () => {
      const json = "[1, 2, 3]";
      const fallback = { foo: "bar" };
      const result = safeJsonParse(json, fallback);
      expect(result).toBe(fallback);
      expect(log.warn).toHaveBeenCalledWith(
        "safeJsonParse: Parsed JSON is not a matching object type, falling back."
      );
    });
  });
});
