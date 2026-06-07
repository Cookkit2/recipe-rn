import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  calculateTotalPrice,
  groupPricesByCategory
} from '../price-calculator';

describe('price-calculator', () => {
  describe('centsToDollars', () => {
    it('should convert cents to dollars', () => {
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(1234)).toBe(12.34);
      expect(centsToDollars(0)).toBe(0);
      expect(centsToDollars(-150)).toBe(-1.5);
    });
  });

  describe('dollarsToCents', () => {
    it('should convert standard dollar amounts to cents', () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(10)).toBe(1000);
      expect(dollarsToCents(12.34)).toBe(1234);
    });

    it('should handle fractional cents by rounding', () => {
      // 1.006 * 100 = 100.6 -> Math.round -> 101
      expect(dollarsToCents(1.006)).toBe(101);
      expect(dollarsToCents(1.004)).toBe(100);
    });

    it('should handle zero and negative amounts', () => {
      expect(dollarsToCents(0)).toBe(0);
      expect(dollarsToCents(-1.50)).toBe(-150);
    });

    it('should handle floating point precision issues gracefully with Math.round', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      // (0.1 + 0.2) * 100 = 30.000000000000004 -> Math.round -> 30
      expect(dollarsToCents(0.1 + 0.2)).toBe(30);
    });
  });

  describe('formatCurrency', () => {
    it('should format cents to MYR by default', () => {
      expect(formatCurrency(1234)).toBe('MYR 12.34');
      expect(formatCurrency(100)).toBe('MYR 1.00');
      expect(formatCurrency(0)).toBe('MYR 0.00');
    });

    it('should format cents to specified currency', () => {
      expect(formatCurrency(1234, 'USD')).toBe('USD 12.34');
      expect(formatCurrency(100, 'EUR')).toBe('EUR 1.00');
    });
  });

  describe('calculateTotalPrice', () => {
    it('should sum priceCents from an array of items', () => {
      const items = [{ priceCents: 100 }, { priceCents: 250 }, { priceCents: 50 }];
      expect(calculateTotalPrice(items)).toBe(400);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotalPrice([])).toBe(0);
    });
  });

  describe('groupPricesByCategory', () => {
    it('should group items by category and sort by totalCents descending', () => {
      const items = [
        { priceCents: 100, category: 'produce' },
        { priceCents: 250, category: 'dairy' },
        { priceCents: 50, category: 'produce' },
        { priceCents: 150 }, // missing category -> 'other'
      ];

      const result = groupPricesByCategory(items);

      expect(result).toEqual([
        { category: 'dairy', totalCents: 250, itemCount: 1 },
        { category: 'produce', totalCents: 150, itemCount: 2 },
        { category: 'other', totalCents: 150, itemCount: 1 },
      ]);
    });

    it('should handle empty array', () => {
      expect(groupPricesByCategory([])).toEqual([]);
    });
  });
});
