import { aggregateNutrition, sumNutrition } from "../nutritionAggregation";

describe("aggregateNutrition", () => {
  it("returns an empty summary when given an empty array", () => {
    const result = aggregateNutrition([]);
    expect(result).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
  });

  it("correctly sums nutrition fields across multiple inputs", () => {
    const recipes = [
      { calories: 100, protein: 10, carbs: 20, fat: 5, fiber: 2 },
      { calories: 200, protein: 20, carbs: 40, fat: 10, fiber: 4 },
    ];
    const result = aggregateNutrition(recipes);
    expect(result).toEqual({
      calories: 300,
      protein: 30,
      carbs: 60,
      fat: 15,
      fiber: 6,
    });
  });

  it("handles missing or undefined fields by treating them as 0", () => {
    const recipes = [
      { calories: 100, protein: 10 }, // missing carbs, fat, fiber
      { carbs: 40, fat: 10, fiber: 4 }, // missing calories, protein
      {}, // missing everything
    ];
    const result = aggregateNutrition(recipes);
    expect(result).toEqual({
      calories: 100,
      protein: 10,
      carbs: 40,
      fat: 10,
      fiber: 4,
    });
  });

  it("applies the servingsMultiplier correctly", () => {
    const recipes = [
      { calories: 100, protein: 10, carbs: 20, fat: 5, fiber: 2 },
      { calories: 200, protein: 20, carbs: 40, fat: 10, fiber: 4 },
    ];
    const result = aggregateNutrition(recipes, 2);
    expect(result).toEqual({
      calories: 600,
      protein: 60,
      carbs: 120,
      fat: 30,
      fiber: 12,
    });
  });

  it("ignores null or undefined entries in the array", () => {
    const recipes = [
      { calories: 100, protein: 10, carbs: 20, fat: 5, fiber: 2 },
      undefined,
      null,
    ] as any;
    const result = aggregateNutrition(recipes);
    expect(result).toEqual({
      calories: 100,
      protein: 10,
      carbs: 20,
      fat: 5,
      fiber: 2,
    });
  });
});

describe("sumNutrition", () => {
  it("returns an empty summary when given an empty array", () => {
    const result = sumNutrition([]);
    expect(result).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
  });

  it("correctly sums nutrition fields across multiple summaries", () => {
    const summaries = [
      { calories: 100, protein: 10, carbs: 20, fat: 5, fiber: 2 },
      { calories: 200, protein: 20, carbs: 40, fat: 10, fiber: 4 },
    ];
    const result = sumNutrition(summaries);
    expect(result).toEqual({
      calories: 300,
      protein: 30,
      carbs: 60,
      fat: 15,
      fiber: 6,
    });
  });

  it("ignores null or undefined entries in the summaries array", () => {
    const summaries = [
      { calories: 100, protein: 10, carbs: 20, fat: 5, fiber: 2 },
      undefined,
      null,
    ] as any;
    const result = sumNutrition(summaries);
    expect(result).toEqual({
      calories: 100,
      protein: 10,
      carbs: 20,
      fat: 5,
      fiber: 2,
    });
  });
});
