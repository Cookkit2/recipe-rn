import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  calculateTotalPrice,
  groupPricesByCategory,
} from "../price-calculator";

describe("price-calculator", () => {
  describe("centsToDollars", () => {
    it("should convert cents to dollars correctly", () => {
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(250)).toBe(2.5);
      expect(centsToDollars(99)).toBe(0.99);
      expect(centsToDollars(0)).toBe(0);
    });
  });

  describe("dollarsToCents", () => {
    it("should convert dollars to cents correctly", () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(2.5)).toBe(250);
      expect(dollarsToCents(0.99)).toBe(99);
      expect(dollarsToCents(0)).toBe(0);
    });

    it("should round to nearest cent", () => {
      expect(dollarsToCents(1.505)).toBe(151);
      expect(dollarsToCents(1.004)).toBe(100);
    });
  });

  describe("formatCurrency", () => {
    it("should format correctly with default currency (MYR)", () => {
      expect(formatCurrency(150)).toBe("MYR 1.50");
      expect(formatCurrency(1000)).toBe("MYR 10.00");
      expect(formatCurrency(99)).toBe("MYR 0.99");
    });

    it("should format correctly with provided currency", () => {
      expect(formatCurrency(150, "USD")).toBe("USD 1.50");
      expect(formatCurrency(1000, "EUR")).toBe("EUR 10.00");
    });
  });

  describe("calculateTotalPrice", () => {
    it("should sum the price of all items", () => {
      expect(
        calculateTotalPrice([{ priceCents: 100 }, { priceCents: 250 }, { priceCents: 50 }])
      ).toBe(400);
    });

    it("should return 0 for empty array", () => {
      expect(calculateTotalPrice([])).toBe(0);
    });
  });

  describe("groupPricesByCategory", () => {
    it("should group prices by category and sum them", () => {
      const items = [
        { priceCents: 100, category: "produce" },
        { priceCents: 200, category: "produce" },
        { priceCents: 50, category: "dairy" },
      ];

      const result = groupPricesByCategory(items);

      expect(result).toHaveLength(2);

      // Should sort by highest total value
      expect(result[0]).toEqual({
        category: "produce",
        totalCents: 300,
        itemCount: 2,
      });

      expect(result[1]).toEqual({
        category: "dairy",
        totalCents: 50,
        itemCount: 1,
      });
    });

    it("should group items without category into 'other'", () => {
      const items = [
        { priceCents: 100 },
        { priceCents: 200, category: "" },
        { priceCents: 150, category: "produce" },
      ];

      const result = groupPricesByCategory(items);

      expect(result).toHaveLength(2);

      // 'other' has 300 total, 'produce' has 150
      expect(result[0]).toEqual({
        category: "other",
        totalCents: 300,
        itemCount: 2,
      });

      expect(result[1]).toEqual({
        category: "produce",
        totalCents: 150,
        itemCount: 1,
      });
    });

    it("should handle empty arrays", () => {
      expect(groupPricesByCategory([])).toEqual([]);
    });

    it("should handle multiple categories and sort by totalCents descending", () => {
      const items = [
        { priceCents: 100, category: "a" },
        { priceCents: 500, category: "b" },
        { priceCents: 200, category: "c" },
        { priceCents: 200, category: "c" },
      ];

      const result = groupPricesByCategory(items);

      expect(result).toHaveLength(3);

      expect(result[0]).toEqual({ category: "b", totalCents: 500, itemCount: 1 });
      expect(result[1]).toEqual({ category: "c", totalCents: 400, itemCount: 2 });
      expect(result[2]).toEqual({ category: "a", totalCents: 100, itemCount: 1 });
    });
  });
});
