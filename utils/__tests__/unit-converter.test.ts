import {
  areDimensionsCompatible,
  roundToReasonablePrecision,
  convertToUnitSystem,
} from "../unit-converter";

describe("convertToUnitSystem", () => {
  it("should return the original quantity and unit for invalid inputs", () => {
    expect(convertToUnitSystem(null as any, "g", "imperial")).toEqual({
      quantity: null,
      unit: "g",
    });
    expect(convertToUnitSystem(NaN, "g", "imperial")).toEqual({
      quantity: NaN,
      unit: "g",
    });
    expect(convertToUnitSystem(100, "", "imperial")).toEqual({
      quantity: 100,
      unit: "",
    });
  });

  it("should return the original quantity and unit for unknown units", () => {
    expect(convertToUnitSystem(100, "unknown", "imperial")).toEqual({
      quantity: 100,
      unit: "unknown",
    });
  });

  it("should not convert if target system is the same as the unit's system", () => {
    expect(convertToUnitSystem(100, "g", "metric")).toEqual({
      quantity: 100,
      unit: "g",
    });
    expect(convertToUnitSystem(100, "oz", "imperial")).toEqual({
      quantity: 100,
      unit: "oz",
    });
  });

  it("should not convert count dimensions", () => {
    expect(convertToUnitSystem(100, "piece", "imperial")).toEqual({
      quantity: 100,
      unit: "piece",
    });
    expect(convertToUnitSystem(100, "units", "imperial")).toEqual({
      quantity: 100,
      unit: "units",
    });
  });

  it("should be case-insensitive", () => {
    const r1 = convertToUnitSystem(100, "G", "imperial");
    expect(r1.unit).toBe("oz");
    expect(r1.quantity).toBeCloseTo(3.527, 3);
    const r2 = convertToUnitSystem(100, "Ml", "imperial");
    expect(r2.unit).toBe("fl_oz");
    expect(r2.quantity).toBeCloseTo(3.381, 3);
  });

  it("should convert metric weight to imperial", () => {
    const r1 = convertToUnitSystem(100, "g", "imperial");
    expect(r1.unit).toBe("oz");
    expect(r1.quantity).toBeCloseTo(3.527, 3);
    const r2 = convertToUnitSystem(500, "g", "imperial");
    expect(r2.unit).toBe("lb");
    expect(r2.quantity).toBeCloseTo(1.102, 3);
    const r3 = convertToUnitSystem(2, "kg", "imperial");
    expect(r3.unit).toBe("lb");
    expect(r3.quantity).toBeCloseTo(4.409, 3);
  });

  it("should convert imperial weight to metric", () => {
    const r1 = convertToUnitSystem(10, "oz", "metric");
    expect(r1.unit).toBe("g");
    expect(r1.quantity).toBeCloseTo(283.495, 3);
    const r2 = convertToUnitSystem(2, "lb", "metric");
    expect(r2.unit).toBe("kg");
    expect(r2.quantity).toBeCloseTo(0.907, 3);
  });

  it("should convert metric volume to imperial", () => {
    const r1 = convertToUnitSystem(100, "ml", "imperial");
    expect(r1.unit).toBe("fl_oz");
    expect(r1.quantity).toBeCloseTo(3.381, 3);
    const r2 = convertToUnitSystem(500, "ml", "imperial");
    expect(r2.unit).toBe("qt");
    expect(r2.quantity).toBeCloseTo(0.528, 3);
    const r3 = convertToUnitSystem(2, "l", "imperial");
    expect(r3.unit).toBe("qt");
    expect(r3.quantity).toBeCloseTo(2.113, 3);
  });

  it("should convert imperial volume to metric", () => {
    const r1 = convertToUnitSystem(10, "fl_oz", "metric");
    expect(r1.unit).toBe("ml");
    expect(r1.quantity).toBeCloseTo(295.735, 3);
    const r2 = convertToUnitSystem(2, "qt", "metric");
    expect(r2.unit).toBe("l");
    expect(r2.quantity).toBeCloseTo(1.893, 3);
    const r3 = convertToUnitSystem(1, "cup", "metric");
    expect(r3.unit).toBe("ml");
    expect(r3.quantity).toBeCloseTo(236.588, 3);
  });
});

describe("areDimensionsCompatible", () => {
  it("should return true for compatible weight units", () => {
    expect(areDimensionsCompatible("g", "kg")).toBe(true);
    expect(areDimensionsCompatible("oz", "lb")).toBe(true);
    expect(areDimensionsCompatible("g", "oz")).toBe(true);
    expect(areDimensionsCompatible("kg", "lb")).toBe(true);
  });

  it("should return true for compatible volume units", () => {
    expect(areDimensionsCompatible("ml", "l")).toBe(true);
    expect(areDimensionsCompatible("fl_oz", "qt")).toBe(true);
    expect(areDimensionsCompatible("ml", "cup")).toBe(true);
    expect(areDimensionsCompatible("tbsp", "tsp")).toBe(true);
  });

  it("should return true for compatible count units", () => {
    expect(areDimensionsCompatible("unit", "pieces")).toBe(true);
    expect(areDimensionsCompatible("count", "pcs")).toBe(true);
  });

  it("should return false for incompatible units (weight vs volume)", () => {
    expect(areDimensionsCompatible("g", "ml")).toBe(false);
    expect(areDimensionsCompatible("kg", "l")).toBe(false);
    expect(areDimensionsCompatible("oz", "fl_oz")).toBe(false);
    expect(areDimensionsCompatible("lb", "qt")).toBe(false);
  });

  it("should return false for incompatible units (weight vs count)", () => {
    expect(areDimensionsCompatible("g", "unit")).toBe(false);
    expect(areDimensionsCompatible("oz", "pieces")).toBe(false);
  });

  it("should return false for incompatible units (volume vs count)", () => {
    expect(areDimensionsCompatible("ml", "unit")).toBe(false);
    expect(areDimensionsCompatible("cup", "pieces")).toBe(false);
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
