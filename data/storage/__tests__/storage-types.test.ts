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

  it("should handle JSON.parse errors gracefully and return null via safeJsonParse", () => {
    const malformedJson = "{ key: value }"; // Invalid JSON format (missing quotes)

    const result = serializer.deserialize(malformedJson);

    expect(result).toBeNull();
    // safeJsonParse logs its own warnings, so we just verify the return value
  });

  it("should throw on JSON.stringify errors to prevent silent data corruption", () => {
    const circularReference: any = {};
    circularReference.myself = circularReference;

    expect(() => {
      serializer.serialize(circularReference);
    }).toThrow(TypeError);
  });
});
