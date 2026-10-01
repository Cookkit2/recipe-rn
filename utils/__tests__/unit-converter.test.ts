import { areDimensionsCompatible, roundToReasonablePrecision } from "../unit-converter";

describe("areDimensionsCompatible", () => {
  const WEIGHT_UNITS = ["g", "kg", "oz", "lb"];
  const VOLUME_UNITS = [
    "ml",
    "l",
    "fl_oz",
    "qt",
    "gal",
    "gallon",
    "cup",
    "tbsp",
    "tablespoon",
    "tsp",
    "teaspoon",
    "pt",
    "pint",
  ];
  const COUNT_UNITS = ["unit", "units", "piece", "pieces", "pcs", "count"];

  it("should return true for compatible weight units exhaustively", () => {
    for (const u1 of WEIGHT_UNITS) {
      for (const u2 of WEIGHT_UNITS) {
        expect(areDimensionsCompatible(u1, u2)).toBe(true);
      }
    }
  });

  it("should return true for compatible volume units exhaustively", () => {
    for (const u1 of VOLUME_UNITS) {
      for (const u2 of VOLUME_UNITS) {
        expect(areDimensionsCompatible(u1, u2)).toBe(true);
      }
    }
  });

  it("should return true for compatible count units exhaustively", () => {
    for (const u1 of COUNT_UNITS) {
      for (const u2 of COUNT_UNITS) {
        expect(areDimensionsCompatible(u1, u2)).toBe(true);
      }
    }
  });

  it("should return false for incompatible units (weight vs volume) exhaustively", () => {
    for (const w of WEIGHT_UNITS) {
      for (const v of VOLUME_UNITS) {
        expect(areDimensionsCompatible(w, v)).toBe(false);
        expect(areDimensionsCompatible(v, w)).toBe(false);
      }
    }
  });

  it("should return false for incompatible units (weight vs count) exhaustively", () => {
    for (const w of WEIGHT_UNITS) {
      for (const c of COUNT_UNITS) {
        expect(areDimensionsCompatible(w, c)).toBe(false);
        expect(areDimensionsCompatible(c, w)).toBe(false);
      }
    }
  });

  it("should return false for incompatible units (volume vs count) exhaustively", () => {
    for (const v of VOLUME_UNITS) {
      for (const c of COUNT_UNITS) {
        expect(areDimensionsCompatible(v, c)).toBe(false);
        expect(areDimensionsCompatible(c, v)).toBe(false);
      }
    }
  });

  it("should return false if either unit is unknown", () => {
    expect(areDimensionsCompatible("g", "unknown_unit")).toBe(false);
    expect(areDimensionsCompatible("unknown_unit", "ml")).toBe(false);
  });

  it("should return false if both units are unknown", () => {
    expect(areDimensionsCompatible("unknown_unit", "another_unknown_unit")).toBe(false);
  });

  it("should be case-insensitive", () => {
    expect(areDimensionsCompatible("G", "KG")).toBe(true);
    expect(areDimensionsCompatible("Ml", "L")).toBe(true);
  });
});

describe("roundToReasonablePrecision", () => {
  it("rounds values with more than 3 decimal places correctly", () => {
    // Round down
    expect(roundToReasonablePrecision(1.2344)).toBe(1.234);
    // Round up
    expect(roundToReasonablePrecision(1.2345)).toBe(1.235);
    expect(roundToReasonablePrecision(1.2349)).toBe(1.235);
  });

  it("handles negative numbers correctly", () => {
    // Note: Math.round(-1.2345) is -1234, so (-1234) / 1000 is -1.234.
    // Wait, let's verify Math.round behavior in JS for negatives ending in .5
    // Math.round(-1.5) is -1
    // Math.round(-1.2345 * 1000) -> Math.round(-1234.5) -> -1234
    expect(roundToReasonablePrecision(-1.2344)).toBe(-1.234);
    expect(roundToReasonablePrecision(-1.2345)).toBe(-1.234); // Due to JS Math.round handling .5
    expect(roundToReasonablePrecision(-1.2346)).toBe(-1.235);
  });

  it("returns values unchanged if they have 3 or fewer decimal places", () => {
    expect(roundToReasonablePrecision(1.234)).toBe(1.234);
    expect(roundToReasonablePrecision(1.23)).toBe(1.23);
    expect(roundToReasonablePrecision(1.2)).toBe(1.2);
    expect(roundToReasonablePrecision(1)).toBe(1);
  });

  it("trims trailing zeros automatically (due to JS number representation)", () => {
    expect(roundToReasonablePrecision(1.2000001)).toBe(1.2);
    expect(roundToReasonablePrecision(1.0001)).toBe(1);
  });

  it("returns NaN, Infinity, and -Infinity as-is without modification", () => {
    expect(roundToReasonablePrecision(NaN)).toBeNaN();
    expect(roundToReasonablePrecision(Infinity)).toBe(Infinity);
    expect(roundToReasonablePrecision(-Infinity)).toBe(-Infinity);
  });

  it("handles zero correctly", () => {
    expect(roundToReasonablePrecision(0)).toBe(0);
    // Object.is helps distinguish between 0 and -0
    expect(Object.is(roundToReasonablePrecision(-0), -0)).toBe(true);
  });
});
