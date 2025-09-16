import {
  convertToUnitSystem,
  roundToReasonablePrecision,
} from "~/utils/unit-converter";

describe("unit-converter", () => {
  test("converts grams to imperial (ounces)", () => {
    const { quantity, unit } = convertToUnitSystem(100, "g", "imperial");
    expect(unit === "oz" || unit === "lb").toBeTruthy();
    // 100 g ≈ 3.527 oz
    if (unit === "oz") {
      expect(quantity).toBeCloseTo(3.527, 3);
    }
  });

  test("converts kilograms to imperial (pounds)", () => {
    const { quantity, unit } = convertToUnitSystem(2, "kg", "imperial");
    expect(unit).toBe("lb");
    expect(quantity).toBeCloseTo(4.409, 3); // 2kg ≈ 4.409 lb
  });

  test("converts pounds to si (kilograms)", () => {
    const { quantity, unit } = convertToUnitSystem(1, "lb", "si");
    // prefer kg for pound->si if >= 0.75 lb
    expect(unit === "kg" || unit === "g").toBeTruthy();
    if (unit === "kg") {
      expect(quantity).toBeCloseTo(0.454, 3);
    }
  });

  test("converts milliliters to imperial (fl oz)", () => {
    const { quantity, unit } = convertToUnitSystem(60, "ml", "imperial");
    expect(unit).toBe("fl_oz");
    expect(quantity).toBeCloseTo(2.029, 3); // 60ml ≈ 2.029 fl oz
  });

  test("converts liters to imperial (qt)", () => {
    const { quantity, unit } = convertToUnitSystem(2, "l", "imperial");
    expect(unit).toBe("qt");
    expect(quantity).toBeCloseTo(2 / 0.946352946, 3); // ≈ 2.113 qt
  });

  test("converts gallons to si (liters)", () => {
    const { quantity, unit } = convertToUnitSystem(2, "gal", "si");
    expect(["l", "ml"]).toContain(unit);
    if (unit === "l") {
      expect(quantity).toBeCloseTo(7.571, 3); // 2 gal ≈ 7.571 L
    }
  });

  test("unknown unit returns original", () => {
    const result = convertToUnitSystem(5, "unknown", "si");
    expect(result).toEqual({ quantity: 5, unit: "unknown" });
  });

  test("roundToReasonablePrecision rounds to 3 decimals", () => {
    expect(roundToReasonablePrecision(1.23456)).toBe(1.235);
    expect(roundToReasonablePrecision(1.23444)).toBe(1.234);
  });
});
