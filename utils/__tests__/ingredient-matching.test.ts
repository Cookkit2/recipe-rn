import { isIngredientMatch } from "../ingredient-matching";

describe("isIngredientMatch", () => {
  describe("Happy paths", () => {
    it("should match direct equality", () => {
      expect(isIngredientMatch("Milk", "milk")).toBe(true);
      expect(isIngredientMatch("Chicken Breast", "chicken breast")).toBe(true);
    });

    it("should match using provided DB synonyms", () => {
      expect(isIngredientMatch("Milk", "whole milk", ["whole milk"])).toBe(true);
      expect(isIngredientMatch("Salt", "sea salt", ["sea salt", "kosher salt"])).toBe(true);
    });

    it("should match using substring contains", () => {
      expect(isIngredientMatch("Apple", "apple cider")).toBe(true);
      expect(isIngredientMatch("apple cider", "Apple")).toBe(true);
    });

    it("should match using keyword extraction", () => {
      // "fresh" is a stop word, "red" and "apples" are keywords
      expect(isIngredientMatch("fresh red apples", "red apples")).toBe(true);
    });

    it("should match using built-in synonym map", () => {
      expect(isIngredientMatch("white rice", "steamed rice")).toBe(true); // both map to 'rice'
      expect(isIngredientMatch("ground beef", "beef steak")).toBe(true); // both map to 'beef'
    });
  });

  describe("Edge cases and Error conditions", () => {
    it("should handle empty strings", () => {
      expect(isIngredientMatch("", "")).toBe(true); // direct match
      expect(isIngredientMatch("milk", "")).toBe(false);
      expect(isIngredientMatch("", "milk")).toBe(false);
    });

    it("should handle strings that consist entirely of stop words", () => {
      // "fresh raw" vs "fresh organic"
      // Neither includes the other.
      // Keywords for both will be empty arrays.
      // They should not match because they have no common keywords and no synonyms.
      expect(isIngredientMatch("fresh raw", "fresh organic")).toBe(false);
      expect(isIngredientMatch("organic", "organic")).toBe(true); // direct match
    });

    it("should handle short words correctly (words <= 2 chars are filtered)", () => {
      expect(isIngredientMatch("a b c", "a b c")).toBe(true); // direct match
      expect(isIngredientMatch("big a b c", "big")).toBe(true);
      // "an ox" contains "ox" so it returns true from contains match.
      expect(isIngredientMatch("an ox", "ox")).toBe(true);
    });

    it("should filter out short words during keyword extraction", () => {
      // "oil of olive" -> "oil", "olive". "olive oil" -> "olive", "oil"
      expect(isIngredientMatch("oil of olive", "olive oil")).toBe(true);
      // "xy" is short and filtered. "apple" is kept.
      expect(isIngredientMatch("xy apple", "apple zq")).toBe(true);
    });

    it("should handle separators properly during split", () => {
      expect(isIngredientMatch("milk,cheese", "milk")).toBe(true);
      expect(isIngredientMatch("milk-cheese", "cheese")).toBe(true);
      expect(isIngredientMatch("milk(cheese)", "milk")).toBe(true);
      expect(isIngredientMatch("milk cheese", "cheese")).toBe(true);
    });

    it("should not match completely unrelated ingredients", () => {
      expect(isIngredientMatch("milk", "chicken")).toBe(false);
      expect(isIngredientMatch("salt", "pepper")).toBe(false);
    });

    it("should handle special characters gracefully", () => {
      expect(isIngredientMatch("100% juice!", "juice")).toBe(true);
      expect(isIngredientMatch("milk & honey", "milk")).toBe(true);
    });

    it("should handle very long whitespace", () => {
      expect(isIngredientMatch("   milk   ", "milk")).toBe(true);
      expect(isIngredientMatch("milk", "   milk   ")).toBe(true);
    });
  });
});
