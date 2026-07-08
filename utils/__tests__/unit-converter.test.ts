import { roundToReasonablePrecision } from "../unit-converter";

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
