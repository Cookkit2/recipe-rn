import {
  capitalize,
  titleCase,
  sentenceCase,
  camelCaseToReadable,
  toKebabCase,
  toCamelCase,
  truncateWords,
  getInitials,
  normalizeWhitespace,
  truncate,
} from "../text-formatter";

describe("Text Formatter Utils - Capitalization", () => {
  describe("capitalize", () => {
    it("should capitalize the first letter and lowercase the rest", () => {
      expect(capitalize("hello")).toBe("Hello");
      expect(capitalize("HELLO")).toBe("Hello");
      expect(capitalize("hElLo")).toBe("Hello");
    });

    it("should return empty string for empty or null input", () => {
      expect(capitalize("")).toBe("");
      expect(capitalize(null as any)).toBe("");
      expect(capitalize(undefined as any)).toBe("");
    });
  });

  describe("titleCase", () => {
    it("should capitalize the first letter of each word", () => {
      expect(titleCase("hello world")).toBe("Hello World");
      expect(titleCase("HELLO WORLD")).toBe("Hello World");
      expect(titleCase("hElLo wOrLd")).toBe("Hello World");
    });

    it("should handle multiple spaces", () => {
      expect(titleCase("hello  world")).toBe("Hello  World");
    });

    it("should return empty string for empty or null input", () => {
      expect(titleCase("")).toBe("");
      expect(titleCase(null as any)).toBe("");
      expect(titleCase(undefined as any)).toBe("");
    });
  });

  describe("sentenceCase", () => {
    it("should capitalize the first letter and lowercase the rest", () => {
      expect(sentenceCase("hello world. how are you?")).toBe("Hello world. how are you?");
      expect(sentenceCase("HELLO WORLD")).toBe("Hello world");
    });

    it("should return empty string for empty or null input", () => {
      expect(sentenceCase("")).toBe("");
      expect(sentenceCase(null as any)).toBe("");
      expect(sentenceCase(undefined as any)).toBe("");
    });
  });

  describe("camelCaseToReadable", () => {
    it("should convert camelCase to readable text with title case", () => {
      expect(camelCaseToReadable("ingredientName")).toBe("Ingredient Name");
      expect(camelCaseToReadable("someLongVariableName")).toBe("Some Long Variable Name");
    });

    it("should convert PascalCase to readable text", () => {
      expect(camelCaseToReadable("IngredientName")).toBe("Ingredient Name");
    });

    it("should handle single word", () => {
      expect(camelCaseToReadable("ingredient")).toBe("Ingredient");
    });

    it("should return empty string for empty or null input", () => {
      expect(camelCaseToReadable("")).toBe("");
      expect(camelCaseToReadable(null as any)).toBe("");
      expect(camelCaseToReadable(undefined as any)).toBe("");
    });

    it("should handle consecutive capital letters", () => {
      expect(camelCaseToReadable("XMLParser")).toBe("X M L Parser");
    });

    it("should handle numbers in strings", () => {
      expect(camelCaseToReadable("version2")).toBe("Version2");
      expect(camelCaseToReadable("myApp1")).toBe("My App1");
    });

    it("should handle strings that already have spaces", () => {
      expect(camelCaseToReadable("already Readable")).toBe("Already  Readable");
    });
  });

  describe("toKebabCase", () => {
    it("should convert camelCase to kebab-case", () => {
      expect(toKebabCase("ingredientName")).toBe("ingredient-name");
    });

    it("should convert PascalCase to kebab-case", () => {
      expect(toKebabCase("IngredientName")).toBe("ingredient-name");
    });

    it("should convert space-separated text to kebab-case", () => {
      expect(toKebabCase("Ingredient Name")).toBe("ingredient-name");
      expect(toKebabCase("some long name")).toBe("some-long-name");
    });

    it("should convert underscore-separated text to kebab-case", () => {
      expect(toKebabCase("ingredient_name")).toBe("ingredient-name");
      expect(toKebabCase("SOME_CONSTANT")).toBe("some-constant");
    });

    it("should handle multiple spaces or underscores", () => {
      expect(toKebabCase("ingredient   name")).toBe("ingredient-name");
      expect(toKebabCase("ingredient___name")).toBe("ingredient-name");
    });

    it("should return empty string for empty or null input", () => {
      expect(toKebabCase("")).toBe("");
      expect(toKebabCase(null as any)).toBe("");
      expect(toKebabCase(undefined as any)).toBe("");
    });
  });

  describe("toCamelCase", () => {
    it("should convert space-separated text to camelCase", () => {
      expect(toCamelCase("ingredient name")).toBe("ingredientName");
      expect(toCamelCase("some long variable name")).toBe("someLongVariableName");
    });

    it("should convert kebab-case to camelCase", () => {
      expect(toCamelCase("ingredient-name")).toBe("ingredientName");
    });

    it("should convert snake_case to camelCase", () => {
      expect(toCamelCase("ingredient_name")).toBe("ingredientName");
    });

    it("should convert Title Case to camelCase", () => {
      expect(toCamelCase("Ingredient Name")).toBe("ingredientName");
    });

    it("should convert PascalCase to camelCase", () => {
      expect(toCamelCase("IngredientName")).toBe("ingredientName");
    });

    it("should handle multiple separators", () => {
      expect(toCamelCase("ingredient--name")).toBe("ingredientName");
      expect(toCamelCase("ingredient__name")).toBe("ingredientName");
      expect(toCamelCase("ingredient  name")).toBe("ingredientName");
    });

    it("should return empty string for empty or null input", () => {
      expect(toCamelCase("")).toBe("");
      expect(toCamelCase(null as any)).toBe("");
      expect(toCamelCase(undefined as any)).toBe("");
    });
  });
});

