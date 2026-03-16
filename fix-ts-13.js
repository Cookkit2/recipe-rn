const fs = require("fs");
let packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
packageJson.devDependencies = {
  ...packageJson.devDependencies,
  "@types/jest": "^29.5.12",
  jest: "^29.7.0",
  "ts-jest": "^29.1.2",
};
fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

// Only run the test
const testFile = `import { sanitizeText, createSlug } from '../text-formatter';

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
`;
fs.writeFileSync("utils/__tests__/text-formatter.test.ts", testFile);
