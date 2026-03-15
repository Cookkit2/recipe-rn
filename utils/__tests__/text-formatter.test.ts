import { formatQuantity } from '../text-formatter';

describe('formatQuantity', () => {
  it('returns "0" for 0', () => {
    expect(formatQuantity(0)).toBe('0');
  });

  it('returns the number as string for whole numbers', () => {
    expect(formatQuantity(1)).toBe('1');
    expect(formatQuantity(5)).toBe('5');
    expect(formatQuantity(100)).toBe('100');
  });

  it('formats decimals less than 1 to cooking fractions', () => {
    expect(formatQuantity(0.125)).toBe('⅛');
    expect(formatQuantity(0.25)).toBe('¼');
    expect(formatQuantity(0.33)).toBe('⅓');
    expect(formatQuantity(0.333)).toBe('⅓');
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(0.66)).toBe('⅔');
    expect(formatQuantity(0.667)).toBe('⅔');
    expect(formatQuantity(0.75)).toBe('¾');
    expect(formatQuantity(0.875)).toBe('⅞');
  });

  it('formats mixed numbers to whole numbers with fractions', () => {
    expect(formatQuantity(1.5)).toBe('1 ½');
    expect(formatQuantity(2.25)).toBe('2 ¼');
    expect(formatQuantity(3.75)).toBe('3 ¾');
    expect(formatQuantity(10.333)).toBe('10 ⅓');
  });

  it('returns decimal string if fraction is not common', () => {
    expect(formatQuantity(0.1)).toBe('0.1');
    expect(formatQuantity(0.4)).toBe('0.4');
    expect(formatQuantity(1.2)).toBe('1.2');
    expect(formatQuantity(2.9)).toBe('2.9');
  });
});
