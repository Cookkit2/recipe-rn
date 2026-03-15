import {
  scaleIngredientQuantity,
  scaleRecipeIngredients,
  calculateScalingFactor,
  getScalingDirection,
  formatScalingChange,
  isValidServingSize,
  adjustToCommonFraction
} from "../recipe-scaling";

describe("scaleIngredientQuantity", () => {
  it("scales up a quantity correctly", () => {
    expect(scaleIngredientQuantity(100, 2, 4)).toBe(200);
    expect(scaleIngredientQuantity(1.5, 4, 6)).toBe(2.25);
  });

  it("scales down a quantity correctly", () => {
    expect(scaleIngredientQuantity(200, 4, 2)).toBe(100);
    expect(scaleIngredientQuantity(2.25, 6, 4)).toBe(1.5);
  });

  it("handles no change in servings", () => {
    expect(scaleIngredientQuantity(100, 2, 2)).toBe(100);
  });

  it("handles edge case: quantity is 0", () => {
    expect(scaleIngredientQuantity(0, 2, 4)).toBe(0);
  });

  it("handles edge case: originalServings is 0 or negative", () => {
    expect(scaleIngredientQuantity(100, 0, 4)).toBe(100);
    expect(scaleIngredientQuantity(100, -1, 4)).toBe(100);
  });

  it("handles edge case: newServings is 0 or negative", () => {
    expect(scaleIngredientQuantity(100, 2, 0)).toBe(0);
    expect(scaleIngredientQuantity(100, 2, -1)).toBe(0);
  });

  it("rounds to max 2 decimals", () => {
    // 100 / 3 * 4 = 133.333333...
    expect(scaleIngredientQuantity(100, 3, 4)).toBe(133.33);
    // 10 / 3 = 3.333333...
    expect(scaleIngredientQuantity(10, 3, 1)).toBe(3.33);
  });
});

describe("scaleRecipeIngredients", () => {
  const ingredients = [
    { name: "Flour", quantity: 200 },
    { name: "Sugar", quantity: 100 },
  ];

  it("scales an array of ingredients up", () => {
    const scaled = scaleRecipeIngredients(ingredients, 2, 4);
    expect(scaled).toEqual([
      { name: "Flour", quantity: 400 },
      { name: "Sugar", quantity: 200 },
    ]);
  });

  it("scales an array of ingredients down", () => {
    const scaled = scaleRecipeIngredients(ingredients, 4, 2);
    expect(scaled).toEqual([
      { name: "Flour", quantity: 100 },
      { name: "Sugar", quantity: 50 },
    ]);
  });

  it("handles empty array or undefined", () => {
    expect(scaleRecipeIngredients([], 2, 4)).toEqual([]);
    expect(scaleRecipeIngredients(undefined as any, 2, 4)).toEqual([]);
  });

  it("handles invalid servings by returning original ingredients", () => {
    expect(scaleRecipeIngredients(ingredients, 0, 4)).toEqual(ingredients);
    expect(scaleRecipeIngredients(ingredients, 2, 0)).toEqual(ingredients);
  });
});

describe("calculateScalingFactor", () => {
  it("calculates factor when scaling up", () => {
    expect(calculateScalingFactor(2, 4)).toBe(2);
    expect(calculateScalingFactor(4, 6)).toBe(1.5);
  });

  it("calculates factor when scaling down", () => {
    expect(calculateScalingFactor(4, 2)).toBe(0.5);
    expect(calculateScalingFactor(6, 2)).toBeCloseTo(0.333, 3);
  });

  it("calculates factor when no change", () => {
    expect(calculateScalingFactor(4, 4)).toBe(1);
  });

  it("handles edge case: originalServings is 0 or negative", () => {
    expect(calculateScalingFactor(0, 4)).toBe(1);
    expect(calculateScalingFactor(-1, 4)).toBe(1);
  });

  it("handles edge case: newServings is 0 or negative", () => {
    expect(calculateScalingFactor(4, 0)).toBe(0);
    expect(calculateScalingFactor(4, -1)).toBe(0);
  });
});

describe("getScalingDirection", () => {
  it("returns 'up' when new > original", () => {
    expect(getScalingDirection(2, 4)).toBe("up");
  });

  it("returns 'down' when new < original", () => {
    expect(getScalingDirection(4, 2)).toBe("down");
  });

  it("returns 'none' when new === original", () => {
    expect(getScalingDirection(2, 2)).toBe("none");
  });
});

describe("formatScalingChange", () => {
  it("returns common factors correctly", () => {
    expect(formatScalingChange(2, 4)).toBe("Double (2x)");
    expect(formatScalingChange(2, 6)).toBe("Triple (3x)");
    expect(formatScalingChange(2, 8)).toBe("Quadruple (4x)");
    expect(formatScalingChange(4, 2)).toBe("Half (0.5x)");
    expect(formatScalingChange(6, 2)).toBe("Third (0.33x)");
    expect(formatScalingChange(8, 2)).toBe("Quarter (0.25x)");
  });

  it("returns 'No change' when new === original", () => {
    expect(formatScalingChange(4, 4)).toBe("No change");
  });

  it("formats non-common factors correctly", () => {
    expect(formatScalingChange(2, 5)).toBe("Scale up (2.50x)");
    expect(formatScalingChange(5, 2)).toBe("Scale down (0.40x)");
  });
});

describe("isValidServingSize", () => {
  it("returns true for valid positive numbers", () => {
    expect(isValidServingSize(1)).toBe(true);
    expect(isValidServingSize(2.5)).toBe(true);
    expect(isValidServingSize(100)).toBe(true);
  });

  it("returns false for 0 or negative numbers", () => {
    expect(isValidServingSize(0)).toBe(false);
    expect(isValidServingSize(-1)).toBe(false);
  });

  it("returns false for non-numbers, NaN, Infinity", () => {
    expect(isValidServingSize("2" as any)).toBe(false);
    expect(isValidServingSize(NaN)).toBe(false);
    expect(isValidServingSize(Infinity)).toBe(false);
    expect(isValidServingSize(null as any)).toBe(false);
    expect(isValidServingSize(undefined as any)).toBe(false);
  });
});

describe("adjustToCommonFraction", () => {
  it("returns whole numbers unchanged", () => {
    expect(adjustToCommonFraction(1)).toBe(1);
    expect(adjustToCommonFraction(5)).toBe(5);
  });

  it("adjusts decimals very close to common fractions", () => {
    // 0.333 is close to 1/3 (0.3333...)
    expect(adjustToCommonFraction(0.33)).toBeCloseTo(1 / 3, 5);
    // 0.667 is close to 2/3 (0.6666...)
    expect(adjustToCommonFraction(0.67)).toBeCloseTo(2 / 3, 5);
    // 1.5 is already a common fraction (1/2 fractional)
    expect(adjustToCommonFraction(1.5)).toBe(1.5);
    // 0.26 is close to 1/4 (0.25)
    expect(adjustToCommonFraction(0.26)).toBe(0.25);
    // 0.13 is close to 1/8 (0.125)
    expect(adjustToCommonFraction(0.13)).toBe(0.125);
  });

  it("returns the original decimal if not close to common fraction", () => {
    // 0.42 is not close enough to 3/8 (0.375) or 1/2 (0.5)
    expect(adjustToCommonFraction(0.42)).toBe(0.42);
    // 0.95 is not close enough to 7/8 (0.875) or 1
    expect(adjustToCommonFraction(0.95)).toBe(0.95);
  });
});
