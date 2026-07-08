import { aggregateQuantities } from "../quantity-comparison";

describe("quantity-comparison", () => {
  describe("aggregateQuantities", () => {
    it("should handle empty or undefined input", () => {
      expect(aggregateQuantities([])).toBe(0);
      expect(aggregateQuantities(null as any)).toBe(0);
    });

    it("should aggregate quantities with the same unit correctly", () => {
      const items = [
        { quantity: 100, unit: "g" },
        { quantity: 200, unit: "g" },
      ];
      expect(aggregateQuantities(items)).toBe(300);
    });

    it("should aggregate compatible units correctly (weight)", () => {
      const items = [
        { quantity: 1, unit: "kg" },
        { quantity: 500, unit: "g" },
      ];
      expect(aggregateQuantities(items)).toBe(1500); // base unit is g
    });

    it("should aggregate compatible units correctly (volume)", () => {
      const items = [
        { quantity: 1, unit: "l" },
        { quantity: 500, unit: "ml" },
      ];
      expect(aggregateQuantities(items)).toBe(1500); // base unit is ml
    });

    it("should return null for incompatible units", () => {
      const items = [
        { quantity: 100, unit: "g" },
        { quantity: 100, unit: "ml" },
      ];
      expect(aggregateQuantities(items)).toBeNull();
    });

    it("should return null for unknown units", () => {
      const items = [
        { quantity: 1, unit: "unknown" },
        { quantity: 2, unit: "unknown" },
      ];
      expect(aggregateQuantities(items)).toBeNull();
    });

    it("should return null for invalid inputs", () => {
      const items1 = [{ quantity: NaN, unit: "g" }];
      const items2 = [{ quantity: 100, unit: "" }];

      expect(aggregateQuantities(items1)).toBeNull();
      expect(aggregateQuantities(items2)).toBeNull();
    });
  });
});
