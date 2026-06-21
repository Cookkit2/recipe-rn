// Mock heavy native deps so importing classifyModel (which imports Skia at
// module scope) does not pull untransformed ESM into the Jest runtime. We only
// unit-test the pure postProcessResponse confidence/fallback logic.
jest.mock("@shopify/react-native-skia", () => ({
  ImageFormat: { JPEG: "jpeg" },
  Skia: {},
}));
jest.mock("~/utils/gemini-api", () => ({ generateGeminiContent: jest.fn() }));
jest.mock("~/utils/logger", () => ({ log: { info: jest.fn(), error: jest.fn() } }));

// Mock storage so postProcessResponse's unit-system lookup does not blow up.
jest.mock("~/data", () => ({
  storage: {
    get: jest.fn(() => "metric"),
    set: jest.fn(),
  },
}));

// Mock the unit converter so assertions are deterministic regardless of the
// user's unit-system preference.
jest.mock("~/utils/unit-converter", () => ({
  convertToUnitSystem: (quantity: number, unit: string) => ({ quantity, unit }),
}));

import { postProcessResponse } from "../classifyModel";
import { storage } from "~/data";

describe("classifyModel.postProcessResponse (confidence handling)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storage.get as jest.Mock).mockReturnValue("metric");
  });

  it("parses a schema-validated JSON response with a numeric confidence", () => {
    const result = postProcessResponse(
      JSON.stringify({ name: "Sugar", quantity: 1, unit: "kg", confidence: 0.9 })
    );

    expect(result.name).toBe("Sugar");
    expect(result.quantity).toBe(1);
    expect(result.unit).toBe("kg");
    expect(result.confidence).toBeCloseTo(0.9);
  });

  it("parses confidence supplied as a string number", () => {
    const result = postProcessResponse(
      JSON.stringify({ name: "Milk", quantity: 2, unit: "L", confidence: "0.8" })
    );

    expect(result.confidence).toBeCloseTo(0.8);
  });

  it("defaults to a low confidence when the model omits the field", () => {
    const result = postProcessResponse(
      JSON.stringify({ name: "Apple", quantity: 3, unit: "unit" })
    );

    expect(result.name).toBe("Apple");
    // Missing confidence => low default so the item is surfaced for review.
    expect(result.confidence).toBeLessThan(0.6);
  });

  it("forces confidence to zero for an unidentifiable 'unknown' item", () => {
    const result = postProcessResponse(
      JSON.stringify({ name: "unknown", quantity: 1, unit: "unit", confidence: 0.95 })
    );

    // The former "unknown" collapse path now carries an explicit low signal.
    expect(result.name).toBe("Unknown");
    expect(result.confidence).toBe(0);
  });

  it("clamps an out-of-range high confidence to 1.0", () => {
    const result = postProcessResponse(
      JSON.stringify({ name: "Salt", quantity: 1, unit: "kg", confidence: 5 })
    );

    expect(result.confidence).toBe(1);
  });

  it("clamps a negative confidence to 0.0", () => {
    const result = postProcessResponse(
      JSON.stringify({ name: "Salt", quantity: 1, unit: "kg", confidence: -0.3 })
    );

    expect(result.confidence).toBe(0);
  });

  it("falls back to the legacy comma parser and a low confidence for malformed JSON", () => {
    const result = postProcessResponse("Sugar,1,kg");

    expect(result.name).toBe("Sugar");
    expect(result.quantity).toBe(1);
    expect(result.unit).toBe("kg");
    // Malformed/legacy response => low confidence (review), never a throw.
    expect(result.confidence).toBeLessThan(0.6);
  });

  it("does not throw on empty input", () => {
    expect(() => postProcessResponse("")).not.toThrow();
    expect(() => postProcessResponse("   ")).not.toThrow();

    const result = postProcessResponse("");
    expect(result.confidence).toBe(0); // empty -> Unknown -> unidentifiable
    expect(result.name).toBe("Unknown");
  });

  it("does not throw on garbage input", () => {
    expect(() => postProcessResponse("not json at all &&&")).not.toThrow();
    const result = postProcessResponse("not json at all &&&");
    expect(result.confidence).toBeLessThanOrEqual(0.3);
  });

  it("handles a single-object array response from the model", () => {
    const result = postProcessResponse(
      JSON.stringify([{ name: "Flour", quantity: 500, unit: "g", confidence: 0.7 }])
    );

    expect(result.name).toBe("Flour");
    expect(result.confidence).toBeCloseTo(0.7);
  });
});
