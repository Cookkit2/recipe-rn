/**
 * FunctionGemmaService - Service for managing Function Gemma AI model and tool calling
 *
 * This service handles:
 * - Model initialization and loading
 * - Tool definitions for Cookkit features
 * - Function calling and execution
 * - Response formatting
 */

import { initLlama, releaseAllLlama } from "llama.rn";
import { File, Paths } from "expo-file-system";

// ============================================================================
// TYPES
// ============================================================================

export interface FridgitTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface CompletionResult {
  text: string;
  tool_calls?: ToolCall[];
  timings?: {
    predicted_per_second: number;
    predicted_ms: number;
    load_ms: number;
  };
}

export interface ModelConfig {
  fileName: string;
  url: string;
  size: number;
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * All available tools for Cookkit AI assistant
 */
export const FRIDGIT_TOOLS: FridgitTool[] = [
  // Inventory Management
  {
    type: "function",
    function: {
      name: "add_item",
      description:
        'Add a food item to the pantry. DEFAULT tool when user says "add", "put", "store", or "I have" followed by a food name. Adds ingredients to the kitchen inventory.',
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: 'Name of the food item (e.g., "milk", "cheese", "apples", "chicken")',
          },
          quantity: {
            type: "number",
            description: "Quantity of the item (default 1)",
          },
          unit: {
            type: "string",
            description: 'Unit of measurement (e.g., "liters", "kg", "pieces", "cartons")',
          },
          location: {
            type: "string",
            enum: ["fridge", "freezer", "cabinet", "pantry"],
            description: "Where the item is stored (default: fridge)",
          },
          expiry_date: {
            type: "string",
            description: "Expiry date in YYYY-MM-DD format (optional)",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_item",
      description: "Remove or consume a food item from inventory",
      parameters: {
        type: "object",
        properties: {
          item_id: {
            type: "string",
            description: "ID of the item to remove",
          },
          quantity: {
            type: "number",
            description: "Quantity to remove (defaults to all if not specified)",
          },
        },
        required: ["item_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory",
      description: "Get list of all items in the pantry",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            enum: ["fridge", "freezer", "cabinet", "pantry", "all"],
            description: "Filter by location (default: all)",
          },
          category: {
            type: "string",
            description: 'Filter by category (e.g., "dairy", "vegetables", "meat")',
          },
        },
      },
    },
  },

  // Expiration Tracking
  {
    type: "function",
    function: {
      name: "get_expiring_items",
      description: "Get items that will expire soon",
      parameters: {
        type: "object",
        properties: {
          days_ahead: {
            type: "number",
            description: "Number of days ahead to check (default: 3)",
            default: 3,
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_expiry_alert",
      description: "Set a reminder for an expiring item",
      parameters: {
        type: "object",
        properties: {
          item_id: {
            type: "string",
            description: "ID of the item to set alert for",
          },
          alert_time: {
            type: "string",
            description: "Time to send alert in YYYY-MM-DD HH:MM format",
          },
        },
        required: ["item_id", "alert_time"],
      },
    },
  },

  // Grocery List
  {
    type: "function",
    function: {
      name: "add_to_grocery_list",
      description:
        'Add an item to the shopping/grocery list for buying later. ONLY use when the user explicitly says "grocery list", "shopping list", or "need to buy". Do NOT use for general "add" commands.',
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the item to buy at the store",
          },
          quantity: {
            type: "number",
            description: "Quantity to buy",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Priority level (default: medium)",
            default: "medium",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_grocery_list",
      description: "Get the current grocery list",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["all", "high", "medium", "low"],
            description: "Filter by priority",
          },
        },
      },
    },
  },

