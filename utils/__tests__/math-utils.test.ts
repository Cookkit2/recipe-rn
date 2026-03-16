import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { sigmoid } from "../math-utils";

describe("math-utils", () => {
  describe("sigmoid", () => {
    it("returns 0.5 for input 0", () => {
      expect(sigmoid(0)).toBe(0.5);
    });

    it("returns values close to 1 for large positive inputs", () => {
      expect(sigmoid(10)).toBeCloseTo(0.99995);
      expect(sigmoid(100)).toBe(1); // Due to floating point precision, it evaluates to exactly 1
    });

    it("returns values close to 0 for large negative inputs", () => {
      expect(sigmoid(-10)).toBeCloseTo(0.000045);
      // It gets very close to 0, but is not exactly 0.
      expect(sigmoid(-100)).toBeCloseTo(0);
      expect(sigmoid(-1000)).toBe(0); // For very large negative numbers, it is exactly 0
    });

    it("returns correct values for specific points to verify curve shape", () => {
      expect(sigmoid(1)).toBeCloseTo(0.731058);
      expect(sigmoid(-1)).toBeCloseTo(0.268941);
      expect(sigmoid(2)).toBeCloseTo(0.880797);
      expect(sigmoid(-2)).toBeCloseTo(0.119202);
    });

    it("handles edge cases: Infinity and -Infinity", () => {
      expect(sigmoid(Infinity)).toBe(1);
      expect(sigmoid(-Infinity)).toBe(0);
    });

    it("handles NaN by returning NaN", () => {
      expect(sigmoid(NaN)).toBeNaN();
    });
  });
});
