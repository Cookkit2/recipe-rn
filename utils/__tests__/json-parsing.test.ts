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

  it("returns fallback for empty, null, or undefined JSON", () => {
    expect(safeJsonParse(null, { a: 1 })).toEqual({ a: 1 });
    expect(safeJsonParse(undefined, { a: 1 })).toEqual({ a: 1 });
    expect(safeJsonParse("", { a: 1 })).toEqual({ a: 1 });
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("parses valid JSON successfully", () => {
    expect(safeJsonParse('{"b":2}', { a: 1 })).toEqual({ b: 2 });
    expect(safeJsonParse("[1,2]", [])).toEqual([1, 2]);
    expect(safeJsonParse("42", 0)).toEqual(42);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("returns fallback if JSON is not an array but fallback is an array", () => {
    expect(safeJsonParse('{"a":1}', [])).toEqual([]);
    expect(log.warn).toHaveBeenCalledWith(
      "safeJsonParse: Parsed JSON is not an array, falling back."
    );
  });

  it("returns fallback if JSON is not an object but fallback is an object", () => {
    expect(safeJsonParse("[1,2]", { a: 1 })).toEqual({ a: 1 });
    expect(log.warn).toHaveBeenCalledWith(
      "safeJsonParse: Parsed JSON is not a matching object type, falling back."
    );
  });

  it("returns fallback when passing malformed JSON (catch block)", () => {
    expect(safeJsonParse("{malformed json}", { fallback: true })).toEqual({ fallback: true });
    expect(log.warn).toHaveBeenCalledWith("Failed to safely parse JSON. Returning fallback value.");
  });
});