  // Recipe & Meal Planning
  {
    type: "function",
    function: {
      name: "find_recipes",
      description: "Find recipes using available ingredients",
      parameters: {
        type: "object",
        properties: {
          ingredients: {
            type: "array",
            items: { type: "string" },
            description: "List of ingredients to use",
          },
          meal_type: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "Type of meal",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_meals",
      description: "Suggest meals based on current inventory",
      parameters: {
        type: "object",
        properties: {
          meal_type: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner"],
            description: "Type of meal to suggest",
          },
          days: {
            type: "number",
            description: "Number of days to plan for (default: 1)",
            default: 1,
          },
        },
      },
    },
  },

  // Product Identification
  {
    type: "function",
    function: {
      name: "scan_barcode",
      description: "Identify a product from its barcode",
      parameters: {
        type: "object",
        properties: {
          barcode: {
            type: "string",
            description: "Barcode or UPC code",
          },
        },
        required: ["barcode"],
      },
    },
  },
];

// ============================================================================
// FUNCTIONGEMMA OUTPUT PARSER
// ============================================================================

/**
 * Valid tool names from FRIDGIT_TOOLS for validation
 */
const VALID_TOOL_NAMES = new Set([
  "add_item",
  "remove_item",
  "get_inventory",
  "get_expiring_items",
  "set_expiry_alert",
  "add_to_grocery_list",
  "get_grocery_list",
  "find_recipes",
  "suggest_meals",
  "scan_barcode",
]);

/**
 * Cast a raw string value to the appropriate JS type.
 * Ported from Google's official FunctionGemma notebook.
 */
function castValue(v: string): string | number | boolean {
  const trimmed = v.trim();
  const asInt = parseInt(trimmed, 10);
  if (!isNaN(asInt) && String(asInt) === trimmed) return asInt;
  const asFloat = parseFloat(trimmed);
  if (!isNaN(asFloat)) return asFloat;
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;
  return trimmed.replace(/^['"]|['"]$/g, "");
}

/**
 * Parse FunctionGemma's raw text output into structured tool calls.
 *
 * FunctionGemma outputs: <start_function_call>call:func_name{key:<escape>val<escape>,key2:123}<end_function_call>
 * This regex parser is ported from Google's official notebook.
 *
 * Only returns the FIRST valid call to avoid acting on hallucinated continuations.
 */
export function parseFunctionCalls(
  text: string
): Array<{ name: string; arguments: Record<string, any> }> {
  const callRegex = /<start_function_call>call:(\w+)\{(.*?)\}<end_function_call>/gs;
  const argRegex = /(\w+):(?:<escape>(.*?)<escape>|(\[[^\]]*\])|([^,}]*))/g;

  const calls: Array<{ name: string; arguments: Record<string, any> }> = [];

  let callMatch: RegExpExecArray | null;
  while ((callMatch = callRegex.exec(text)) !== null) {
    const name = callMatch[1] ?? "";
    const argsStr = callMatch[2] ?? "";
    const args: Record<string, any> = {};

    let argMatch: RegExpExecArray | null;
    while ((argMatch = argRegex.exec(argsStr)) !== null) {
      const key = argMatch[1] ?? "";
      if (!key) continue;
      if (argMatch[2] !== undefined) {
        // <escape>string_value<escape>
        args[key] = argMatch[2];
      } else if (argMatch[3] !== undefined) {
        // Array value like [<escape>chicken<escape>]
        const arrayContent = argMatch[3];
        const items: any[] = [];
        const itemRegex = /<escape>(.*?)<escape>|([^,\[\]]+)/g;
        let itemMatch: RegExpExecArray | null;
        while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
          const val = itemMatch[1] ?? itemMatch[2] ?? "";
          if (val.trim()) items.push(castValue(val));
        }
        args[key] = items;
      } else if (argMatch[4] !== undefined && argMatch[4].trim()) {
        // Bare value (number, bool)
        args[key] = castValue(argMatch[4]);
      }
    }

    // Only accept calls to known tools
    if (VALID_TOOL_NAMES.has(name)) {
      calls.push({ name, arguments: args });
      break; // Only take the first valid call to prevent hallucination
    } else {
      console.warn(`[FunctionGemma] Parsed unknown tool name: "${name}", skipping`);
    }
  }

  return calls;
}

// ============================================================================
// TOOL EXECUTOR INTERFACE
// ============================================================================

