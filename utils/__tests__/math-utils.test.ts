import { sigmoid } from "../math-utils";

describe("sigmoid", () => {
  it("should return 0.5 for x=0", () => {
    const result = sigmoid(0);
    expect(result).toBe(0.5);
  });

  it("should return value close to 1 for large positive x", () => {
    const result = sigmoid(10);
    expect(result).toBeGreaterThan(0.9);
    expect(result).toBeLessThan(1);
  });

  it("should return value close to 0 for large negative x", () => {
    const result = sigmoid(-10);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.1);
  });

  it("should return value between 0 and 1 for any input", () => {
    const testValues = [-100, -10, -1, 0, 1, 10, 100];

    testValues.forEach((x) => {
      const result = sigmoid(x);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  it("should be symmetric around 0", () => {
    const positiveResult = sigmoid(5);
    const negativeResult = sigmoid(-5);

    expect(positiveResult + negativeResult).toBeCloseTo(1, 10);
  });

  it("should handle decimal values", () => {
    const result = sigmoid(0.5);
    expect(result).toBeGreaterThan(0.5);
    expect(result).toBeLessThan(1);
  });
});
