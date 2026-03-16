import { safeJsonParse } from "../json-parsing";

describe("safeJsonParse", () => {
  const mockWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

  afterEach(() => {
    mockWarn.mockClear();
  });

  afterAll(() => {
    mockWarn.mockRestore();
  });

  it("should successfully parse valid JSON", () => {
    const validJson = '{"foo":"bar"}';
    const result = safeJsonParse(validJson, { foo: "fallback" });
    expect(result).toEqual({ foo: "bar" });
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("should return fallback for invalid JSON", () => {
    const invalidJson = "invalid_json";
    const fallback = { fallback: true };
    const result = safeJsonParse(invalidJson, fallback);
    expect(result).toBe(fallback);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn).toHaveBeenCalledWith(
      "Failed to parse JSON string:",
      expect.any(SyntaxError),
      "String:",
      invalidJson
    );
  });

  it("should return fallback for undefined or null input", () => {
    const fallback = { fallback: true };
    const resultUndefined = safeJsonParse(undefined, fallback);
    expect(resultUndefined).toBe(fallback);

    const resultNull = safeJsonParse(null, fallback);
    expect(resultNull).toBe(fallback);

    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("should return fallback for empty string input", () => {
    const fallback = { fallback: true };
    const result = safeJsonParse("", fallback);
    expect(result).toBe(fallback);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});
