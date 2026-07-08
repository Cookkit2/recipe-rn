import { formatDistance, formatOpenStatus } from '../store-display';

describe('store-display utils', () => {
  describe('formatDistance', () => {
    it('throws an error for negative distances', () => {
      expect(() => formatDistance(-1)).toThrow("Distance cannot be negative");
    });

    it('formats distances under 1km as meters', () => {
      expect(formatDistance(0)).toBe('0m');
      expect(formatDistance(0.5)).toBe('500m');
      expect(formatDistance(0.999)).toBe('999m');
    });

    it('formats distances 1km and over as kilometers with 1 decimal place', () => {
      expect(formatDistance(1)).toBe('1.0km');
      expect(formatDistance(1.5)).toBe('1.5km');
      expect(formatDistance(10.25)).toBe('10.3km');
    });
  });

  describe('formatOpenStatus', () => {
    it('returns Closed when isOpen is false', () => {
      expect(formatOpenStatus(false)).toBe('Closed');
      expect(formatOpenStatus(false, '22:00')).toBe('Closed');
    });

    it('returns Open when isOpen is true and no closing time is provided', () => {
      expect(formatOpenStatus(true)).toBe('Open');
    });

    it('returns Open until time when isOpen is true and closing time is provided', () => {
      expect(formatOpenStatus(true, '22:00')).toBe('Open until 22:00');
    });
  });
});
