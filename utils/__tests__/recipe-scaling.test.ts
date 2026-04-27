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
  describe("scaleIngredientQuantity", () => {
    it("should return 0 for zero quantity", () => {
      expect(scaleIngredientQuantity(0, 4, 8)).toBe(0);
    });

    it("should return original quantity for invalid original servings", () => {
      expect(scaleIngredientQuantity(100, 0, 8)).toBe(100);
      expect(scaleIngredientQuantity(100, -4, 8)).toBe(100);
    });

    it("should return 0 for invalid new servings", () => {
      expect(scaleIngredientQuantity(100, 4, 0)).toBe(0);
      expect(scaleIngredientQuantity(100, 4, -2)).toBe(0);
    });

    it("should return original quantity when servings are equal", () => {
      expect(scaleIngredientQuantity(100, 4, 4)).toBe(100);
    });

    it("should scale up correctly", () => {
      expect(scaleIngredientQuantity(100, 4, 8)).toBe(200); // Double
      expect(scaleIngredientQuantity(50, 2, 4)).toBe(100); // Double
      expect(scaleIngredientQuantity(1, 1, 3)).toBe(3); // Triple
    });

    it("should scale down correctly", () => {
      expect(scaleIngredientQuantity(200, 8, 4)).toBe(100); // Half
      expect(scaleIngredientQuantity(100, 4, 2)).toBe(50); // Half
    });

    it("should round to 2 decimal places", () => {
      expect(scaleIngredientQuantity(100, 3, 2)).toBe(66.67); // 100 * 2/3 = 66.666...
      expect(scaleIngredientQuantity(1, 3, 2)).toBe(0.67); // 1 * 2/3 = 0.666...
    });

    it("should handle fractional scaling", () => {
      expect(scaleIngredientQuantity(100, 4, 6)).toBe(150); // 1.5x
      expect(scaleIngredientQuantity(100, 6, 4)).toBe(66.67); // 0.666...x
    });
  });

  describe("scaleRecipeIngredients", () => {
    interface Ingredient {
      name: string;
      quantity: number;
    }

    it("should return empty array for empty input", () => {
      expect(scaleRecipeIngredients([], 4, 8)).toEqual([]);
    });

    it("should return original ingredients for invalid servings", () => {
      const ingredients: Ingredient[] = [
        { name: "Flour", quantity: 100 },
        { name: "Sugar", quantity: 50 },
      ];
      expect(scaleRecipeIngredients(ingredients, 0, 8)).toEqual(ingredients);
      expect(scaleRecipeIngredients(ingredients, 4, 0)).toEqual(ingredients);
    });

    it("should scale all ingredients", () => {
      const ingredients: Ingredient[] = [
        { name: "Flour", quantity: 100 },
        { name: "Sugar", quantity: 50 },
        { name: "Eggs", quantity: 2 },
      ];

      const result = scaleRecipeIngredients(ingredients, 4, 8);

      expect(result).toEqual([
        { name: "Flour", quantity: 200 },
        { name: "Sugar", quantity: 100 },
        { name: "Eggs", quantity: 4 },
      ]);
    });

    it("should preserve other properties", () => {
      interface ComplexIngredient {
        name: string;
        quantity: number;
        unit: string;
      }

      const ingredients: ComplexIngredient[] = [{ name: "Flour", quantity: 100, unit: "g" }];

      const result = scaleRecipeIngredients(ingredients, 4, 2);

      expect(result).toEqual([{ name: "Flour", quantity: 50, unit: "g" }]);
    });
  });

  describe("calculateScalingFactor", () => {
    it("should return 1 for invalid original servings", () => {
      expect(calculateScalingFactor(0, 8)).toBe(1);
      expect(calculateScalingFactor(-4, 8)).toBe(1);
    });

    it("should return 0 for invalid new servings", () => {
      expect(calculateScalingFactor(4, 0)).toBe(0);
      expect(calculateScalingFactor(4, -2)).toBe(0);
    });

    it("should return 1 for equal servings", () => {
      expect(calculateScalingFactor(4, 4)).toBe(1);
      expect(calculateScalingFactor(1, 1)).toBe(1);
    });

    it("should calculate scaling up factor", () => {
      expect(calculateScalingFactor(4, 8)).toBe(2);
      expect(calculateScalingFactor(2, 6)).toBe(3);
      expect(calculateScalingFactor(1, 5)).toBe(5);
    });

    it("should calculate scaling down factor", () => {
      expect(calculateScalingFactor(8, 4)).toBe(0.5);
      expect(calculateScalingFactor(6, 2)).toBeCloseTo(0.333, 3);
      expect(calculateScalingFactor(10, 5)).toBe(0.5);
    });

    it("should handle fractional factors", () => {
      expect(calculateScalingFactor(3, 2)).toBeCloseTo(0.667, 3);
      expect(calculateScalingFactor(2, 3)).toBe(1.5);
    });
  });

  describe("getScalingDirection", () => {
    it("should return 'none' for equal servings", () => {
      expect(getScalingDirection(4, 4)).toBe("none");
      expect(getScalingDirection(1, 1)).toBe("none");
    });

    it("should return 'up' for scaling up", () => {
      expect(getScalingDirection(4, 8)).toBe("up");
      expect(getScalingDirection(1, 10)).toBe("up");
    });

    it("should return 'down' for scaling down", () => {
      expect(getScalingDirection(8, 4)).toBe("down");
      expect(getScalingDirection(10, 1)).toBe("down");
    });
  });

  describe("formatScalingChange", () => {
    it("should return 'No change' for equal servings", () => {
      expect(formatScalingChange(4, 4)).toBe("No change");
      expect(formatScalingChange(1, 1)).toBe("No change");
    });

    it("should format common scaling factors", () => {
      expect(formatScalingChange(4, 8)).toBe("Double (2x)");
      expect(formatScalingChange(4, 12)).toBe("Triple (3x)");
      expect(formatScalingChange(4, 16)).toBe("Quadruple (4x)");
      expect(formatScalingChange(8, 4)).toBe("Half (0.5x)");
    });

    it("should format custom scaling factors", () => {
      expect(formatScalingChange(4, 6)).toBe("Scale up (1.50x)");
      expect(formatScalingChange(6, 4)).toBe("Scale down (0.67x)");
    });
  });

  describe("isValidServingSize", () => {
    it("should return true for positive numbers", () => {
      expect(isValidServingSize(1)).toBe(true);
      expect(isValidServingSize(4)).toBe(true);
      expect(isValidServingSize(100)).toBe(true);
      expect(isValidServingSize(0.5)).toBe(true);
    });

    it("should return false for zero or negative", () => {
      expect(isValidServingSize(0)).toBe(false);
      expect(isValidServingSize(-1)).toBe(false);
      expect(isValidServingSize(-4)).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isValidServingSize(NaN)).toBe(false);
    });

    it("should return false for Infinity", () => {
      expect(isValidServingSize(Infinity)).toBe(false);
      expect(isValidServingSize(-Infinity)).toBe(false);
    });
  });

  describe("adjustToCommonFraction", () => {
    it("should return whole numbers as is", () => {
      expect(adjustToCommonFraction(1)).toBe(1);
      expect(adjustToCommonFraction(2)).toBe(2);
      expect(adjustToCommonFraction(100)).toBe(100);
    });

    it("should adjust to common fractions", () => {
      expect(adjustToCommonFraction(0.25)).toBe(0.25); // 1/4
      expect(adjustToCommonFraction(0.5)).toBe(0.5); // 1/2
      expect(adjustToCommonFraction(0.75)).toBe(0.75); // 3/4
      expect(adjustToCommonFraction(0.33)).toBeCloseTo(1 / 3, 3);
    });

    it("should handle mixed numbers", () => {
      expect(adjustToCommonFraction(1.5)).toBe(1.5); // 1 1/2
      expect(adjustToCommonFraction(2.25)).toBe(2.25); // 2 1/4
    });

    it("should leave uncommon fractions as is", () => {
      const result = adjustToCommonFraction(0.4);
      expect(result).toBe(0.4);
    });
  });
});
