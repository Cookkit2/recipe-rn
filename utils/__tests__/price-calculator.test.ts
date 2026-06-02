import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  calculateTotalPrice,
  groupPricesByCategory,
} from "../price-calculator";

describe("price-calculator", () => {
  describe("centsToDollars", () => {
    it("converts positive cents to dollars correctly", () => {
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(50)).toBe(0.5);
      expect(centsToDollars(99)).toBe(0.99);
    });

    it("converts zero cents to zero dollars", () => {
      expect(centsToDollars(0)).toBe(0);
    });

    it("converts negative cents correctly", () => {
      expect(centsToDollars(-150)).toBe(-1.5);
    });
  });

  describe("dollarsToCents", () => {
    it("converts positive dollars to cents correctly", () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(0.5)).toBe(50);
      expect(dollarsToCents(0.99)).toBe(99);
    });

    it("rounds to nearest cent when there are fractional cents", () => {
      expect(dollarsToCents(1.005)).toBe(101);
      expect(dollarsToCents(1.004)).toBe(100);
    });

    it("converts zero dollars to zero cents", () => {
      expect(dollarsToCents(0)).toBe(0);
    });

    it("converts negative dollars correctly", () => {
      expect(dollarsToCents(-1.5)).toBe(-150);
    });
  });

  describe("formatCurrency", () => {
    it("formats with default currency (MYR)", () => {
      expect(formatCurrency(100)).toBe("MYR 1.00");
      expect(formatCurrency(0)).toBe("MYR 0.00");
      expect(formatCurrency(99)).toBe("MYR 0.99");
    });

    it("formats with provided currency", () => {
      expect(formatCurrency(150, "USD")).toBe("USD 1.50");
      expect(formatCurrency(250, "EUR")).toBe("EUR 2.50");
    });

    it("formats negative amounts correctly", () => {
      expect(formatCurrency(-150)).toBe("MYR -1.50");
    });
  });

  describe("calculateTotalPrice", () => {
    it("returns 0 for an empty array", () => {
      expect(calculateTotalPrice([])).toBe(0);
    });

    it("calculates the correct total for a single item", () => {
      expect(calculateTotalPrice([{ priceCents: 150 }])).toBe(150);
    });

    it("calculates the correct total for multiple items", () => {
      expect(
        calculateTotalPrice([{ priceCents: 100 }, { priceCents: 200 }, { priceCents: 50 }])
      ).toBe(350);
    });

    it("handles items with negative prices (e.g., discounts)", () => {
      expect(calculateTotalPrice([{ priceCents: 500 }, { priceCents: -100 }])).toBe(400);
    });
  });

  describe("groupPricesByCategory", () => {
    it("returns an empty array for empty input", () => {
      expect(groupPricesByCategory([])).toEqual([]);
    });

    it("groups items with the same category together", () => {
      const items = [
        { priceCents: 100, category: "produce" },
        { priceCents: 200, category: "produce" },
      ];
      expect(groupPricesByCategory(items)).toEqual([
        { category: "produce", totalCents: 300, itemCount: 2 },
      ]);
    });

    it("assigns items without a category to 'other'", () => {
      const items = [{ priceCents: 150 }, { priceCents: 50, category: "dairy" }];
      expect(groupPricesByCategory(items)).toEqual([
        { category: "other", totalCents: 150, itemCount: 1 },
        { category: "dairy", totalCents: 50, itemCount: 1 },
      ]);
    });

    it("sorts the result by totalCents descending", () => {
      const items = [
        { priceCents: 100, category: "dairy" },
        { priceCents: 500, category: "meat" },
        { priceCents: 300, category: "produce" },
      ];
      expect(groupPricesByCategory(items)).toEqual([
        { category: "meat", totalCents: 500, itemCount: 1 },
        { category: "produce", totalCents: 300, itemCount: 1 },
        { category: "dairy", totalCents: 100, itemCount: 1 },
      ]);
    });

    it("groups, counts, and sorts correctly with mixed data", () => {
      const items = [
        { priceCents: 100, category: "dairy" },
        { priceCents: 200, category: "dairy" },
        { priceCents: 1000, category: "meat" },
        { priceCents: 150 },
        { priceCents: 50 },
      ];
      expect(groupPricesByCategory(items)).toEqual([
        { category: "meat", totalCents: 1000, itemCount: 1 },
        { category: "dairy", totalCents: 300, itemCount: 2 },
        { category: "other", totalCents: 200, itemCount: 2 },
      ]);
    });
  });
});
