import { areDimensionsCompatible } from "../unit-converter";

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
