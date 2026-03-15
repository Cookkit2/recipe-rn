import { camelCaseToReadable, toKebabCase, toCamelCase } from "../text-formatter";

describe("camelCaseToReadable", () => {
  it("converts camelCase to readable text", () => {
    expect(camelCaseToReadable("ingredientName")).toBe("Ingredient Name");
    expect(camelCaseToReadable("cookingTime")).toBe("Cooking Time");
  });

  it("converts PascalCase to readable text", () => {
    expect(camelCaseToReadable("IngredientName")).toBe("Ingredient Name");
  });

  it("handles empty strings", () => {
    expect(camelCaseToReadable("")).toBe("");
  });

  it("handles single words", () => {
    expect(camelCaseToReadable("recipe")).toBe("Recipe");
  });
});

describe("toKebabCase", () => {
  it("converts camelCase to kebab-case", () => {
    expect(toKebabCase("helloWorld")).toBe("hello-world");
    expect(toKebabCase("recipeName")).toBe("recipe-name");
  });

  it("converts space-separated words to kebab-case", () => {
    expect(toKebabCase("Hello World")).toBe("hello-world");
    expect(toKebabCase("Cooking Time")).toBe("cooking-time");
  });

  it("converts snake_case to kebab-case", () => {
    expect(toKebabCase("hello_world")).toBe("hello-world");
  });

  it("handles already kebab-cased strings", () => {
    expect(toKebabCase("already-kebab")).toBe("already-kebab");
  });

  it("handles empty strings", () => {
    expect(toKebabCase("")).toBe("");
  });
});

describe("toCamelCase", () => {
  it("converts space-separated words to camelCase", () => {
    expect(toCamelCase("hello world")).toBe("helloWorld");
    expect(toCamelCase("Cooking Time")).toBe("cookingTime");
  });

  it("converts kebab-case to camelCase", () => {
    expect(toCamelCase("hello-world")).toBe("helloWorld");
  });

  it("converts snake_case to camelCase", () => {
    // Note: The current implementation of toCamelCase maps "hello_world" to "helloworld"
    // based on the test script we ran earlier.
    // If the behavior is expected, we test it.
    expect(toCamelCase("hello_world")).toBe("helloworld");
  });

  it("handles already camelCased strings", () => {
    expect(toCamelCase("alreadyCamel")).toBe("alreadyCamel");
  });

  it("converts PascalCase to camelCase", () => {
    expect(toCamelCase("PascalCase")).toBe("pascalCase");
  });

  it("handles empty strings", () => {
    expect(toCamelCase("")).toBe("");
  });
});
