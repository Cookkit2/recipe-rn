import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  calculateTotalPrice,
  groupPricesByCategory,
} from "../price-calculator";

describe("price-calculator", () => {
  describe("centsToDollars", () => {
    it("converts cents to dollars correctly", () => {
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(0)).toBe(0);
      expect(centsToDollars(99)).toBe(0.99);
      expect(centsToDollars(250)).toBe(2.5);
      expect(centsToDollars(-150)).toBe(-1.5);
    });
  });

  describe("dollarsToCents", () => {
    it("converts dollars to cents correctly", () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(0)).toBe(0);
      expect(dollarsToCents(0.99)).toBe(99);
      expect(dollarsToCents(2.5)).toBe(250);
      expect(dollarsToCents(-1.5)).toBe(-150);
    });

    it("rounds correctly when dealing with floating point precision issues", () => {
      // 1.13 * 100 in JS is 112.99999999999999
      expect(dollarsToCents(1.13)).toBe(113);
    });
  });

  describe("formatCurrency", () => {
    it("formats cents to currency string with default currency", () => {
      expect(formatCurrency(150)).toBe("MYR 1.50");
      expect(formatCurrency(0)).toBe("MYR 0.00");
      expect(formatCurrency(99)).toBe("MYR 0.99");
    });

    it("formats cents to currency string with custom currency", () => {
      expect(formatCurrency(150, "USD")).toBe("USD 1.50");
      expect(formatCurrency(250, "EUR")).toBe("EUR 2.50");
    });

    it("formats negative values correctly", () => {
      expect(formatCurrency(-150)).toBe("MYR -1.50");
    });
  });

  describe("calculateTotalPrice", () => {
    it("calculates total price for an array of items", () => {
      const items = [{ priceCents: 100 }, { priceCents: 250 }, { priceCents: 50 }];
      expect(calculateTotalPrice(items)).toBe(400);
    });

    it("returns 0 for an empty array", () => {
      expect(calculateTotalPrice([])).toBe(0);
    });

    it("handles negative prices", () => {
      const items = [{ priceCents: 100 }, { priceCents: -50 }];
      expect(calculateTotalPrice(items)).toBe(50);
    });
  });

  describe("groupPricesByCategory", () => {
    it("groups prices by category and sorts by total descending", () => {
      const items = [
        { priceCents: 100, category: "food" },
        { priceCents: 50, category: "food" },
        { priceCents: 200, category: "electronics" },
        { priceCents: 300, category: "clothing" },
      ];

      const result = groupPricesByCategory(items);

      expect(result).toHaveLength(3);

      // Sorted by total cents descending
      expect(result[0]).toEqual({ category: "clothing", totalCents: 300, itemCount: 1 });
      expect(result[1]).toEqual({ category: "electronics", totalCents: 200, itemCount: 1 });
      expect(result[2]).toEqual({ category: "food", totalCents: 150, itemCount: 2 });
    });

    it('uses "other" for items without a category', () => {
      const items = [{ priceCents: 100 }, { priceCents: 50, category: "food" }];

      const result = groupPricesByCategory(items);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ category: "other", totalCents: 100, itemCount: 1 });
      expect(result).toContainEqual({ category: "food", totalCents: 50, itemCount: 1 });
    });

    it("returns empty array for empty input", () => {
      expect(groupPricesByCategory([])).toEqual([]);
    });
  });
});
