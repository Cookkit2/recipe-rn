// Unit tests for quantity comparison utilities
import {
  compareQuantities,
  calculateDeficit,
  hasSufficientQuantity,
  aggregateQuantities,
  calculateAvailabilityPercentage,
  type QuantityComparisonResult,
} from "../quantity-comparison";

describe("quantity-comparison", () => {
  describe("compareQuantities", () => {
    describe("same unit comparisons", () => {
      it("should return sufficient when available equals required", () => {
        const result = compareQuantities(500, "g", 500, "g");
        expect(result.result).toBe("sufficient");
        expect(result.availableQuantity).toBe(500);
        expect(result.requiredQuantity).toBe(500);
        expect(result.deficit).toBeUndefined();
      });

      it("should return sufficient when available exceeds required", () => {
        const result = compareQuantities(750, "g", 500, "g");
        expect(result.result).toBe("sufficient");
        expect(result.availableQuantity).toBe(750);
        expect(result.requiredQuantity).toBe(500);
        expect(result.deficit).toBeUndefined();
      });

      it("should return insufficient when available is less than required", () => {
        const result = compareQuantities(200, "g", 500, "g");
        expect(result.result).toBe("insufficient");
        expect(result.availableQuantity).toBe(200);
        expect(result.requiredQuantity).toBe(500);
        expect(result.deficit).toBeDefined();
        expect(result.deficit?.quantity).toBeCloseTo(300, 0);
        expect(result.deficit?.unit).toBe("g");
      });

      it("should handle zero quantities correctly", () => {
        const result = compareQuantities(0, "g", 100, "g");
        expect(result.result).toBe("insufficient");
        expect(result.deficit?.quantity).toBe(100);
      });
    });

    describe("metric to metric conversions", () => {
      it("should compare g to kg correctly", () => {
        const result = compareQuantities(1, "kg", 500, "g");
        expect(result.result).toBe("sufficient");
        expect(result.deficit).toBeUndefined();
      });

      it("should detect insufficient when kg is less than g", () => {
        const result = compareQuantities(0.3, "kg", 500, "g");
        expect(result.result).toBe("insufficient");
        expect(result.deficit?.quantity).toBeCloseTo(200, 0);
      });

      it("should compare ml to l correctly", () => {
        const result = compareQuantities(1, "l", 750, "ml");
        expect(result.result).toBe("sufficient");
      });
    });

    describe("imperial to imperial conversions", () => {
      it("should compare oz to lb correctly", () => {
        const result = compareQuantities(1, "lb", 12, "oz");
        expect(result.result).toBe("sufficient");
      });

      it("should compare fl_oz to cup correctly", () => {
        const result = compareQuantities(1, "cup", 6, "fl_oz");
        expect(result.result).toBe("sufficient");
      });
    });

    describe("metric to imperial conversions", () => {
      it("should compare g to oz correctly", () => {
        const result = compareQuantities(8, "oz", 200, "g");
        expect(result.result).toBe("sufficient");
      });

      it("should compare g to lb correctly", () => {
        const result = compareQuantities(1, "lb", 400, "g");
        expect(result.result).toBe("sufficient");
      });

      it("should detect insufficient with g vs oz", () => {
        const result = compareQuantities(5, "oz", 200, "g");
        expect(result.result).toBe("insufficient");
      });

      it("should compare ml to fl_oz correctly", () => {
        const result = compareQuantities(10, "fl_oz", 250, "ml");
        expect(result.result).toBe("sufficient");
      });

      it("should compare ml to cup correctly", () => {
        const result = compareQuantities(1, "cup", 200, "ml");
        expect(result.result).toBe("sufficient");
      });

      it("should detect insufficient with ml vs cup", () => {
        const result = compareQuantities(0.5, "cup", 200, "ml");
        expect(result.result).toBe("insufficient");
      });
    });

    describe("incompatible units", () => {
      it("should return incompatible for weight vs volume", () => {
        const result = compareQuantities(500, "g", 500, "ml");
        expect(result.result).toBe("incompatible");
        expect(result.deficit).toBeUndefined();
      });

      it("should return incompatible for g vs cup", () => {
        const result = compareQuantities(500, "g", 2, "cup");
        expect(result.result).toBe("incompatible");
      });

      it("should return incompatible for oz vs l", () => {
        const result = compareQuantities(10, "oz", 1, "l");
        expect(result.result).toBe("incompatible");
      });
    });

    describe("edge cases and validation", () => {
      it("should return unknown for null available quantity", () => {
        const result = compareQuantities(null as any, "g", 500, "g");
        expect(result.result).toBe("unknown");
      });

      it("should return unknown for null required quantity", () => {
        const result = compareQuantities(500, "g", null as any, "g");
        expect(result.result).toBe("unknown");
      });

      it("should return unknown for NaN quantity", () => {
        const result = compareQuantities(NaN, "g", 500, "g");
        expect(result.result).toBe("unknown");
      });

      it("should return unknown for empty unit string", () => {
        const result = compareQuantities(500, "", 500, "g");
        expect(result.result).toBe("unknown");
      });

      it("should normalize unit casing", () => {
        const result = compareQuantities(500, "G", 500, "G");
        expect(result.result).toBe("sufficient");
        expect(result.availableUnit).toBe("g");
        expect(result.requiredUnit).toBe("g");
      });

      it("should trim whitespace from units", () => {
        const result = compareQuantities(500, " g ", 500, " g ");
        expect(result.result).toBe("sufficient");
        expect(result.availableUnit).toBe("g");
      });
    });

    describe("count units", () => {
      it("should compare unit counts correctly", () => {
        const result = compareQuantities(5, "unit", 3, "unit");
        expect(result.result).toBe("sufficient");
      });

      it("should detect insufficient count", () => {
        const result = compareQuantities(2, "unit", 5, "unit");
        expect(result.result).toBe("insufficient");
        expect(result.deficit?.quantity).toBe(3);
      });

      it("should handle pieces as count", () => {
        const result = compareQuantities(10, "pieces", 5, "piece");
        expect(result.result).toBe("sufficient");
      });

      it("should return incompatible for count vs weight", () => {
        const result = compareQuantities(5, "unit", 500, "g");
        expect(result.result).toBe("incompatible");
      });
    });

    describe("deficit calculation", () => {
      it("should calculate deficit in base units", () => {
        const result = compareQuantities(200, "g", 500, "g");
        expect(result.deficit?.quantity).toBeCloseTo(300, 0);
        expect(result.deficit?.unit).toBe("g");
      });

      it("should calculate deficit across unit systems", () => {
        const result = compareQuantities(100, "g", 8, "oz");
        // 8 oz = ~227g, so deficit = ~127g
        expect(result.result).toBe("insufficient");
        expect(result.deficit?.quantity).toBeGreaterThan(100);
        expect(result.deficit?.unit).toBe("g");
      });

      it("should not include deficit when sufficient", () => {
        const result = compareQuantities(500, "g", 200, "g");
        expect(result.deficit).toBeUndefined();
      });
    });
  });

  describe("calculateDeficit", () => {
    it("should return deficit when insufficient", () => {
      const deficit = calculateDeficit(500, "g", 200, "g");
      expect(deficit).toBeDefined();
      expect(deficit?.quantity).toBeCloseTo(300, 0);
      expect(deficit?.unit).toBe("g");
    });

    it("should return null when sufficient", () => {
      const deficit = calculateDeficit(200, "g", 500, "g");
      expect(deficit).toBeNull();
    });

    it("should return null when exactly equal", () => {
      const deficit = calculateDeficit(500, "g", 500, "g");
      expect(deficit).toBeNull();
    });

    it("should return null for incompatible units", () => {
      const deficit = calculateDeficit(500, "ml", 500, "g");
      expect(deficit).toBeNull();
    });

    it("should calculate deficit with unit conversion", () => {
      const deficit = calculateDeficit(8, "oz", 100, "g");
      expect(deficit).toBeDefined();
      expect(deficit?.unit).toBe("g");
    });
  });

  describe("hasSufficientQuantity", () => {
    it("should return true when available equals required", () => {
      const result = hasSufficientQuantity(500, "g", 500, "g");
      expect(result).toBe(true);
    });

    it("should return true when available exceeds required", () => {
      const result = hasSufficientQuantity(750, "g", 500, "g");
      expect(result).toBe(true);
    });

    it("should return false when insufficient", () => {
      const result = hasSufficientQuantity(200, "g", 500, "g");
      expect(result).toBe(false);
    });

    it("should return false for incompatible units", () => {
      const result = hasSufficientQuantity(500, "g", 500, "ml");
      expect(result).toBe(false);
    });

    it("should handle unit conversion", () => {
      const result = hasSufficientQuantity(1, "kg", 500, "g");
      expect(result).toBe(true);
    });

    it("should return false for invalid inputs", () => {
      const result = hasSufficientQuantity(NaN, "g", 500, "g");
      expect(result).toBe(false);
    });
  });

  describe("aggregateQuantities", () => {
    it("should aggregate same units correctly", () => {
      const quantities = [
        { quantity: 100, unit: "g" },
        { quantity: 200, unit: "g" },
        { quantity: 150, unit: "g" },
      ];
      const total = aggregateQuantities(quantities);
      expect(total).toBe(450);
    });

    it("should aggregate different weight units", () => {
      const quantities = [
        { quantity: 500, unit: "g" },
        { quantity: 0.5, unit: "kg" },
        { quantity: 8, unit: "oz" },
      ];
      const total = aggregateQuantities(quantities);
      // 500g + 500g + ~227g = ~1227g
      expect(total).toBeGreaterThan(1200);
      expect(total).toBeLessThan(1250);
    });

    it("should aggregate different volume units", () => {
      const quantities = [
        { quantity: 500, unit: "ml" },
        { quantity: 0.5, unit: "l" },
        { quantity: 8, unit: "fl_oz" },
      ];
      const total = aggregateQuantities(quantities);
      // 500ml + 500ml + ~237ml = ~1237ml
      expect(total).toBeGreaterThan(1200);
      expect(total).toBeLessThan(1300);
    });

    it("should return 0 for empty array", () => {
      const total = aggregateQuantities([]);
      expect(total).toBe(0);
    });

    it("should return null for invalid quantities", () => {
      const quantities = [
        { quantity: 100, unit: "g" },
        { quantity: NaN, unit: "g" },
      ];
      const total = aggregateQuantities(quantities);
      expect(total).toBeNull();
    });

    it("should return null for mixed dimensions", () => {
      const quantities = [
        { quantity: 100, unit: "g" },
        { quantity: 100, unit: "ml" },
      ];
      const total = aggregateQuantities(quantities);
      expect(total).toBeNull();
    });

    it("should return null for unknown units", () => {
      const quantities = [{ quantity: 100, unit: "unknown" }];
      const total = aggregateQuantities(quantities);
      expect(total).toBeNull();
    });

    it("should aggregate count units", () => {
      const quantities = [
        { quantity: 5, unit: "unit" },
        { quantity: 3, unit: "pieces" },
      ];
      const total = aggregateQuantities(quantities);
      expect(total).toBe(8);
    });
  });

  describe("calculateAvailabilityPercentage", () => {
    it("should return 100 when available equals required", () => {
      const percentage = calculateAvailabilityPercentage(500, "g", 500, "g");
      expect(percentage).toBe(100);
    });

    it("should return 100 when available exceeds required", () => {
      const percentage = calculateAvailabilityPercentage(750, "g", 500, "g");
      expect(percentage).toBe(100);
    });

    it("should calculate correct percentage when partially available", () => {
      const percentage = calculateAvailabilityPercentage(250, "g", 500, "g");
      expect(percentage).toBe(50);
    });

    it("should handle different units", () => {
      const percentage = calculateAvailabilityPercentage(0.5, "kg", 500, "g");
      expect(percentage).toBe(100);
    });

    it("should return 0 for zero availability", () => {
      const percentage = calculateAvailabilityPercentage(0, "g", 500, "g");
      expect(percentage).toBe(0);
    });

    it("should return null for incompatible units", () => {
      const percentage = calculateAvailabilityPercentage(500, "g", 500, "ml");
      expect(percentage).toBeNull();
    });

    it("should return null for invalid inputs", () => {
      const percentage = calculateAvailabilityPercentage(NaN, "g", 500, "g");
      expect(percentage).toBeNull();
    });

    it("should clamp percentage to maximum 100", () => {
      const percentage = calculateAvailabilityPercentage(1000, "g", 500, "g");
      expect(percentage).toBe(100);
    });

    it("should clamp percentage to minimum 0", () => {
      const percentage = calculateAvailabilityPercentage(-100, "g", 500, "g");
      expect(percentage).toBe(0);
    });

    it("should handle small percentages", () => {
      const percentage = calculateAvailabilityPercentage(50, "g", 500, "g");
      expect(percentage).toBe(10);
    });

    it("should return null when required quantity is zero", () => {
      const percentage = calculateAvailabilityPercentage(500, "g", 0, "g");
      expect(percentage).toBeNull();
    });
  });

  describe("real-world scenarios", () => {
    it("should handle recipe calling for 200g, pantry has 8oz", () => {
      const result = compareQuantities(8, "oz", 200, "g");
      // 8 oz = ~227g, so should be sufficient
      expect(result.result).toBe("sufficient");
    });

    it("should handle recipe calling for 300g, pantry has 8oz", () => {
      const result = compareQuantities(8, "oz", 300, "g");
      // 8 oz = ~227g, so should be insufficient
      expect(result.result).toBe("insufficient");
      expect(result.deficit?.quantity).toBeCloseTo(73, 0);
    });

    it("should handle recipe calling for 1 cup, pantry has 200ml", () => {
      const result = compareQuantities(200, "ml", 1, "cup");
      // 1 cup = ~237ml, so should be insufficient
      expect(result.result).toBe("insufficient");
    });

    it("should aggregate multiple pantry entries", () => {
      const quantities = [
        { quantity: 100, unit: "g" },
        { quantity: 200, unit: "g" },
      ];
      const total = aggregateQuantities(quantities);
      expect(total).toBe(300);

      const percentage = calculateAvailabilityPercentage(
        total!,
        "g",
        400,
        "g"
      );
      expect(percentage).toBe(75);
    });
  });
});
