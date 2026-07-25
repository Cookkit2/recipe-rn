import { JSONSerializer } from "../storage-types";

describe("JSONSerializer", () => {
  let serializer: JSONSerializer<any>;

  beforeEach(() => {
    serializer = new JSONSerializer();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should successfully serialize and deserialize valid JSON", () => {
    const data = { key: "value", num: 42, arr: [1, 2, 3] };
    const serialized = serializer.serialize(data);

    expect(typeof serialized).toBe("string");

    const deserialized = serializer.deserialize(serialized);
    expect(deserialized).toEqual(data);
  });

  it("should handle JSON.parse errors gracefully and return null", () => {
    const malformedJson = "{ key: value }"; // Invalid JSON format (missing quotes)

    const result = serializer.deserialize(malformedJson);

    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      "JSONSerializer failed to parse value",
      expect.any(SyntaxError)
    );
  });

  it("should handle JSON.stringify errors gracefully and return an empty string", () => {
    const circularReference: any = {};
    circularReference.myself = circularReference;

    const result = serializer.serialize(circularReference);

    expect(result).toBe("");
    expect(console.warn).toHaveBeenCalledWith(
      "JSONSerializer failed to serialize value",
      expect.any(TypeError)
    );
  });
});
