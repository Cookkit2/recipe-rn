import { sanitizeText, createSlug } from '../text-formatter';

describe('text-formatter', () => {
  describe('sanitizeText', () => {
    it('returns empty string for empty input', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('returns empty string for null or undefined input', () => {
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
    });

    it('keeps alphanumeric characters and spaces', () => {
      expect(sanitizeText('Hello World 123')).toBe('Hello World 123');
    });

    it('removes special characters', () => {
      expect(sanitizeText('Hello, World! @#123')).toBe('Hello World 123');
    });

    it('trims leading and trailing spaces', () => {
      expect(sanitizeText('  Hello World  ')).toBe('Hello World');
    });

    it('handles string with only special characters', () => {
      expect(sanitizeText('!@#$%^&*()')).toBe('');
    });
  });

  describe('createSlug', () => {
    it('returns empty string for empty input', () => {
      expect(createSlug('')).toBe('');
    });

    it('returns empty string for null or undefined input', () => {
      expect(createSlug(null as any)).toBe('');
      expect(createSlug(undefined as any)).toBe('');
    });

    it('converts normal sentence to lowercase slug with hyphens', () => {
      expect(createSlug('Hello World 123')).toBe('hello-world-123');
    });

    it('replaces special characters with hyphens', () => {
      expect(createSlug('Hello, World! @#123')).toBe('hello-world-123');
    });

    it('handles multiple spaces/special characters to avoid consecutive hyphens', () => {
      expect(createSlug('Hello   World!!!123')).toBe('hello-world-123');
    });

    it('trims leading and trailing hyphens', () => {
      expect(createSlug('---Hello World---')).toBe('hello-world');
      expect(createSlug('  Hello World  ')).toBe('hello-world');
    });

    it('handles string with only special characters', () => {
      expect(createSlug('!@#$%^&*()')).toBe('');
    });
  });
});
