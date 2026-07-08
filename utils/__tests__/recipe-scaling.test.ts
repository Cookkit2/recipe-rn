import { getScalingDirection, isValidServingSize, scaleRecipeIngredients } from "../recipe-scaling";

describe("getScalingDirection", () => {
  it('should return "none" when original and new servings are the same', () => {
    expect(getScalingDirection(4, 4)).toBe("none");
    expect(getScalingDirection(1, 1)).toBe("none");
    expect(getScalingDirection(10, 10)).toBe("none");
  });

  it('should return "up" when new servings are greater than original servings', () => {
    expect(getScalingDirection(2, 4)).toBe("up");
    expect(getScalingDirection(4, 6)).toBe("up");
    expect(getScalingDirection(1, 10)).toBe("up");
  });

  it('should return "down" when new servings are less than original servings', () => {
    expect(getScalingDirection(4, 2)).toBe("down");
    expect(getScalingDirection(6, 4)).toBe("down");
    expect(getScalingDirection(10, 1)).toBe("down");
  });
});

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

describe("scaleRecipeIngredients", () => {
  const baseIngredients = [
    { id: 1, name: "Flour", quantity: 100, unit: "g" },
    { id: 2, name: "Sugar", quantity: 50, unit: "g" },
    { id: 3, name: "Salt", quantity: 0, unit: "g" },
  ];

  it("scales ingredients up correctly", () => {
    const result = scaleRecipeIngredients(baseIngredients, 2, 4);
    expect(result).toHaveLength(3);
    expect(result[0]?.quantity).toBe(200);
    expect(result[1]?.quantity).toBe(100);
    expect(result[2]?.quantity).toBe(0);
    expect(result[0]?.name).toBe("Flour");
  });

  it("scales ingredients down correctly", () => {
    const result = scaleRecipeIngredients(baseIngredients, 4, 2);
    expect(result).toHaveLength(3);
    expect(result[0]?.quantity).toBe(50);
    expect(result[1]?.quantity).toBe(25);
    expect(result[2]?.quantity).toBe(0);
  });

  it("returns original ingredients if originalServings is <= 0", () => {
    const result = scaleRecipeIngredients(baseIngredients, 0, 4);
    expect(result).toBe(baseIngredients);
  });

  it("returns ingredients with 0 quantity if newServings is <= 0", () => {
    const result = scaleRecipeIngredients(baseIngredients, 2, 0);
    expect(result).toBe(baseIngredients);
  });

  it("handles empty or undefined ingredients array", () => {
    expect(scaleRecipeIngredients([], 2, 4)).toEqual([]);
    // @ts-ignore
    expect(scaleRecipeIngredients(null, 2, 4)).toEqual([]);
  });

  it("rounds to max 2 decimal places", () => {
    const ingredients = [{ name: "Ingredient", quantity: 10 }];
    const result = scaleRecipeIngredients(ingredients, 7, 3);
    expect(result[0]?.quantity).toBe(4.29);
  });

  it("returns the same quantities when original and new servings match", () => {
    const result = scaleRecipeIngredients(baseIngredients, 2, 2);
    expect(result[0]?.quantity).toBe(100);
    expect(result[1]?.quantity).toBe(50);
  });
});
