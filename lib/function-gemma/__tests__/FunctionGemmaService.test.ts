import { describe, it, expect, jest } from "@jest/globals";

// Mock NativeModules before importing FunctionGemmaService
jest.mock("llama.rn", () => ({
  initLlama: jest.fn(),
  releaseAllLlama: jest.fn(),
}));

jest.mock("expo-file-system", () => ({
  File: class File {
    exists = false;
    uri = "mock-uri";
    constructor() {}
  },
  Paths: {
    document: "mock-document-path",
  },
}));

import { parseFunctionCalls } from "../FunctionGemmaService";

describe("parseFunctionCalls", () => {
  beforeEach(() => {
    // Suppress console.warn during tests
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should parse a valid function call with string and number arguments", () => {
    const input = `<start_function_call>call:add_item{name:<escape>milk<escape>,quantity:2}<end_function_call>`;
    const result = parseFunctionCalls(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "add_item",
      arguments: {
        name: "milk",
        quantity: 2,
      },
    });
  });

  it("should parse a valid function call with boolean arguments", () => {
    const input = `<start_function_call>call:add_item{name:<escape>cheese<escape>,is_dairy:true,is_meat:false}<end_function_call>`;
    const result = parseFunctionCalls(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "add_item",
      arguments: {
        name: "cheese",
        is_dairy: true,
        is_meat: false,
      },
    });
  });

  it("should parse a valid function call with float arguments", () => {
    const input = `<start_function_call>call:add_item{name:<escape>cheese<escape>,weight:1.5}<end_function_call>`;
    const result = parseFunctionCalls(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "add_item",
      arguments: {
        name: "cheese",
        weight: 1.5,
      },
    });
  });

  it("should parse a valid function call with an array argument", () => {
    const input = `<start_function_call>call:find_recipes{ingredients:[<escape>chicken<escape>,<escape>garlic<escape>,onion]}<end_function_call>`;
    const result = parseFunctionCalls(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "find_recipes",
      arguments: {
        ingredients: ["chicken", "garlic", "onion"],
      },
    });
  });

  it("should parse only the first valid function call and skip hallucinated continuations", () => {
    const input = `
      <start_function_call>call:add_item{name:<escape>milk<escape>,quantity:1}<end_function_call>
      Some hallucinated text here.
      <start_function_call>call:remove_item{item_id:<escape>123<escape>}<end_function_call>
    `;
    const result = parseFunctionCalls(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "add_item",
      arguments: {
        name: "milk",
        quantity: 1,
      },
    });
  });

  it("should ignore validly formatted calls to unknown tools", () => {
    const input = `<start_function_call>call:launch_nukes{target:<escape>mars<escape>}<end_function_call>`;
    const result = parseFunctionCalls(input);

    expect(result).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Parsed unknown tool name: "launch_nukes", skipping')
    );
  });

  it("should skip unknown tools and parse the first valid tool", () => {
    const input = `
      <start_function_call>call:unknown_tool{foo:<escape>bar<escape>}<end_function_call>
      <start_function_call>call:add_item{name:<escape>milk<escape>}<end_function_call>
    `;
    const result = parseFunctionCalls(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "add_item",
      arguments: {
        name: "milk",
      },
    });
  });

  it("should handle empty strings", () => {
    const result = parseFunctionCalls("");
    expect(result).toHaveLength(0);
  });

  it("should handle strings with no function calls", () => {
    const result = parseFunctionCalls("I am just a helpful AI assistant.");
    expect(result).toHaveLength(0);
  });

  it("should handle malformed function calls gracefully", () => {
    const malformedInputs = [
      "<start_function_call>call:add_item{name:milk<end_function_call>", // missing closing brace
      "<start_function_call>call:add_item{name:<escape>milk<escape>}", // missing end token
      "call:add_item{name:<escape>milk<escape>}<end_function_call>", // missing start token
      "<start_function_call>add_item{name:<escape>milk<escape>}<end_function_call>", // missing 'call:' prefix
    ];

    malformedInputs.forEach((input) => {
      const result = parseFunctionCalls(input);
      expect(result).toHaveLength(0);
    });
  });
});
