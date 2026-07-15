import Constants from "expo-constants";
import { log } from "~/utils/logger";

const GEMINI_REQUEST_TIMEOUT_MS = 60_000;

const getApiKey = () =>
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || Constants.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY;

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

// Gemini 2.5 Flash Lite pricing (per 1M tokens)
const PRICING = {
  prompt: 0.1, // $0.10 per 1M tokens
  candidates: 0.4, // $0.40 per 1M tokens
} as const;

interface TokenUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  estimatedCost: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface ModelListResponse {
  models: Array<{
    name: string;
    version: string;
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
    temperature: number;
    topP: number;
    topK: number;
  }>;
}

/**
 * Calculate estimated cost from token usage
 */
export const calculateTokenCost = (usage: {
  promptTokenCount: number;
  candidatesTokenCount: number;
}): TokenUsage => {
  const promptCost = (usage.promptTokenCount / 1_000_000) * PRICING.prompt;
  const candidatesCost = (usage.candidatesTokenCount / 1_000_000) * PRICING.candidates;
  const totalCost = promptCost + candidatesCost;
  const totalTokenCount = usage.promptTokenCount + usage.candidatesTokenCount;

  return {
    ...usage,
    totalTokenCount,
    estimatedCost: totalCost,
  };
};

export class GeminiAPI {
  /**
   * Generate content using Gemini API.
   * Pass signal when using from TanStack Query so retry is the only retry layer; no internal timeout.
   * When signal is omitted (imperative callers), a 60s timeout is applied so the request does not hang.
   */
  async generateContent(
    model: string = DEFAULT_GEMINI_MODEL,
    body: string,
    signal?: AbortSignal
  ): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Gemini API key is not set");
    }

    // Transient, server-side errors worth retrying (Google overload, rate limit).
    const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
    const MAX_ATTEMPTS = 3;
    let lastError = "Gemini API request failed. Please try again later.";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = signal ? undefined : new AbortController();
      const timeoutId =
        controller === undefined
          ? undefined
          : setTimeout(() => controller!.abort(), GEMINI_REQUEST_TIMEOUT_MS);
      const effectiveSignal = signal ?? controller!.signal;

      try {
        const response = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": apiKey as string,
          },
          body: body,
          signal: effectiveSignal,
        });

        if (response.ok) {
          const data: GeminiResponse = await response.json();

          if (!data.candidates || data.candidates.length === 0) {
            throw new Error("No response generated from Gemini API");
          }

          const candidate = data.candidates[0];
          if (!candidate?.content?.parts?.[0]?.text) {
            throw new Error("Invalid response format from Gemini API");
          }

          if (data.usageMetadata) {
            const usage = calculateTokenCost({
              promptTokenCount: data.usageMetadata.promptTokenCount,
              candidatesTokenCount: data.usageMetadata.candidatesTokenCount,
            });
            log.info(
              `Gemini API Token Usage - ` +
                `Prompt: ${usage.promptTokenCount}, ` +
                `Candidates: ${usage.candidatesTokenCount}, ` +
                `Total: ${usage.totalTokenCount}, ` +
                `Est. Cost: $${usage.estimatedCost.toFixed(6)}`
            );
          }

          return candidate.content.parts[0].text;
        }

        // Non-OK: log, drain the body, and retry if the error is transient.
        lastError = `Gemini API request failed (${response.status} ${response.statusText}). Please try again later.`;
        log.error(`Gemini API error: ${response.status} ${response.statusText}`);
        await response.text().catch(() => {});

        if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
          // Exponential backoff: ~1s, then ~2s.
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error(lastError);
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      }
    }

    throw new Error(lastError);
  }

  /**
   * List available models.
   * Pass signal when using from TanStack Query; otherwise a 60s timeout is applied.
   */
  async listModels(signal?: AbortSignal): Promise<ModelListResponse> {
    const apiKey = getApiKey();
    const controller = signal ? undefined : new AbortController();
    const timeoutId =
      controller === undefined
        ? undefined
        : setTimeout(() => controller!.abort(), GEMINI_REQUEST_TIMEOUT_MS);
    const effectiveSignal = signal ?? controller!.signal;

    try {
      const response = await fetch(`${BASE_URL}/models`, {
        method: "GET",
        headers: {
          "X-goog-api-key": apiKey as string,
        },
        signal: effectiveSignal,
      });
      if (timeoutId !== undefined) clearTimeout(timeoutId);

      if (!response.ok) {
        log.error(`Gemini API error: ${response.status} ${response.statusText}`);
        throw new Error("Gemini API request failed. Please try again later.");
      }

      return await response.json();
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }
}

// Simple helper function for quick content generation
export const generateGeminiContent = async (body: string): Promise<string> => {
  const client = new GeminiAPI();
  return await client.generateContent(DEFAULT_GEMINI_MODEL, body);
};

// Export pricing info for reference
export { PRICING };
export type { TokenUsage };
