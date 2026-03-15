import {
  scaleIngredientQuantity,
  scaleRecipeIngredients,
  calculateScalingFactor,
  getScalingDirection,
  formatScalingChange,
  isValidServingSize,
  adjustToCommonFraction,
} from "../recipe-scaling";

describe("recipe-scaling", () => {
  describe("adjustToCommonFraction", () => {
    it("should return whole numbers as is", () => {
      expect(adjustToCommonFraction(1)).toBe(1);
      expect(adjustToCommonFraction(5)).toBe(5);
      expect(adjustToCommonFraction(0)).toBe(0);
    });

    it("should adjust to common fractions when very close", () => {
      // 1/2 = 0.5
      expect(adjustToCommonFraction(0.501)).toBeCloseTo(0.5, 5);
      expect(adjustToCommonFraction(0.499)).toBeCloseTo(0.5, 5);

      // 1/3 = 0.33333... but commonFractions has 0.333
      // adjustToCommonFraction(0.33) should match 0.333 (diff 0.003 < 0.02)
      expect(adjustToCommonFraction(0.33)).toBeCloseTo(1 / 3, 5);

      // 1/4 = 0.25
      expect(adjustToCommonFraction(0.26)).toBeCloseTo(0.25, 5);
      expect(adjustToCommonFraction(0.24)).toBeCloseTo(0.25, 5);
    });

    it("should handle whole numbers plus common fractions", () => {
      // 1 1/2 = 1.5
      expect(adjustToCommonFraction(1.505)).toBeCloseTo(1.5, 5);
      // 2 1/4 = 2.25
      expect(adjustToCommonFraction(2.245)).toBeCloseTo(2.25, 5);
    });

    it("should not adjust if not close to a common fraction", () => {
      // 0.4 is not within 0.02 of 0.375 (3/8) or 0.5 (1/2)
      expect(adjustToCommonFraction(0.4)).toBe(0.4);
      expect(adjustToCommonFraction(0.1)).toBe(0.1);
    });

    it("should handle all defined common fractions", () => {
      const cases = [
        { input: 0.06, expected: 1 / 16 },
        { input: 0.12, expected: 1 / 8 },
        { input: 0.18, expected: 3 / 16 },
        { input: 0.25, expected: 1 / 4 },
        { input: 0.33, expected: 1 / 3 },
        { input: 0.37, expected: 3 / 8 },
        { input: 0.51, expected: 1 / 2 },
        { input: 0.62, expected: 5 / 8 },
        { input: 0.66, expected: 2 / 3 },
        { input: 0.74, expected: 3 / 4 },
        { input: 0.88, expected: 7 / 8 },
      ];

      cases.forEach(({ input, expected }) => {
        expect(adjustToCommonFraction(input)).toBeCloseTo(expected, 5);
      });
    });
  });

  describe("scaleIngredientQuantity", () => {
    it("should scale quantity correctly", () => {
      expect(scaleIngredientQuantity(1, 2, 4)).toBe(2);
      expect(scaleIngredientQuantity(100, 4, 2)).toBe(50);
    });

    it("should handle zero quantity", () => {
      expect(scaleIngredientQuantity(0, 2, 4)).toBe(0);
    });

    it("should handle invalid servings", () => {
      expect(scaleIngredientQuantity(10, 0, 4)).toBe(10);
      expect(scaleIngredientQuantity(10, 4, 0)).toBe(0);
    });

    it("should return original quantity if servings are same", () => {
      expect(scaleIngredientQuantity(10, 4, 4)).toBe(10);
    });

    it("should round to 2 decimals", () => {
      // 1 * (1/3) = 0.3333... -> 0.33
      expect(scaleIngredientQuantity(1, 3, 1)).toBe(0.33);
      // 1 * (2/3) = 0.6666... -> 0.67
      expect(scaleIngredientQuantity(1, 3, 2)).toBe(0.67);
    });
  });

  describe("scaleRecipeIngredients", () => {
    it("should scale an array of ingredients", () => {
      const ingredients = [
        { name: "Sugar", quantity: 100 },
        { name: "Flour", quantity: 200 },
      ];
      const scaled = scaleRecipeIngredients(ingredients, 1, 2);
      expect(scaled).toEqual([
        { name: "Sugar", quantity: 200 },
        { name: "Flour", quantity: 400 },
      ]);
    });

    it("should handle empty or null ingredients", () => {
      expect(scaleRecipeIngredients([], 1, 2)).toEqual([]);
      expect(scaleRecipeIngredients(null as any, 1, 2)).toEqual([]);
    });

    it("should return original ingredients for invalid servings", () => {
      const ingredients = [{ quantity: 10 }];
      expect(scaleRecipeIngredients(ingredients, 0, 2)).toEqual(ingredients);
      expect(scaleRecipeIngredients(ingredients, 2, 0)).toEqual(ingredients);
    });
  });

  describe("calculateScalingFactor", () => {
    it("should calculate correct scaling factor", () => {
      expect(calculateScalingFactor(2, 4)).toBe(2);
      expect(calculateScalingFactor(4, 2)).toBe(0.5);
      expect(calculateScalingFactor(4, 4)).toBe(1);
    });

    it("should handle invalid servings", () => {
      expect(calculateScalingFactor(0, 4)).toBe(1);
      expect(calculateScalingFactor(4, 0)).toBe(0);
    });
  });

  describe("getScalingDirection", () => {
    it("should return correct direction", () => {
      expect(getScalingDirection(2, 4)).toBe("up");
      expect(getScalingDirection(4, 2)).toBe("down");
      expect(getScalingDirection(4, 4)).toBe("none");
    });
  });

  describe("formatScalingChange", () => {
    it("should format common scaling factors", () => {
      expect(formatScalingChange(1, 2)).toBe("Double (2x)");
      expect(formatScalingChange(1, 3)).toBe("Triple (3x)");
      expect(formatScalingChange(1, 4)).toBe("Quadruple (4x)");
      expect(formatScalingChange(2, 1)).toBe("Half (0.5x)");
      expect(formatScalingChange(3, 1)).toBe("Third (0.33x)");
      expect(formatScalingChange(4, 1)).toBe("Quarter (0.25x)");
    });

    it("should handle no change", () => {
      expect(formatScalingChange(4, 4)).toBe("No change");
    });

    it("should format uncommon factors", () => {
      expect(formatScalingChange(1, 1.5)).toBe("Scale up (1.50x)");
      expect(formatScalingChange(2, 1.5)).toBe("Scale down (0.75x)");
    });
  });

  describe("isValidServingSize", () => {
    it("should validate serving sizes correctly", () => {
      expect(isValidServingSize(1)).toBe(true);
      expect(isValidServingSize(10.5)).toBe(true);
      expect(isValidServingSize(0)).toBe(false);
      expect(isValidServingSize(-1)).toBe(false);
      expect(isValidServingSize(NaN)).toBe(false);
      expect(isValidServingSize(Infinity)).toBe(false);
      expect(isValidServingSize("1" as any)).toBe(false);
    });
  });
});