export interface ToolExecutor {
  addItem(params: any): Promise<any>;
  removeItem(params: any): Promise<any>;
  getInventory(params?: any): Promise<any>;
  getExpiringItems(params?: any): Promise<any>;
  setExpiryAlert(params: any): Promise<any>;
  addToGroceryList(params: any): Promise<any>;
  getGroceryList(params?: any): Promise<any>;
  findRecipes(params: any): Promise<any>;
  suggestMeals(params: any): Promise<any>;
  scanBarcode(params: any): Promise<any>;
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

export const MODEL_CONFIG: ModelConfig = {
  fileName: "functiongemma-270m-it-Q4_K_M.gguf",
  url: "https://huggingface.co/unsloth/functiongemma-270m-it-GGUF/resolve/main/functiongemma-270m-it-Q4_K_M.gguf",
  size: 250 * 1024 * 1024, // ~250MB
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * Main service class for Function Gemma integration
 */
export class FunctionGemmaService {
  private context: any = null;
  private toolExecutor: ToolExecutor | null = null;
  private modelPath: string;
  private isInitialized: boolean = false;

  constructor(toolExecutor?: ToolExecutor, customModelPath?: string) {
    this.modelPath = customModelPath || new File(Paths.document, MODEL_CONFIG.fileName).uri;
    if (toolExecutor) {
      this.toolExecutor = toolExecutor;
    }
  }

  /**
   * Set the tool executor (must be called before tool calling)
   */
  setToolExecutor(executor: ToolExecutor): void {
    this.toolExecutor = executor;
  }

  /**
   * Initialize the Function Gemma model
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if model exists
      const modelFile = new File(this.modelPath);
      console.log("[FunctionGemma] initialize: checking model file:", {
        path: this.modelPath,
        exists: modelFile.exists,
      });
      if (!modelFile.exists) {
        console.error("[FunctionGemma] Model file not found:", this.modelPath);
        return false;
      }

      // Release any existing context
      if (this.context) {
        console.log("[FunctionGemma] initialize: releasing existing context");
        await releaseAllLlama();
      }

      // Initialize Function Gemma context
      console.log("[FunctionGemma] initialize: calling initLlama...");
      const initStart = Date.now();
      const ctx = await initLlama({
        model: this.modelPath,
        use_mlock: true,
        n_ctx: 4096, // Context window size
        n_gpu_layers: 1, // Offload some layers to GPU if available
      });

      if (!ctx) {
        console.error("[FunctionGemma] initLlama returned null/undefined");
        this.isInitialized = false;
        return false;
      }

      this.context = ctx;
      console.log("[FunctionGemma] Model initialized successfully", {
        elapsedMs: Date.now() - initStart,
        hasToolExecutor: !!this.toolExecutor,
      });
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("[FunctionGemma] Failed to initialize:", error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Check if the model is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.context !== null;
  }

  /**
   * Process a user message and generate response.
   *
   * FunctionGemma uses a custom output format for tool calls:
   *   <start_function_call>call:func_name{args}<end_function_call>
   *
   * llama.rn's built-in tool_calls parsing does not understand this format,
   * so we parse the raw text ourselves and use stop tokens to prevent
   * the model from hallucinating multi-turn conversations.
   */
  async processMessage(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<{ text: string; tool_calls?: ToolCall[] }> {
    console.log("[FunctionGemma] processMessage called:", {
      userMessage,
      historyLength: conversationHistory.length,
      hasContext: !!this.context,
      isInitialized: this.isInitialized,
    });

    if (!this.context) {
      throw new Error("Function Gemma not initialized. Call initialize() first.");
    }

    // FunctionGemma requires this specific developer prompt to activate function calling
    const messages = [
      {
        role: "system",
        content: "You are a model that can do function calling with the following functions",
      },
      ...conversationHistory,
      {
        role: "user",
        content: userMessage,
      },
    ];

    console.log(
      "[FunctionGemma] Starting first completion with",
      messages.length,
      "messages and",
      FRIDGIT_TOOLS.length,
      "tools"
    );
    const completionStart = Date.now();

    // Generate completion with tool definitions and stop tokens.
    // Stop at <end_function_call> to prevent hallucinated multi-turn output.
    const result: CompletionResult = await this.context.completion({
      messages,
      n_predict: 256,
      tools: FRIDGIT_TOOLS,
      tool_choice: "auto",
      temperature: 0.7,
      top_p: 0.95,
      top_k: 64,
      stop: ["<end_function_call>", "<end_of_turn>"],
    });

    console.log("[FunctionGemma] First completion returned:", {
      textLength: result.text?.length ?? 0,
      textPreview: result.text?.slice(0, 300),
      hasToolCalls: !!result.tool_calls,
      toolCallCount: result.tool_calls?.length ?? 0,
      timings: result.timings,
      elapsedMs: Date.now() - completionStart,
    });

    // Determine tool calls: prefer llama.rn's parsed result, fall back to our own parser
    let toolCalls: ToolCall[] | undefined = result.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      // The stop token trims <end_function_call> from result.text,
      // so re-append it for parsing
      const textToParse = result.text.includes("<end_function_call>")
        ? result.text
        : result.text + "<end_function_call>";

      console.log("[FunctionGemma] Attempting manual parse of raw text...");
      const parsedCalls = parseFunctionCalls(textToParse);

      console.log("[FunctionGemma] Manual parse result:", {
        parsedCount: parsedCalls.length,
        parsedCalls,
      });

      if (parsedCalls.length > 0) {
        toolCalls = parsedCalls.map((call, i) => ({
          id: `call_${Date.now()}_${i}`,
          type: "function" as const,
          function: {
            name: call.name,
            arguments: call.arguments,
          },
        }));
      }
    }

    // Execute tool calls if we found any (from llama.rn or our parser)
    if (toolCalls && toolCalls.length > 0) {
      console.log("[FunctionGemma] Executing", toolCalls.length, "tool calls...");
      const toolExecStart = Date.now();
      const toolResults = await this.executeToolCalls(toolCalls);
      console.log("[FunctionGemma] Tool execution complete:", {
        results: toolResults,
        elapsedMs: Date.now() - toolExecStart,
      });

      // Try to get a natural language response from the model via a second completion.
      // FunctionGemma's chat template + llama.rn can be fragile here, so we
      // fall back to formatting the tool result directly if it fails.
      let finalText: string;
      try {
        // Use simple string content for the tool response to avoid llama.rn format errors
        const messagesWithTools = [
          ...messages,
          {
            role: "assistant",
            content: result.text,
          },
          ...toolResults.map((tr) => ({
            role: "tool",
            tool_call_id: tr.id,
            content: JSON.stringify(tr.result),
          })),
        ];

        console.log("[FunctionGemma] Starting final completion with tool results...");
        const finalStart = Date.now();

        const finalResult: CompletionResult = await this.context.completion({
          messages: messagesWithTools,
          n_predict: 256,
          temperature: 0.7,
          stop: ["<end_of_turn>", "<start_function_call>"],
        });

        console.log("[FunctionGemma] Final completion returned:", {
          textLength: finalResult.text?.length ?? 0,
          textPreview: finalResult.text?.slice(0, 300),
          timings: finalResult.timings,
          elapsedMs: Date.now() - finalStart,
        });

        finalText = finalResult.text;
      } catch (secondCompletionError) {
        console.warn(
          "[FunctionGemma] Second completion failed, using formatted tool result:",
          secondCompletionError
        );
        // Fall back to a formatted response from the tool results
        finalText = this.formatToolResultsAsText(toolCalls, toolResults);
      }

      return {
        text: finalText,
        tool_calls: toolCalls,
      };
    }

    console.log("[FunctionGemma] No tool calls found, returning text response");
    return {
      text: result.text,
    };
  }

  /**
   * Execute tool calls using the registered tool executor
   */
  private async executeToolCalls(
    toolCalls: ToolCall[]
  ): Promise<Array<{ id: string; result: any }>> {
    const results: Array<{ id: string; result: any }> = [];

    if (!this.toolExecutor) {
      console.warn("[FunctionGemma] No tool executor set, returning mock results");
      for (const toolCall of toolCalls) {
        results.push({
          id: toolCall.id,
          result: { message: "Tool executor not set", call: toolCall },
        });
      }
      return results;
    }

    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;
      console.log(`[FunctionGemma] Executing tool: ${name}`, { id: toolCall.id, args });

      try {
        let result;
        const toolStart = Date.now();

        // Map function names to tool executor methods
        switch (name) {
          case "add_item":
            result = await this.toolExecutor.addItem(args);
            break;
          case "remove_item":
            result = await this.toolExecutor.removeItem(args);
            break;
          case "get_inventory":
            result = await this.toolExecutor.getInventory(args);
            break;
          case "get_expiring_items":
            result = await this.toolExecutor.getExpiringItems(args);
            break;
          case "set_expiry_alert":
            result = await this.toolExecutor.setExpiryAlert(args);
            break;
          case "add_to_grocery_list":
            result = await this.toolExecutor.addToGroceryList(args);
            break;
          case "get_grocery_list":
            result = await this.toolExecutor.getGroceryList(args);
            break;
          case "find_recipes":
            result = await this.toolExecutor.findRecipes(args);
            break;
          case "suggest_meals":
            result = await this.toolExecutor.suggestMeals(args);
            break;
          case "scan_barcode":
            result = await this.toolExecutor.scanBarcode(args);
            break;
          default:
            console.warn(`[FunctionGemma] Unknown function: ${name}`);
            result = { error: `Unknown function: ${name}` };
        }

        console.log(`[FunctionGemma] Tool ${name} completed:`, {
          result,
          elapsedMs: Date.now() - toolStart,
        });

        results.push({
          id: toolCall.id,
          result,
        });
      } catch (error) {
        console.error(`[FunctionGemma] Tool ${name} threw error:`, error);
        results.push({
          id: toolCall.id,
          result: { error: String(error) },
        });
      }
    }

    return results;
  }

  /**
   * Format tool execution results into a readable text response.
   * Used as fallback when the second model completion fails.
   */
  private formatToolResultsAsText(
    toolCalls: ToolCall[],
    toolResults: Array<{ id: string; result: any }>
  ): string {
    const parts: string[] = [];
    for (const tr of toolResults) {
      const call = toolCalls.find((tc) => tc.id === tr.id);
      const funcName = call?.function.name ?? "unknown";
      const res = tr.result;

      if (res?.success && res?.message) {
        parts.push(res.message);
      } else if (res?.success) {
        parts.push(`${funcName} completed successfully.`);
      } else if (res?.error) {
        parts.push(`${funcName} failed: ${res.error}`);
      } else {
        parts.push(`${funcName}: ${JSON.stringify(res)}`);
      }
    }
    return parts.join("\n");
  }

  /**
   * Clean up and release resources
   */
  async cleanup(): Promise<void> {
    if (this.context) {
      await releaseAllLlama();
      this.context = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get inference statistics from a completion result
   */
  isInferenceStats(result: CompletionResult): string | null {
    if (result.timings) {
      const speed = result.timings.predicted_per_second.toFixed(1);
      return `🚀 ${speed} tokens/sec`;
    }
    return null;
  }
}

// ============================================================================
// MODEL DOWNLOAD UTILITY
// ============================================================================

/**
 * Download Function Gemma model if not present
 */
export async function downloadModelIfNeeded(
  onProgress?: (progress: number) => void
): Promise<string | null> {
  const destFile = new File(Paths.document, MODEL_CONFIG.fileName);

  // Check if model already exists
  if (destFile.exists) {
    console.log("[FunctionGemma] Model already exists");
    return destFile.uri;
  }

  console.log("[FunctionGemma] Downloading model...");

  try {
    // Download using the new File API
    const downloadedFile = await File.downloadFileAsync(MODEL_CONFIG.url, Paths.document);

    // Rename if the downloaded filename doesn't match expected name
    if (downloadedFile.uri !== destFile.uri) {
      downloadedFile.move(destFile);
    }

    console.log("[FunctionGemma] Model downloaded successfully");
    onProgress?.(100);
    return destFile.uri;
  } catch (error) {
    console.error("[FunctionGemma] Download failed:", error);
    return null;
  }
}

/**
 * Check if model file exists
 */
export async function checkModelExists(): Promise<boolean> {
  const destFile = new File(Paths.document, MODEL_CONFIG.fileName);
  return destFile.exists;
}
