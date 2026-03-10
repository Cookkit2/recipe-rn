/**
 * useFunctionGemma - React hook for Function Gemma AI assistant
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { FunctionGemmaService } from "./FunctionGemmaService";
import type { CompletionResult, ToolCall } from "./FunctionGemmaService";
import { CookkitToolExecutor as CookkitToolExecutor } from "./CookkitToolExecutor";

export type Message = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  timestamp?: number;
};

export interface UseFunctionGemmaOptions {
  autoDownload?: boolean;
  autoInitialize?: boolean;
}

export interface UseFunctionGemmaReturn {
  // State
  messages: Message[];
  input: string;
  isGenerating: boolean;
  isModelLoaded: boolean;
  isLoadingModel: boolean;
  downloadProgress: number;
  inferenceStats: string;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  setInput: (text: string) => void;
  clearMessages: () => void;
  initializeModel: () => Promise<boolean>;
  downloadModel: (onProgress?: (progress: number) => void) => Promise<string | null>;
}

/**
 * React hook for Function Gemma AI assistant
 */
export function useFunctionGemma(options: UseFunctionGemmaOptions = {}): UseFunctionGemmaReturn {
  const { autoDownload = true, autoInitialize = true } = options;

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [inferenceStats, setInferenceStats] = useState("");

  // Refs
  const serviceRef = useRef<FunctionGemmaService | null>(null);
  const toolExecutorRef = useRef<CookkitToolExecutor | null>(null);

  // Initialize tool executor
  useEffect(() => {
    toolExecutorRef.current = new CookkitToolExecutor();
  }, []);

  // Download and initialize model on mount
  useEffect(() => {
    if (autoDownload && !isModelLoaded && !isLoadingModel) {
      setupModel();
    }

    return () => {
      // Cleanup on unmount
      serviceRef.current?.cleanup();
    };
  }, []);

  /**
   * Setup model: download if needed, then initialize
   */
  const setupModel = useCallback(async () => {
    setIsLoadingModel(true);
    try {
      // Download model if needed
      const { downloadModelIfNeeded } = await import("./FunctionGemmaService");
      const modelPath = await downloadModelIfNeeded((progress) => {
        setDownloadProgress(progress);
      });

      if (!modelPath) {
        console.error("[useFunctionGemma] Failed to download model");
        setIsLoadingModel(false);
        return;
      }

      // Initialize service
      const service = new FunctionGemmaService(toolExecutorRef.current!, modelPath);
      const initialized = await service.initialize();

      if (initialized) {
        serviceRef.current = service;
        setIsModelLoaded(true);
        setMessages([
          {
            role: "assistant",
            content:
              "👋 Hi! I'm your Cookkit assistant. I can help you:\n\n• Add/remove items from your pantry\n• Check what's expiring soon\n• Create grocery lists\n• Find recipes with what you have\n\nWhat would you like to do?",
            timestamp: Date.now(),
          },
        ]);
      } else {
        console.error("[useFunctionGemma] Failed to initialize model");
      }
    } catch (error) {
      console.error("[useFunctionGemma] Setup error:", error);
    } finally {
      setIsLoadingModel(false);
    }
  }, [isModelLoaded, isLoadingModel]);

  /**
   * Initialize model (manual trigger)
   */
  const initializeModel = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current) {
      await setupModel();
    }
    return isModelLoaded;
  }, [setupModel, isModelLoaded]);

  /**
   * Download model (manual trigger)
   */
  const downloadModel = useCallback(
    async (onProgress?: (progress: number) => void): Promise<string | null> => {
      const { downloadModelIfNeeded } = await import("./FunctionGemmaService");
      return downloadModelIfNeeded(onProgress);
    },
    []
  );

  /**
   * Send a message and get AI response
   */
  const sendMessage = useCallback(
    async (message: string) => {
      console.log("[useFunctionGemma] sendMessage called:", {
        message,
        hasService: !!serviceRef.current,
        isModelLoaded,
        isGenerating,
      });

      if (!message.trim()) {
        console.warn("[useFunctionGemma] Empty message, aborting");
        return;
      }
      if (isGenerating) {
        console.warn("[useFunctionGemma] Already generating, aborting");
        return;
      }
      if (!serviceRef.current || !serviceRef.current.isReady()) {
        console.warn("[useFunctionGemma] Service not ready, attempting auto-initialize...");
        await setupModel();
        if (!serviceRef.current || !serviceRef.current.isReady()) {
          console.error("[useFunctionGemma] Auto-initialize failed");
          setMessages((prev) => [
            ...prev,
            { role: "user", content: message.trim(), timestamp: Date.now() },
            {
              role: "assistant",
              content:
                'AI model is still loading. Please wait for the "AI Ready" indicator and try again.',
              timestamp: Date.now(),
            },
          ]);
          return;
        }
      }

      const userMessage = message.trim();
      setInput("");
      setIsGenerating(true);
      setInferenceStats("");

      // Add user message
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userMessage, timestamp: Date.now() },
      ]);

      try {
        // Get conversation history (excluding system messages)
        const conversationHistory = messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content }));

        console.log(
          "[useFunctionGemma] Calling processMessage with history length:",
          conversationHistory.length
        );
        const startTime = Date.now();

        // Process with Function Gemma
        const result = await serviceRef.current.processMessage(userMessage, conversationHistory);

        console.log("[useFunctionGemma] processMessage returned:", {
          textLength: result.text?.length ?? 0,
          textPreview: result.text?.slice(0, 200),
          hasToolCalls: !!result.tool_calls,
          toolCallCount: result.tool_calls?.length ?? 0,
          elapsedMs: Date.now() - startTime,
        });

        // Add assistant response
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.text,
            tool_calls: result.tool_calls,
            timestamp: Date.now(),
          },
        ]);

        // Show inference stats if available
        const stats = serviceRef.current.isInferenceStats({} as CompletionResult);
        if (stats) {
          setInferenceStats(stats);
        }
      } catch (error) {
        console.error("[useFunctionGemma] Send message error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        console.log("[useFunctionGemma] sendMessage complete, setting isGenerating=false");
        setIsGenerating(false);
      }
    },
    [messages, isGenerating, isModelLoaded, serviceRef, setupModel]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    // State
    messages,
    input,
    isGenerating,
    isModelLoaded,
    isLoadingModel,
    downloadProgress,
    inferenceStats,

    // Actions
    sendMessage,
    setInput,
    clearMessages,
    initializeModel,
    downloadModel,
  };
}
