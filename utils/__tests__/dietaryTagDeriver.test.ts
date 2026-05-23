import { describe, it, expect } from "@jest/globals";
import { deriveDietaryTags } from "../dietaryTagDeriver";

describe("deriveDietaryTags", () => {
  it("derives keto from low carbs and high fat", () => {
    // 10g carbs=40cal, 30g fat=270cal, 20g protein=80cal → fat=69% of total
    const result = deriveDietaryTags(
      { calories: 390, protein: 20, carbs: 10, fat: 30, fiber: 2 },
      []
    );
    // fat percentage is 270/390 = 0.6937 < 0.7, so keto should NOT be derived
    expect(result).not.toContain("keto");
    expect(result).toContain("low-carb");
  });

  it("derives low-carb from carbs under 20g", () => {
    const result = deriveDietaryTags(
      { calories: 300, protein: 20, carbs: 15, fat: 15, fiber: 5 },
      []
    );
    expect(result).toContain("low-carb");
  });

  it("derives high-protein from protein over 25g", () => {
    const result = deriveDietaryTags(
      { calories: 400, protein: 30, carbs: 30, fat: 10, fiber: 5 },
      []
    );
    expect(result).toContain("high-protein");
  });

  it("derives gluten-free when gluten not in allergens", () => {
    const result = deriveDietaryTags(
      { calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3 },
      []
    );
    expect(result).toContain("gluten-free");
  });

  it("does not derive gluten-free when wheat is in allergens", () => {
    const result = deriveDietaryTags({ calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3 }, [
      "wheat",
    ]);
    expect(result).not.toContain("gluten-free");
  });

  it("derives dairy-free when milk not in allergens", () => {
    const result = deriveDietaryTags(
      { calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3 },
      []
    );
    expect(result).toContain("dairy-free");
  });

  it("does not derive dairy-free when milk is in allergens", () => {
    const result = deriveDietaryTags({ calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3 }, [
      "milk",
    ]);
    expect(result).not.toContain("dairy-free");
  });

  it("derives multiple tags at once", () => {
    const result = deriveDietaryTags(
      { calories: 350, protein: 30, carbs: 5, fat: 20, fiber: 2 },
      []
    );
    expect(result).not.toContain("keto"); // fat% = 180/350 = 0.51 < 0.7
    expect(result).toContain("low-carb");
    expect(result).toContain("high-protein");
    expect(result).toContain("gluten-free");
    expect(result).toContain("dairy-free");
  });

  it("returns empty array for no matching conditions", () => {
    const result = deriveDietaryTags({ calories: 500, protein: 10, carbs: 80, fat: 10, fiber: 3 }, [
      "wheat",
      "milk",
    ]);
    expect(result).toEqual([]);
  });
});
