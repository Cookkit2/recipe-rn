import { quickCookingCheck } from "../youtube-utils";

describe("quickCookingCheck", () => {
  it("identifies strong cooking-related titles", () => {
    // 3 unique matches = confidence 1.0 (isCooking: true)
    const result = quickCookingCheck("How to Cook a Perfect Steak Recipe for Dinner");
    expect(result.isCooking).toBe(true);
    expect(result.confidence).toBe(1.0);
  });

  it("identifies moderate cooking-related titles", () => {
    // 1 match = confidence ~0.33 (isCooking: true)
    const result = quickCookingCheck("My Favorite Chicken");
    expect(result.isCooking).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.33);
    expect(result.confidence).toBeLessThan(0.34);
  });

  it("rejects non-cooking titles", () => {
    // 0 matches = confidence 0 (isCooking: false)
    const result = quickCookingCheck("Latest Tech Review 2024");
    expect(result.isCooking).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it("handles empty titles", () => {
    const result = quickCookingCheck("");
    expect(result.isCooking).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it("counts unique keywords only", () => {
    // "chicken" appears 3 times, but only counts as 1 unique match
    // confidence should be ~0.33
    const result = quickCookingCheck("Chicken chicken CHICKEN");
    expect(result.isCooking).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.33);
    expect(result.confidence).toBeLessThan(0.34);
  });

  it("is case insensitive", () => {
    // 2 unique matches = confidence ~0.66
    const result = quickCookingCheck("RECIPE for HOMEMADE bread");
    expect(result.isCooking).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.66);
    expect(result.confidence).toBeLessThan(0.67);
  });

  it("handles partial word boundaries correctly", () => {
    const result = quickCookingCheck("Uncooked or overcooked?");
    expect(result.isCooking).toBe(false);
    expect(result.confidence).toBe(0);
  });
});
