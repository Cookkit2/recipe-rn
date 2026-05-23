import { describe, it, expect } from "@jest/globals";
import { detectAllergens } from "../allergenDetection";

describe("detectAllergens", () => {
  it("detects dairy allergens", () => {
    expect(detectAllergens(["milk", "butter", "garlic"])).toContain("milk");
  });

  it("detects gluten allergens", () => {
    expect(detectAllergens(["wheat flour", "sugar", "eggs"])).toContain("wheat");
  });

  it("detects shellfish allergens", () => {
    expect(detectAllergens(["shrimp", "garlic", "olive oil"])).toContain("shellfish");
  });

  it("detects egg allergens", () => {
    expect(detectAllergens(["eggs", "sugar", "vanilla"])).toContain("eggs");
  });

  it("detects peanut allergens", () => {
    expect(detectAllergens(["peanut butter", "bread"])).toContain("peanuts");
  });

  it("detects nut allergens", () => {
    expect(detectAllergens(["almonds", "honey", "oats"])).toContain("nuts");
  });

  it("detects soy allergens", () => {
    expect(detectAllergens(["soy sauce", "ginger", "garlic"])).toContain("soy");
  });

  it("detects fish allergens", () => {
    expect(detectAllergens(["salmon fillet", "lemon", "dill"])).toContain("fish");
  });

  it("detects sesame allergens", () => {
    expect(detectAllergens(["sesame oil", "soy sauce"])).toContain("sesame");
  });

  it("detects multiple allergens from one ingredient list", () => {
    const result = detectAllergens(["milk", "wheat flour", "eggs", "shrimp"]);
    expect(result).toContain("milk");
    expect(result).toContain("wheat");
    expect(result).toContain("eggs");
    expect(result).toContain("shellfish");
    expect(result).toHaveLength(4);
  });

  it("returns empty array when no allergens detected", () => {
    expect(detectAllergens(["rice", "sugar", "salt", "water"])).toEqual([]);
  });

  it("handles empty ingredient list", () => {
    expect(detectAllergens([])).toEqual([]);
  });

  it("is case-insensitive", () => {
    expect(detectAllergens(["MILK", "Butter"])).toContain("milk");
  });
});
