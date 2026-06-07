import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  calculateTotalPrice,
  groupPricesByCategory,
} from "../price-calculator";

describe("Price Calculator Utils", () => {
  describe("centsToDollars", () => {
    it("converts cents to dollars correctly", () => {
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(150)).toBe(1.5);
      expect(centsToDollars(0)).toBe(0);
      expect(centsToDollars(99)).toBe(0.99);
      expect(centsToDollars(-50)).toBe(-0.5);
    });
  });

  describe("dollarsToCents", () => {
    it("converts dollars to cents correctly and rounds", () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(1.5)).toBe(150);
      expect(dollarsToCents(0)).toBe(0);
      expect(dollarsToCents(0.99)).toBe(99);
      expect(dollarsToCents(-0.5)).toBe(-50);
      expect(dollarsToCents(1.005)).toBe(101); // 1.005 * 100 = 100.5 -> 101
      expect(dollarsToCents(1.004)).toBe(100); // 1.004 * 100 = 100.4 -> 100
    });
  });

  describe("formatCurrency", () => {
    it("formats with default currency MYR", () => {
      expect(formatCurrency(150)).toBe("MYR 1.50");
      expect(formatCurrency(1000)).toBe("MYR 10.00");
    });

    it("formats with custom currency", () => {
      expect(formatCurrency(150, "USD")).toBe("USD 1.50");
      expect(formatCurrency(1000, "EUR")).toBe("EUR 10.00");
    });

    it("handles zero cents", () => {
      expect(formatCurrency(0)).toBe("MYR 0.00");
      expect(formatCurrency(0, "USD")).toBe("USD 0.00");
    });

    it("handles negative cents", () => {
      expect(formatCurrency(-150)).toBe("MYR -1.50");
      expect(formatCurrency(-50, "USD")).toBe("USD -0.50");
    });

    it("handles large values correctly", () => {
      expect(formatCurrency(123456789)).toBe("MYR 1234567.89");
    });
  });

  describe("calculateTotalPrice", () => {
    it("calculates total correctly for multiple items", () => {
      const items = [{ priceCents: 100 }, { priceCents: 250 }, { priceCents: 50 }];
      expect(calculateTotalPrice(items)).toBe(400);
    });

    it("returns 0 for empty array", () => {
      expect(calculateTotalPrice([])).toBe(0);
    });

    it("handles negative prices", () => {
      const items = [{ priceCents: 100 }, { priceCents: -50 }];
      expect(calculateTotalPrice(items)).toBe(50);
    });
  });

  describe("groupPricesByCategory", () => {
    it("groups and sums prices by category, sorted by total descending", () => {
      const items = [
        { priceCents: 100, category: "Produce" },
        { priceCents: 300, category: "Meat" },
        { priceCents: 150, category: "Produce" },
        { priceCents: 50 }, // No category should default to 'other'
      ];

      const result = groupPricesByCategory(items);

      expect(result).toEqual([
        { category: "Meat", totalCents: 300, itemCount: 1 },
        { category: "Produce", totalCents: 250, itemCount: 2 },
        { category: "other", totalCents: 50, itemCount: 1 },
      ]);
    });

    it("returns empty array for empty input", () => {
      expect(groupPricesByCategory([])).toEqual([]);
    });

    it("handles all items with no category", () => {
      const items = [{ priceCents: 100 }, { priceCents: 200 }];

      expect(groupPricesByCategory(items)).toEqual([
        { category: "other", totalCents: 300, itemCount: 2 },
      ]);
    });
  });
});
