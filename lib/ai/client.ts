import type { AIRequest, AIResponse } from "./types";
import { getAIProxyConnection } from "./proxy-connection";
import { log } from "~/utils/logger";

/** Calls our authenticated proxy; the mobile bundle never contains a provider key. */
export async function generateAIContent(request: AIRequest, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 70_000);
  try {
    controller.signal.throwIfAborted();
    const { url, headers } = await getAIProxyConnection();
    controller.signal.throwIfAborted();
    const response = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Do not display gateway/provider bodies, which can contain submitted text.
      log.warn(`[AI] Proxy request failed (${response.status})`);
      if (response.status === 429)
        throw new Error("AI request limit reached. Please try again later.");
      if (response.status === 401)
        throw new Error("Couldn't connect to the AI service. Please try again.");
      throw new Error("Couldn't process this with AI. Please try again.");
    }
    const result: AIResponse = await response.json();
    if (request.images && result.inputImageCount !== request.images.length) {
      throw new Error("Video analysis isn't available yet. Paste the full recipe caption.");
    }
    if (typeof result.content !== "string" || !result.content.trim()) {
      throw new Error("The AI service returned an empty answer. Please try again.");
    }
    if (result.usage) log.debug("[AI] Nebius usage", { model: result.model, ...result.usage });
    return result.content;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
