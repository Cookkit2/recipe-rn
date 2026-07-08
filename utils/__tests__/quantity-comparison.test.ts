import {
  compareQuantities,
  aggregateQuantities,
  calculateDeficit,
  hasSufficientQuantity,
  calculateAvailabilityPercentage,
} from "../quantity-comparison";

describe("quantity-comparison", () => {
  describe("compareQuantities", () => {
    it("should return 'unknown' if any input is null or undefined", () => {
      // @ts-ignore
      expect(compareQuantities(null, "g", 50, "g").result).toBe("unknown");
      // @ts-ignore
      expect(compareQuantities(100, "g", null, "g").result).toBe("unknown");
      // @ts-ignore
      expect(compareQuantities(100, null, 50, "g").result).toBe("unknown");
      // @ts-ignore
      expect(compareQuantities(100, "g", 50, null).result).toBe("unknown");
    });

    it("should return 'unknown' if any quantity is NaN", () => {
      expect(compareQuantities(NaN, "g", 50, "g").result).toBe("unknown");
      expect(compareQuantities(100, "g", NaN, "g").result).toBe("unknown");
    });

    it("should return 'incompatible' if units are not compatible", () => {
      expect(compareQuantities(100, "g", 50, "ml").result).toBe("incompatible");
    });

    it("should return 'incompatible' if units are unknown", () => {
      expect(compareQuantities(100, "unknown_unit", 50, "unknown_unit").result).toBe(
        "incompatible"
      );
    });

    it("should return 'sufficient' when available >= required (same units)", () => {
      const result = compareQuantities(100, "g", 50, "g");
      expect(result.result).toBe("sufficient");
      expect(result.deficit).toBeUndefined();
    });

    it("should return 'insufficient' and calculate deficit when available < required (same units)", () => {
      const result = compareQuantities(30, "g", 50, "g");
      expect(result.result).toBe("insufficient");
      expect(result.deficit).toEqual({ quantity: 20, unit: "g" });
    });

    it("should return 'sufficient' when available >= required (different units, compatible)", () => {
      // 1 kg = 1000g, required 500g
      const result = compareQuantities(1, "kg", 500, "g");
      expect(result.result).toBe("sufficient");
      expect(result.deficit).toBeUndefined();
    });

    it("should return 'insufficient' and calculate deficit when available < required (different units, compatible)", () => {
      // 0.5 kg = 500g, required 800g
      const result = compareQuantities(0.5, "kg", 800, "g");
      expect(result.result).toBe("insufficient");
      // Required is in g, deficit should be based on required base unit which is 'g' for weight
      expect(result.deficit).toEqual({ quantity: 300, unit: "g" });
    });

    it("should handle imperial conversions", () => {
      // 1 lb = 453.59g, required 400g -> sufficient
      expect(compareQuantities(1, "lb", 400, "g").result).toBe("sufficient");

      // 1 cup = 236.588ml, required 500ml -> insufficient
      const result = compareQuantities(1, "cup", 500, "ml");
      expect(result.result).toBe("insufficient");
      expect(result.deficit?.quantity).toBeCloseTo(263.41, 1);
    });
  });

  describe("calculateDeficit", () => {
    it("should return null if sufficient", () => {
      expect(calculateDeficit(50, "g", 100, "g")).toBeNull();
    });

    it("should return null if incompatible or unknown", () => {
      expect(calculateDeficit(50, "ml", 100, "g")).toBeNull();
      // @ts-ignore
      expect(calculateDeficit(50, "g", null, "g")).toBeNull();
    });

    it("should return deficit if insufficient", () => {
      expect(calculateDeficit(100, "g", 50, "g")).toEqual({ quantity: 50, unit: "g" });
      expect(calculateDeficit(1, "kg", 500, "g")).toEqual({ quantity: 500, unit: "g" });
    });
  });

  describe("hasSufficientQuantity", () => {
    it("should return true if available >= required", () => {
      expect(hasSufficientQuantity(100, "g", 50, "g")).toBe(true);
      expect(hasSufficientQuantity(1, "kg", 500, "g")).toBe(true);
    });

    it("should return false if available < required", () => {
      expect(hasSufficientQuantity(50, "g", 100, "g")).toBe(false);
    });

    it("should return false if incompatible or unknown", () => {
      expect(hasSufficientQuantity(100, "g", 50, "ml")).toBe(false);
      // @ts-ignore
      expect(hasSufficientQuantity(null, "g", 50, "g")).toBe(false);
    });
  });

  describe("calculateAvailabilityPercentage", () => {
    it("should return null if incompatible or unknown", () => {
      expect(calculateAvailabilityPercentage(100, "g", 50, "ml")).toBeNull();
      // @ts-ignore
      expect(calculateAvailabilityPercentage(null, "g", 50, "g")).toBeNull();
    });

    it("should return null if required is 0 or NaN", () => {
      expect(calculateAvailabilityPercentage(100, "g", 0, "g")).toBeNull();
      expect(calculateAvailabilityPercentage(100, "g", NaN, "g")).toBeNull();
    });

    it("should calculate percentage correctly", () => {
      expect(calculateAvailabilityPercentage(50, "g", 100, "g")).toBe(50);
      expect(calculateAvailabilityPercentage(100, "g", 100, "g")).toBe(100);
      expect(calculateAvailabilityPercentage(500, "g", 1, "kg")).toBe(50);
    });

    it("should clamp percentage at 100", () => {
      expect(calculateAvailabilityPercentage(150, "g", 100, "g")).toBe(100);
    });

    it("should clamp percentage at 0", () => {
      expect(calculateAvailabilityPercentage(-10, "g", 100, "g")).toBe(0);
    });
  });

  describe("aggregateQuantities", () => {
    it("should return 0 for empty array or null", () => {
      expect(aggregateQuantities([])).toBe(0);
      // @ts-ignore
      expect(aggregateQuantities(null)).toBe(0);
    });

    it("should return null for invalid items", () => {
      // @ts-ignore
      expect(aggregateQuantities([{ quantity: null, unit: "g" }])).toBeNull();
      // @ts-ignore
      expect(aggregateQuantities([{ quantity: 10, unit: null }])).toBeNull();
      expect(aggregateQuantities([{ quantity: NaN, unit: "g" }])).toBeNull();
    });

    it("should return null for unknown dimensions", () => {
      expect(aggregateQuantities([{ quantity: 10, unit: "unknown" }])).toBeNull();
    });

    it("should return null for mixed dimensions", () => {
      expect(
        aggregateQuantities([
          { quantity: 10, unit: "g" },
          { quantity: 10, unit: "ml" },
        ])
      ).toBeNull();
    });

    it("should correctly aggregate valid quantities of the same dimension", () => {
      expect(
        aggregateQuantities([
          { quantity: 100, unit: "g" },
          { quantity: 50, unit: "g" },
        ])
      ).toBe(150);
    });

    it("should convert and aggregate quantities with different units but same dimension", () => {
      expect(
        aggregateQuantities([
          { quantity: 1, unit: "kg" }, // 1000g
          { quantity: 500, unit: "g" },
        ])
      ).toBe(1500);

      const mlTotal = aggregateQuantities([
        { quantity: 1, unit: "l" }, // 1000ml
        { quantity: 1, unit: "cup" }, // 236.588ml
      ]);
      expect(mlTotal).toBeCloseTo(1236.59, 1);
    });
  });
});
