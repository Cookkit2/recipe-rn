import { parseFunctionCalls } from "../FunctionGemmaService";

jest.mock("expo-file-system", () => ({
  File: jest.fn(),
  Paths: { documentDirectory: "mocked/dir/" },
}));
jest.mock("~/utils/logger", () => ({
  log: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("parseFunctionCalls", () => {
  it("should parse a valid tool call with string arguments", () => {
    const input =
      "<start_function_call>call:add_item{name:<escape>milk<escape>,quantity:<escape>1<escape>}<end_function_call>";
    const result = parseFunctionCalls(input);
    expect(result).toEqual([
      {
        name: "add_item",
        arguments: { name: "milk", quantity: "1" },
      },
    ]);
  });

  it("should parse a valid tool call with bare numeric arguments", () => {
    const input =
      "<start_function_call>call:add_item{name:<escape>milk<escape>,quantity:1}<end_function_call>";
    const result = parseFunctionCalls(input);
    expect(result).toEqual([
      {
        name: "add_item",
        arguments: { name: "milk", quantity: 1 },
      },
    ]);
  });

  it("should parse boolean arguments correctly", () => {
    const input =
      "<start_function_call>call:add_item{name:<escape>milk<escape>,perishable:true}<end_function_call>";
    const result = parseFunctionCalls(input);
    expect(result).toEqual([
      {
        name: "add_item",
        arguments: { name: "milk", perishable: true },
      },
    ]);
  });

  it("should parse array arguments correctly", () => {
    const input =
      "<start_function_call>call:suggest_meals{ingredients:[<escape>chicken<escape>,<escape>rice<escape>]}<end_function_call>";
    const result = parseFunctionCalls(input);
    expect(result).toEqual([
      {
        name: "suggest_meals",
        arguments: { ingredients: ["chicken", "rice"] },
      },
    ]);
  });

  it("should ignore invalid/unknown tools", () => {
    const input =
      "<start_function_call>call:hack_mainframe{target:<escape>nasa<escape>}<end_function_call>";
    const result = parseFunctionCalls(input);
    expect(result).toEqual([]);
  });

  it("should handle hallucinated continuations by only returning the first tool", () => {
    const input =
      "<start_function_call>call:add_item{name:<escape>milk<escape>}<end_function_call> some other text <start_function_call>call:add_item{name:<escape>eggs<escape>}<end_function_call>";
    const result = parseFunctionCalls(input);
    expect(result).toEqual([
      {
        name: "add_item",
        arguments: { name: "milk" },
      },
    ]);
  });

  it("should handle missing tool names safely", () => {
    const input = "<start_function_call>call:{name:<escape>milk<escape>}<end_function_call>";
    const result = parseFunctionCalls(input);
    expect(result).toEqual([]);
  });

  it("should parse empty arrays correctly", () => {
    const input = "<start_function_call>call:suggest_meals{ingredients:[]}<end_function_call>";
    const result = parseFunctionCalls(input);
    expect(result).toEqual([
      {
        name: "suggest_meals",
        arguments: { ingredients: [] },
      },
    ]);
  });

  it("should parse arrays with bare numbers correctly", () => {
    const input = "<start_function_call>call:suggest_meals{ingredients:[1,2,3]}<end_function_call>";
    const result = parseFunctionCalls(input);
    expect(result).toEqual([
      {
        name: "suggest_meals",
        arguments: { ingredients: [1, 2, 3] },
      },
    ]);
  });
});
