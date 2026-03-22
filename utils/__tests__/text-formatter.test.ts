import {
  capitalize,
  titleCase,
  sentenceCase,
  camelCaseToReadable,
  toKebabCase,
  toCamelCase,
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

    it("should handle ALL CAPS", () => {
      expect(toCamelCase("HELLO WORLD")).toBe("helloWorld");
      expect(toCamelCase("INGREDIENT")).toBe("ingredient");
    });

    it("should handle strings with numbers", () => {
      expect(toCamelCase("version 2.0")).toBe("version2.0");
      expect(toCamelCase("ingredient 1")).toBe("ingredient1");
    });

    it("should handle leading and trailing spaces", () => {
      expect(toCamelCase("  leading spaces")).toBe("leadingSpaces");
      expect(toCamelCase("trailing spaces  ")).toBe("trailingSpaces");
      expect(toCamelCase("  both spaces  ")).toBe("bothSpaces");
    });

    it("should return empty string for empty or null input", () => {
      expect(toCamelCase("")).toBe("");
      expect(toCamelCase(null as any)).toBe("");
      expect(toCamelCase(undefined as any)).toBe("");
    });
  });
});
