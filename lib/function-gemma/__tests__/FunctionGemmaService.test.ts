import {
  FunctionGemmaService,
  parseFunctionCalls,
  type ToolExecutor,
} from "../FunctionGemmaService";

jest.mock("expo-file-system", () => {
  const mockDownloadFileAsync = jest.fn();
  return {
    Paths: { document: "/mock/path" },
    File: class MockFile {
      uri: string;
      exists: boolean;
      constructor(path: string, filename?: string) {
        this.uri = filename ? `${path}/${filename}` : path;
        // Make it return true for the tests where we need it
        this.exists = this.uri.includes("functiongemma");
      }
      static downloadFileAsync = mockDownloadFileAsync;
    },
  };
});

const mockReleaseAllLlama = jest.fn();
const mockInitLlama = jest.fn();

jest.mock("llama.rn", () => ({
  initLlama: (...args: any[]) => mockInitLlama(...args),
  releaseAllLlama: () => mockReleaseAllLlama(),
}));

describe("FunctionGemmaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseFunctionCalls", () => {
    it("should parse simple string arguments", () => {
      const text =
        "<start_function_call>call:add_item{name:<escape>milk<escape>}<end_function_call>";
      const result = parseFunctionCalls(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: "add_item",
        arguments: { name: "milk" },
      });
    });

    it("should parse integer and boolean arguments", () => {
      // NOTE: "get_expiring_items" has "days_ahead", just an example of a known function with a number
      const text =
        "<start_function_call>call:get_expiring_items{days_ahead:3,include_frozen:false}<end_function_call>";
      const result = parseFunctionCalls(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: "get_expiring_items",
        arguments: { days_ahead: 3, include_frozen: false },
      });
    });

    it("should parse array arguments", () => {
      const text =
        "<start_function_call>call:find_recipes{ingredients:[<escape>chicken<escape>,<escape>rice<escape>]}<end_function_call>";
      const result = parseFunctionCalls(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: "find_recipes",
        arguments: { ingredients: ["chicken", "rice"] },
      });
    });

    it("should skip unknown tool names", () => {
      const text =
        "<start_function_call>call:hack_mainframe{target:<escape>fbi<escape>}<end_function_call>";
      const result = parseFunctionCalls(text);
      expect(result).toHaveLength(0);
    });

    it("should return empty array for text with no function calls", () => {
      const text = "Here is your recipe for chicken and rice.";
      const result = parseFunctionCalls(text);
      expect(result).toHaveLength(0);
    });

    it("should only parse the first valid call", () => {
      const text =
        "<start_function_call>call:add_item{name:<escape>apple<escape>}<end_function_call> Some other text <start_function_call>call:add_item{name:<escape>banana<escape>}<end_function_call>";
      const result = parseFunctionCalls(text);
      expect(result).toHaveLength(1);
      expect(result[0]?.arguments).toEqual({ name: "apple" });
    });
  });

  describe("Initialization", () => {
    it("should initialize correctly when model file exists", async () => {
      const mockContext = { completion: jest.fn() };
      mockInitLlama.mockResolvedValueOnce(mockContext);

      const service = new FunctionGemmaService();
      // File mock returns true for exists when filename is present
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
        text: "<start_function_call>call:add_item{name:<escape>tomato<escape>}", // Missing end tag, parser auto-fixes
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
    let mockExecutor: jest.Mocked<ToolExecutor>;

    beforeEach(async () => {
      mockContext = { completion: jest.fn() };
      mockInitLlama.mockResolvedValue(mockContext);

      mockExecutor = {
        addItem: jest.fn().mockResolvedValue({ success: true, message: "Added item" }),
        removeItem: jest.fn(),
        getInventory: jest.fn(),
        getExpiringItems: jest.fn(),
        setExpiryAlert: jest.fn(),
        addToGroceryList: jest.fn(),
        getGroceryList: jest.fn(),
        findRecipes: jest.fn(),
        suggestMeals: jest.fn(),
        scanBarcode: jest.fn(),
      };

      service = new FunctionGemmaService(mockExecutor);
      await service.initialize();
    });

    it("should execute tool call via ToolExecutor", async () => {
      // Setup model to return a tool call
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
      // Setup second completion
      mockContext.completion.mockResolvedValueOnce({
        text: "I have added eggs to your pantry.",
      });

      const result = await service.processMessage("Add eggs");

      expect(mockExecutor.addItem).toHaveBeenCalledWith({ name: "eggs" });
      expect(result.text).toBe("I have added eggs to your pantry.");
      expect(result.tool_calls).toBeDefined();
    });

    it("should fallback to formatting text if second completion fails", async () => {
      // Setup model to return a tool call
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
      // Setup second completion to FAIL
      mockContext.completion.mockRejectedValueOnce(new Error("Model crashed"));

      const result = await service.processMessage("Add eggs");

      // It should fallback to the tool message
      expect(result.text).toBe("Added item");
      expect(mockExecutor.addItem).toHaveBeenCalled();
    });
  });
});
