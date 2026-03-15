import { scaleRecipeIngredients } from "../recipe-scaling";

describe("recipe-scaling", () => {
  describe("scaleRecipeIngredients", () => {
    it("should scale ingredients up correctly", () => {
      const ingredients = [
        { id: "1", name: "Flour", quantity: 100, unit: "g" },
        { id: "2", name: "Sugar", quantity: 50, unit: "g" },
      ];
      const scaled = scaleRecipeIngredients(ingredients, 2, 4);
      expect(scaled).toEqual([
        { id: "1", name: "Flour", quantity: 200, unit: "g" },
        { id: "2", name: "Sugar", quantity: 100, unit: "g" },
      ]);
      // Verify original array is not mutated
      expect(ingredients[0]!.quantity).toBe(100);
    });

    it("should scale ingredients down correctly", () => {
      const ingredients = [
        { id: "1", name: "Flour", quantity: 100, unit: "g" },
        { id: "2", name: "Sugar", quantity: 50, unit: "g" },
      ];
      const scaled = scaleRecipeIngredients(ingredients, 4, 2);
      expect(scaled).toEqual([
        { id: "1", name: "Flour", quantity: 50, unit: "g" },
        { id: "2", name: "Sugar", quantity: 25, unit: "g" },
      ]);
    });

    it("should return empty array when ingredients is empty", () => {
      const scaled = scaleRecipeIngredients([], 2, 4);
      expect(scaled).toEqual([]);
    });

    it("should return empty array when ingredients is null or undefined", () => {
      expect(scaleRecipeIngredients(null as any, 2, 4)).toEqual([]);
      expect(scaleRecipeIngredients(undefined as any, 2, 4)).toEqual([]);
    });

    it("should return original ingredients if originalServings is 0 or negative", () => {
      const ingredients = [{ quantity: 100 }];
      expect(scaleRecipeIngredients(ingredients, 0, 4)).toBe(ingredients);
      expect(scaleRecipeIngredients(ingredients, -2, 4)).toBe(ingredients);
    });

    it("should return original ingredients if newServings is 0 or negative", () => {
      const ingredients = [{ quantity: 100 }];
      expect(scaleRecipeIngredients(ingredients, 2, 0)).toBe(ingredients);
      expect(scaleRecipeIngredients(ingredients, 2, -2)).toBe(ingredients);
    });

    it("should preserve quantities when servings are the same", () => {
      const ingredients = [
        { id: "1", name: "Flour", quantity: 100, unit: "g" },
        { id: "2", name: "Sugar", quantity: 50, unit: "g" },
      ];
      const scaled = scaleRecipeIngredients(ingredients, 2, 2);
      expect(scaled).toEqual(ingredients);

      // Array and objects should be new references due to mapping
      expect(scaled).not.toBe(ingredients);
      expect(scaled[0]).not.toBe(ingredients[0]);
    });

    it("should handle ingredients with quantity 0", () => {
      const ingredients = [{ id: "1", name: "Salt to taste", quantity: 0, unit: "g" }];
      const scaled = scaleRecipeIngredients(ingredients, 2, 4);
      expect(scaled).toEqual([{ id: "1", name: "Salt to taste", quantity: 0, unit: "g" }]);
    });

    it("should handle decimal scaling factors and round appropriately", () => {
      const ingredients = [{ quantity: 10 }]; // 10
      // 10 * (3 / 4) = 7.5
      expect(scaleRecipeIngredients(ingredients, 4, 3)).toEqual([{ quantity: 7.5 }]);

      const ingredients2 = [{ quantity: 10 }];
      // 10 * (1 / 3) = 3.333333... rounded to 2 decimals -> 3.33
      expect(scaleRecipeIngredients(ingredients2, 3, 1)).toEqual([{ quantity: 3.33 }]);
    });
  });
});
