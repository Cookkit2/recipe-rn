import { useMutation, useQuery } from "@tanstack/react-query";
import { GeminiAPI } from "~/utils/gemini-api";

const GEMINI_MUTATION_TIMEOUT_MS = 60_000;
const geminiApi = new GeminiAPI();

export interface GenerateContentParams {
  model?: string;
  body: string;
}

async function generateContentMutation({
  model = "gemini-2.0-flash",
  body,
}: GenerateContentParams): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_MUTATION_TIMEOUT_MS);
  try {
    return await geminiApi.generateContent(model, body, controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * TanStack Query mutation for Gemini generateContent.
 * Single timeout in the mutationFn; TanStack Query handles retries (no duplicate fetchWithTimeout).
 */
export function useGeminiGenerateContent() {
  return useMutation({
    mutationFn: generateContentMutation,
    mutationKey: ["gemini", "generateContent"],
  });
}

const GEMINI_LIST_MODELS_QUERY_KEY = ["gemini", "listModels"] as const;

/**
 * TanStack Query for listing Gemini models (e.g. settings or debug).
 * Passes signal so no internal timeout; query retry handles failures.
 */
export function useGeminiListModels(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: GEMINI_LIST_MODELS_QUERY_KEY,
    queryFn: ({ signal }) => geminiApi.listModels(signal),
    enabled: options?.enabled ?? false,
  });
}
