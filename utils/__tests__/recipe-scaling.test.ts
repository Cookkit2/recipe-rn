import { scaleRecipeIngredients } from "../recipe-scaling";

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

  it("returns original ingredients if newServings is <= 0", () => {
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
