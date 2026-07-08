import { getScalingDirection } from '../recipe-scaling';

describe('getScalingDirection', () => {
  it('should return "none" when original and new servings are the same', () => {
    expect(getScalingDirection(4, 4)).toBe('none');
    expect(getScalingDirection(1, 1)).toBe('none');
    expect(getScalingDirection(10, 10)).toBe('none');
  });

  it('should return "up" when new servings are greater than original servings', () => {
    expect(getScalingDirection(2, 4)).toBe('up');
    expect(getScalingDirection(4, 6)).toBe('up');
    expect(getScalingDirection(1, 10)).toBe('up');
  });

  it('should return "down" when new servings are less than original servings', () => {
    expect(getScalingDirection(4, 2)).toBe('down');
    expect(getScalingDirection(6, 4)).toBe('down');
    expect(getScalingDirection(10, 1)).toBe('down');
  });
});
