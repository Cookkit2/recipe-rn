import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

const mockReleaseAllLlama: any = jest.fn();
const mockInitLlama: any = jest.fn();

jest.mock("llama.rn", () => ({
  initLlama: (...args: any[]) => mockInitLlama(...args),
  releaseAllLlama: (...args: any[]) => mockReleaseAllLlama(...args),
}));

jest.mock("expo-file-system", () => {
  const mockDownloadFileAsync = jest.fn();
  return {
    Paths: { document: "/mock/path" },
    File: class MockFile {
      uri: string;
      exists: boolean;
      constructor(path: string, filename?: string) {
        this.uri = filename ? `${path}/${filename}` : path;
        this.exists = this.uri.includes("functiongemma");
      }
      static downloadFileAsync = mockDownloadFileAsync;
    },
  };
});

import {
  FunctionGemmaService,
  parseFunctionCalls,
  type ToolExecutor,
} from "../FunctionGemmaService";

describe("parseFunctionCalls", () => {
  beforeEach(() => {
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
      "<start_function_call>call:add_item{name:milk<end_function_call>",
      "<start_function_call>call:add_item{name:<escape>milk<escape>}",
      "call:add_item{name:<escape>milk<escape>}<end_function_call>",
      "<start_function_call>add_item{name:<escape>milk<escape>}<end_function_call>",
    ];

    malformedInputs.forEach((input) => {
      const result = parseFunctionCalls(input);
      expect(result).toHaveLength(0);
    });
  });
});

describe("FunctionGemmaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize correctly when model file exists", async () => {
      const mockContext = { completion: jest.fn() };
      mockInitLlama.mockResolvedValueOnce(mockContext);

      const service = new FunctionGemmaService();
      const success = await service.initialize();

      expect(success).toBe(true);
      expect(service.isReady()).toBe(true);
      expect(mockInitLlama).toHaveBeenCalledWith(
        expect.objectContaining({
          use_mlock: true,
          n_ctx: 4096,
          n_gpu_layers: 1,
        })
      );
    });

    it("should fail to initialize if initLlama returns null", async () => {
      mockInitLlama.mockResolvedValueOnce(null);

      const service = new FunctionGemmaService();
      const success = await service.initialize();

      expect(success).toBe(false);
      expect(service.isReady()).toBe(false);
    });

    it("should clean up correctly", async () => {
      const mockContext = { completion: jest.fn() };
      mockInitLlama.mockResolvedValueOnce(mockContext);

      const service = new FunctionGemmaService();
      await service.initialize();
      expect(service.isReady()).toBe(true);

      await service.cleanup();
      expect(service.isReady()).toBe(false);
      expect(mockReleaseAllLlama).toHaveBeenCalled();
    });
  });

  describe("processMessage", () => {
    let mockContext: any;
    let service: FunctionGemmaService;

    beforeEach(async () => {
      mockContext = { completion: jest.fn() };
      mockInitLlama.mockResolvedValue(mockContext);
      service = new FunctionGemmaService();
      await service.initialize();
    });

    it("should return text when no tool calls are generated", async () => {
      mockContext.completion.mockResolvedValueOnce({
        text: "Hello! How can I help you cook today?",
        tool_calls: [],
      });

      const result = await service.processMessage("Hi");
      expect(result.text).toBe("Hello! How can I help you cook today?");
      expect(result.tool_calls).toBeUndefined();
    });

    it("should parse manual tool calls from text if tool_calls array is missing", async () => {
      mockContext.completion.mockResolvedValueOnce({
        text: "<start_function_call>call:add_item{name:<escape>tomato<escape>}",
      });

      const result = await service.processMessage("Add tomato");
      expect(result.tool_calls).toBeDefined();
      expect(result.tool_calls?.[0]?.function.name).toBe("add_item");
      expect(result.tool_calls?.[0]?.function.arguments).toEqual({ name: "tomato" });
    });

    it("should throw error if called before initialization", async () => {
      const uninitializedService = new FunctionGemmaService();
      await expect(uninitializedService.processMessage("Hi")).rejects.toThrow(
        "Function Gemma not initialized"
      );
    });
  });

  describe("Tool Execution", () => {
    let mockContext: any;
    let service: FunctionGemmaService;
    let mockExecutor: ToolExecutor;

    beforeEach(async () => {
      mockContext = { completion: jest.fn() };
      mockInitLlama.mockResolvedValue(mockContext);

      mockExecutor = {
        addItem: jest.fn(() => Promise.resolve({ success: true, message: "Added item" })),
        removeItem: jest.fn(),
        getInventory: jest.fn(),
        getExpiringItems: jest.fn(),
        setExpiryAlert: jest.fn(),
        addToGroceryList: jest.fn(),
        getGroceryList: jest.fn(),
        findRecipes: jest.fn(),
        suggestMeals: jest.fn(),
        scanBarcode: jest.fn(),
      } as unknown as ToolExecutor;

      service = new FunctionGemmaService(mockExecutor);
      await service.initialize();
    });

    it("should execute tool call via ToolExecutor", async () => {
      mockContext.completion.mockResolvedValueOnce({
        text: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "add_item", arguments: { name: "eggs" } },
          },
        ],
      });
      mockContext.completion.mockResolvedValueOnce({
        text: "I have added eggs to your pantry.",
      });

      const result = await service.processMessage("Add eggs");

      expect(mockExecutor.addItem).toHaveBeenCalledWith({ name: "eggs" });
      expect(result.text).toBe("I have added eggs to your pantry.");
      expect(result.tool_calls).toBeDefined();
    });

    it("should fallback to formatting text if second completion fails", async () => {
      mockContext.completion.mockResolvedValueOnce({
        text: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "add_item", arguments: { name: "eggs" } },
          },
        ],
      });
      mockContext.completion.mockRejectedValueOnce(new Error("Model crashed"));

      const result = await service.processMessage("Add eggs");

      expect(result.text).toBe("Added item");
      expect(mockExecutor.addItem).toHaveBeenCalled();
    });
  });
});
