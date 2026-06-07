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
      expect(centsToDollars(0)).toBe(0);
      expect(centsToDollars(250)).toBe(2.5);
      expect(centsToDollars(99)).toBe(0.99);
      expect(centsToDollars(-100)).toBe(-1);
    });
  });

  describe("dollarsToCents", () => {
    it("should convert dollars to cents correctly", () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(0)).toBe(0);
      expect(dollarsToCents(2.5)).toBe(250);
      expect(dollarsToCents(0.99)).toBe(99);
      expect(dollarsToCents(-1)).toBe(-100);
    });

    it("should round floating point inaccuracies", () => {
      // 0.29 * 100 in JS is 28.999999999999996
      expect(dollarsToCents(0.29)).toBe(29);
      // 1.13 * 100 in JS is 112.99999999999999
      expect(dollarsToCents(1.13)).toBe(113);
    });
  });

  describe("formatCurrency", () => {
    it("should format cents into a string with the default currency MYR", () => {
      expect(formatCurrency(100)).toBe("MYR 1.00");
      expect(formatCurrency(250)).toBe("MYR 2.50");
      expect(formatCurrency(99)).toBe("MYR 0.99");
      expect(formatCurrency(0)).toBe("MYR 0.00");
    });

    it("should format cents into a string with a provided currency", () => {
      expect(formatCurrency(100, "USD")).toBe("USD 1.00");
      expect(formatCurrency(1500, "EUR")).toBe("EUR 15.00");
    });

    it("should always show two decimal places", () => {
      expect(formatCurrency(10)).toBe("MYR 0.10");
      expect(formatCurrency(1)).toBe("MYR 0.01");
    });
  });

  describe("calculateTotalPrice", () => {
    it("should return 0 for an empty array", () => {
      expect(calculateTotalPrice([])).toBe(0);
    });

    it("should calculate total price correctly for multiple items", () => {
      const items = [{ priceCents: 100 }, { priceCents: 250 }, { priceCents: 50 }];
      expect(calculateTotalPrice(items)).toBe(400);
    });

    it("should handle items with zero price", () => {
      const items = [{ priceCents: 100 }, { priceCents: 0 }, { priceCents: 50 }];
      expect(calculateTotalPrice(items)).toBe(150);
    });

    it("should handle items with negative price", () => {
      const items = [{ priceCents: 100 }, { priceCents: -50 }, { priceCents: 50 }];
      expect(calculateTotalPrice(items)).toBe(100);
    });

    it("should return the exact price of a single item", () => {
      const items = [{ priceCents: 199 }];
      expect(calculateTotalPrice(items)).toBe(199);
    });
  });

  describe("groupPricesByCategory", () => {
    it("should return an empty array for empty items", () => {
      expect(groupPricesByCategory([])).toEqual([]);
    });

    it("should group items by category and calculate correct totals", () => {
      const items = [
        { priceCents: 100, category: "produce" },
        { priceCents: 200, category: "dairy" },
        { priceCents: 150, category: "produce" },
        { priceCents: 50, category: "dairy" },
        { priceCents: 300, category: "meat" },
      ];

      const result = groupPricesByCategory(items);

      // Should be sorted descending by totalCents: meat(300), produce(250), dairy(250)
      // Note: produce and dairy tie in totalCents, so their order might depend on stability of Array.sort
      expect(result.length).toBe(3);

      const meat = result.find((r) => r.category === "meat");
      expect(meat).toEqual({ category: "meat", totalCents: 300, itemCount: 1 });

      const produce = result.find((r) => r.category === "produce");
      expect(produce).toEqual({ category: "produce", totalCents: 250, itemCount: 2 });

      const dairy = result.find((r) => r.category === "dairy");
      expect(dairy).toEqual({ category: "dairy", totalCents: 250, itemCount: 2 });
    });

    it("should use 'other' category when no category is provided", () => {
      const items = [
        { priceCents: 100, category: "produce" },
        { priceCents: 200 },
        { priceCents: 150 },
      ];

      const result = groupPricesByCategory(items);

      // Should be sorted descending: other(350), produce(100)
      expect(result).toEqual([
        { category: "other", totalCents: 350, itemCount: 2 },
        { category: "produce", totalCents: 100, itemCount: 1 },
      ]);
    });

    it("should sort results descending by totalCents", () => {
      const items = [
        { priceCents: 100, category: "low" },
        { priceCents: 1000, category: "high" },
        { priceCents: 500, category: "medium" },
      ];

      const result = groupPricesByCategory(items);

      expect(result[0]!.category).toBe("high");
      expect(result[1]!.category).toBe("medium");
      expect(result[2]!.category).toBe("low");
    });
  });
});
