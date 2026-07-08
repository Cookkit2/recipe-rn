import {
  calculateScalingFactor,
  scaleRecipeIngredients,
  getScalingDirection,
  formatScalingChange,
  isValidServingSize,
  scaleIngredientQuantity,
  adjustToCommonFraction,
} from "../recipe-scaling";

describe("recipe-scaling", () => {
  describe("calculateScalingFactor", () => {
    it("should calculate correct scaling factor for scaling up", () => {
      expect(calculateScalingFactor(2, 4)).toBe(2);
      expect(calculateScalingFactor(4, 10)).toBe(2.5);
    });

    it("should calculate correct scaling factor for scaling down", () => {
      expect(calculateScalingFactor(4, 2)).toBe(0.5);
      expect(calculateScalingFactor(10, 2)).toBe(0.2);
    });

    it("should return 1 when originalServings is less than or equal to 0", () => {
      expect(calculateScalingFactor(0, 4)).toBe(1);
      expect(calculateScalingFactor(-2, 4)).toBe(1);
    });

    it("should return 0 when newServings is less than or equal to 0", () => {
      expect(calculateScalingFactor(4, 0)).toBe(0);
      expect(calculateScalingFactor(4, -2)).toBe(0);
    });

    it("should return 1 when originalServings equals newServings", () => {
      expect(calculateScalingFactor(4, 4)).toBe(1);
    });
  });

  describe("scaleIngredientQuantity", () => {
    it("should return 0 if quantity is 0", () => {
      expect(scaleIngredientQuantity(0, 2, 4)).toBe(0);
    });

    it("should return original quantity if originalServings is invalid", () => {
      expect(scaleIngredientQuantity(100, 0, 4)).toBe(100);
      expect(scaleIngredientQuantity(100, -1, 4)).toBe(100);
    });

    it("should return 0 if newServings is invalid", () => {
      expect(scaleIngredientQuantity(100, 2, 0)).toBe(0);
      expect(scaleIngredientQuantity(100, 2, -1)).toBe(0);
    });

    it("should return original quantity if servings are equal", () => {
      expect(scaleIngredientQuantity(100, 2, 2)).toBe(100);
    });

    it("should scale quantity up correctly", () => {
      expect(scaleIngredientQuantity(100, 2, 4)).toBe(200);
      expect(scaleIngredientQuantity(50, 4, 10)).toBe(125);
    });

    it("should scale quantity down correctly", () => {
      expect(scaleIngredientQuantity(100, 4, 2)).toBe(50);
      expect(scaleIngredientQuantity(100, 10, 2)).toBe(20);
    });

    it("should round to 2 decimal places max", () => {
      expect(scaleIngredientQuantity(3, 2, 3)).toBe(4.5); // 4.5
      expect(scaleIngredientQuantity(1, 3, 1)).toBe(0.33); // 0.333...
      expect(scaleIngredientQuantity(1, 8, 1)).toBe(0.13); // 0.125 -> 0.13
    });
  });

  describe("scaleRecipeIngredients", () => {
    it("should correctly scale up ingredient quantities", () => {
      const ingredients = [
        { id: 1, quantity: 100 },
        { id: 2, quantity: 2 },
      ];
      const result = scaleRecipeIngredients(ingredients, 2, 4);
      expect(result).toEqual([
        { id: 1, quantity: 200 },
        { id: 2, quantity: 4 },
      ]);
    });

    it("should correctly scale down ingredient quantities", () => {
      const ingredients = [
        { id: 1, quantity: 100 },
        { id: 2, quantity: 2 },
      ];
      const result = scaleRecipeIngredients(ingredients, 4, 2);
      expect(result).toEqual([
        { id: 1, quantity: 50 },
        { id: 2, quantity: 1 },
      ]);
    });

    it("should return empty array if ingredients array is empty or undefined", () => {
      expect(scaleRecipeIngredients([], 2, 4)).toEqual([]);
      // @ts-ignore
      expect(scaleRecipeIngredients(undefined, 2, 4)).toEqual([]);
    });

    it("should return original ingredients if originalServings or newServings is invalid", () => {
      const ingredients = [{ id: 1, quantity: 100 }];
      expect(scaleRecipeIngredients(ingredients, 0, 4)).toEqual(ingredients);
      expect(scaleRecipeIngredients(ingredients, 2, 0)).toEqual(ingredients);
    });

    it("should correctly round quantities to max 2 decimals", () => {
      const ingredients = [{ id: 1, quantity: 3 }];
      const result = scaleRecipeIngredients(ingredients, 2, 3);
      // scale factor = 1.5, quantity = 4.5
      expect(result).toEqual([{ id: 1, quantity: 4.5 }]);

      const ingredients2 = [{ id: 1, quantity: 1 }];
      const result2 = scaleRecipeIngredients(ingredients2, 3, 1);
      // scale factor = 1/3, quantity = 0.3333333 -> 0.33
      expect(result2).toEqual([{ id: 1, quantity: 0.33 }]);
    });
  });

  describe("getScalingDirection", () => {
    it("should return 'none' when servings are equal", () => {
      expect(getScalingDirection(4, 4)).toBe("none");
    });

    it("should return 'up' when new servings are greater than original", () => {
      expect(getScalingDirection(2, 4)).toBe("up");
    });

    it("should return 'down' when new servings are less than original", () => {
      expect(getScalingDirection(4, 2)).toBe("down");
    });
  });

  describe("formatScalingChange", () => {
    it("should return 'No change' when servings are equal", () => {
      expect(formatScalingChange(4, 4)).toBe("No change");
    });

    it("should format common fractions correctly", () => {
      expect(formatScalingChange(2, 4)).toBe("Double (2x)");
      expect(formatScalingChange(2, 6)).toBe("Triple (3x)");
      expect(formatScalingChange(2, 8)).toBe("Quadruple (4x)");
      expect(formatScalingChange(4, 2)).toBe("Half (0.5x)");
      expect(formatScalingChange(3, 1)).toBe("Third (0.33x)");
      expect(formatScalingChange(4, 1)).toBe("Quarter (0.25x)");
    });

    it("should fallback to default format for non-common factors", () => {
      expect(formatScalingChange(2, 5)).toBe("Scale up (2.50x)");
      expect(formatScalingChange(5, 2)).toBe("Scale down (0.40x)");
    });
  });

  describe("isValidServingSize", () => {
    it("should return true for valid serving sizes", () => {
      expect(isValidServingSize(1)).toBe(true);
      expect(isValidServingSize(4.5)).toBe(true);
      expect(isValidServingSize(100)).toBe(true);
    });

    it("should return false for invalid serving sizes", () => {
      expect(isValidServingSize(0)).toBe(false);
      expect(isValidServingSize(-1)).toBe(false);
      expect(isValidServingSize(NaN)).toBe(false);
      expect(isValidServingSize(Infinity)).toBe(false);
      // @ts-ignore
      expect(isValidServingSize("4")).toBe(false);
      // @ts-ignore
      expect(isValidServingSize(null)).toBe(false);
      // @ts-ignore
      expect(isValidServingSize(undefined)).toBe(false);
    });
  });

  describe("adjustToCommonFraction", () => {
    it("should return the original quantity if it is a whole number", () => {
      expect(adjustToCommonFraction(1)).toBe(1);
      expect(adjustToCommonFraction(5)).toBe(5);
    });

    it("should adjust to common fractions if within tolerance", () => {
      expect(adjustToCommonFraction(0.33)).toBeCloseTo(1 / 3, 5); // 0.333...
      expect(adjustToCommonFraction(1.33)).toBeCloseTo(1 + 1 / 3, 5);
      expect(adjustToCommonFraction(0.51)).toBeCloseTo(0.5, 5);
      expect(adjustToCommonFraction(0.49)).toBeCloseTo(0.5, 5);
      expect(adjustToCommonFraction(0.74)).toBeCloseTo(0.75, 5);
      expect(adjustToCommonFraction(2.26)).toBeCloseTo(2.25, 5);
    });

    it("should return the original quantity if not within tolerance of a common fraction", () => {
      expect(adjustToCommonFraction(0.4)).toBe(0.4);
      expect(adjustToCommonFraction(1.8)).toBe(1.8);
      expect(adjustToCommonFraction(0.1)).toBe(0.1);
    });
  });
});
