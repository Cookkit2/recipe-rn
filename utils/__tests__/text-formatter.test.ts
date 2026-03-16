import {
  capitalize,
  titleCase,
  sentenceCase,
  camelCaseToReadable,
  toKebabCase,
  toCamelCase,
  pluralize,
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

    it("should return empty string for empty or null input", () => {
      expect(toCamelCase("")).toBe("");
      expect(toCamelCase(null as any)).toBe("");
      expect(toCamelCase(undefined as any)).toBe("");
    });
  });
});

describe("Text Formatter Utils - Pluralization", () => {
  describe("pluralize", () => {
    it("should return empty string for empty input", () => {
      expect(pluralize("", 0)).toBe("");
      expect(pluralize("", 2)).toBe("");
      expect(pluralize(null as any, 2)).toBe("");
      expect(pluralize(undefined as any, 2)).toBe("");
    });

    it("should return the original word when count is 1", () => {
      expect(pluralize("apple", 1)).toBe("apple");
      expect(pluralize("child", 1)).toBe("child");
      expect(pluralize("box", 1)).toBe("box");
    });

    it("should handle irregular plurals", () => {
      expect(pluralize("child", 2)).toBe("children");
      expect(pluralize("person", 5)).toBe("people");
      expect(pluralize("man", 0)).toBe("men");
      expect(pluralize("woman", 3)).toBe("women");
      expect(pluralize("tooth", 10)).toBe("teeth");
      expect(pluralize("foot", 2)).toBe("feet");
      expect(pluralize("mouse", 4)).toBe("mice");
      expect(pluralize("goose", 6)).toBe("geese");
    });

    it("should handle irregular plurals regardless of case", () => {
      expect(pluralize("CHILD", 2)).toBe("children");
      expect(pluralize("Person", 5)).toBe("people");
    });

    it("should handle words ending in 'y' preceded by a consonant", () => {
      expect(pluralize("berry", 2)).toBe("berries");
      expect(pluralize("city", 5)).toBe("cities");
      expect(pluralize("puppy", 3)).toBe("puppies");
    });

    it("should handle words ending in 'y' preceded by a vowel", () => {
      expect(pluralize("boy", 2)).toBe("boys");
      expect(pluralize("toy", 5)).toBe("toys");
      expect(pluralize("day", 3)).toBe("days");
      expect(pluralize("guy", 4)).toBe("guys");
    });

    it("should handle words ending in 's', 'sh', 'ch', 'x', or 'z'", () => {
      expect(pluralize("bus", 2)).toBe("buses");
      expect(pluralize("dish", 5)).toBe("dishes");
      expect(pluralize("match", 3)).toBe("matches");
      expect(pluralize("box", 4)).toBe("boxes");
      expect(pluralize("quiz", 2)).toBe("quizes");
    });

    it("should handle words ending in 'f'", () => {
      expect(pluralize("leaf", 2)).toBe("leaves");
      expect(pluralize("wolf", 5)).toBe("wolves");
      expect(pluralize("half", 3)).toBe("halves");
    });

    it("should handle words ending in 'fe'", () => {
      expect(pluralize("knife", 2)).toBe("knives");
      expect(pluralize("wife", 5)).toBe("wives");
      expect(pluralize("life", 3)).toBe("lives");
    });

    it("should handle regular words", () => {
      expect(pluralize("apple", 2)).toBe("apples");
      expect(pluralize("car", 5)).toBe("cars");
      expect(pluralize("book", 3)).toBe("books");
      expect(pluralize("tree", 4)).toBe("trees");
    });
  });
});
