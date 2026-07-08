import { isValidServingSize } from "../recipe-scaling";

describe("isValidServingSize", () => {
  it("should return true for valid positive integers", () => {
    expect(isValidServingSize(1)).toBe(true);
    expect(isValidServingSize(4)).toBe(true);
    expect(isValidServingSize(100)).toBe(true);
  });

  it("should return true for valid positive decimals", () => {
    expect(isValidServingSize(0.5)).toBe(true);
    expect(isValidServingSize(1.5)).toBe(true);
    expect(isValidServingSize(2.25)).toBe(true);
  });

  it("should return false for zero", () => {
    expect(isValidServingSize(0)).toBe(false);
  });

  it("should return false for negative numbers", () => {
    expect(isValidServingSize(-1)).toBe(false);
    expect(isValidServingSize(-0.5)).toBe(false);
    expect(isValidServingSize(-10)).toBe(false);
  });

  it("should return false for NaN", () => {
    expect(isValidServingSize(NaN)).toBe(false);
  });

  it("should return false for Infinity and -Infinity", () => {
    expect(isValidServingSize(Infinity)).toBe(false);
    expect(isValidServingSize(-Infinity)).toBe(false);
  });

  it("should return false for invalid types (even if bypassed in JS)", () => {
    // @ts-ignore - testing runtime behavior
    expect(isValidServingSize("4")).toBe(false);
    // @ts-ignore
    expect(isValidServingSize(null)).toBe(false);
    // @ts-ignore
    expect(isValidServingSize(undefined)).toBe(false);
    // @ts-ignore
    expect(isValidServingSize({})).toBe(false);
    // @ts-ignore
    expect(isValidServingSize([])).toBe(false);
  });
});