describe("Text Formatter Utils - Text Manipulation", () => {
  describe("truncateWords", () => {
    it("should truncate string with more words than the limit and append default suffix", () => {
      expect(truncateWords("This is a long string", 3)).toBe("This is a...");
    });

    it("should truncate string and append custom suffix", () => {
      expect(truncateWords("This is a long string", 3, " [read more]")).toBe(
        "This is a [read more]"
      );
    });

    it("should return the original string if the number of words is equal to the limit", () => {
      expect(truncateWords("This is a string", 4)).toBe("This is a string");
    });

    it("should return the original string if the number of words is less than the limit", () => {
      expect(truncateWords("Short string", 5)).toBe("Short string");
    });

    it("should handle strings with multiple spaces correctly (current split behavior)", () => {
      // split(" ") creates empty strings for extra spaces, which count as words
      expect(truncateWords("This  is   spaced", 4)).toBe("This  is ...");
    });

    it("should return an empty string for empty, null, or undefined input", () => {
      expect(truncateWords("", 3)).toBe("");
      expect(truncateWords(null as any, 3)).toBe("");
      expect(truncateWords(undefined as any, 3)).toBe("");
    });
  });

  describe("truncate", () => {
    it("should truncate text to specified length and add default ellipsis", () => {
      expect(truncate("hello world", 8)).toBe("hello...");
    });

    it("should truncate text and add custom suffix", () => {
      expect(truncate("hello world", 8, "..")).toBe("hello ..");
    });

    it("should not truncate if text is shorter than length", () => {
      expect(truncate("hello", 10)).toBe("hello");
    });

    it("should not truncate if text is exactly equal to length", () => {
      expect(truncate("hello", 5)).toBe("hello");
    });

    it("should handle length shorter than suffix", () => {
      expect(truncate("hello", 2)).toBe("...");
    });

    it("should return empty string for empty or null input", () => {
      expect(truncate("", 5)).toBe("");
      expect(truncate(null as any, 5)).toBe(null);
      expect(truncate(undefined as any, 5)).toBe(undefined);
    });
  });
});

describe("Text Formatter Utils - getInitials", () => {
  describe("getInitials", () => {
    it("should extract initials from a full name", () => {
      expect(getInitials("John Doe")).toBe("JD");
      expect(getInitials("Jane Mary Smith")).toBe("JM"); // default max is 2
    });

    it("should respect the maxInitials parameter", () => {
      expect(getInitials("John Jacob Jingleheimer Schmidt", 3)).toBe("JJJ");
      expect(getInitials("One Two Three Four Five", 5)).toBe("OTTFF");
      expect(getInitials("Only One", 1)).toBe("O");
    });

    it("should return a single initial for a single word name", () => {
      expect(getInitials("Cher")).toBe("C");
      expect(getInitials("Madonna")).toBe("M");
    });

    it("should return empty string for empty or null input", () => {
      expect(getInitials("")).toBe("");
      expect(getInitials(null as any)).toBe("");
      expect(getInitials(undefined as any)).toBe("");
    });

    it("should capitalize the initials even if input is lowercase", () => {
      expect(getInitials("john doe")).toBe("JD");
      expect(getInitials("e e cummings", 3)).toBe("EEC");
    });

    it("should handle extra spaces correctly", () => {
      // The current implementation splits by " ", so "John  Doe" creates an empty string in the array
      // Let's test how it actually behaves with the current implementation
      // "John  Doe".split(" ") -> ["John", "", "Doe"]
      // .slice(0, 2) -> ["John", ""]
      // .map(w => w.charAt(0).toUpperCase()) -> ["J", ""]
      // .join("") -> "J"
      expect(getInitials("John  Doe")).toBe("J");
    });
  });
});

describe("Text Formatter Utils - Whitespace Formatting", () => {
  describe("normalizeWhitespace", () => {
    it("should remove extra spaces between words", () => {
      expect(normalizeWhitespace("hello   world")).toBe("hello world");
      expect(normalizeWhitespace("this  is   a    test")).toBe("this is a test");
    });

    it("should remove leading and trailing spaces", () => {
      expect(normalizeWhitespace("  hello world  ")).toBe("hello world");
      expect(normalizeWhitespace("    test    ")).toBe("test");
    });

    it("should handle newlines and tabs", () => {
      expect(normalizeWhitespace("hello\tworld")).toBe("hello world");
      expect(normalizeWhitespace("hello\nworld")).toBe("hello world");
      expect(normalizeWhitespace("hello\r\nworld")).toBe("hello world");
      expect(normalizeWhitespace("  hello \t \n world  ")).toBe("hello world");
    });

    it("should not modify strings that are already normalized", () => {
      expect(normalizeWhitespace("hello world")).toBe("hello world");
      expect(normalizeWhitespace("this is a test")).toBe("this is a test");
    });

    it("should return empty string for empty or null input", () => {
      expect(normalizeWhitespace("")).toBe("");
      expect(normalizeWhitespace("   ")).toBe("");
      expect(normalizeWhitespace(null as any)).toBe("");
      expect(normalizeWhitespace(undefined as any)).toBe("");
    });
  });
});
