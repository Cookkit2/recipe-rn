import { AIError, generateNebiusContent, validateAIRequest } from "./nebius.ts";
import { generateGeminiYouTubeContent } from "./gemini-youtube.ts";

const MAX_BODY_BYTES = 2_000_000;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface HandlerOptions {
  apiKey: string;
  geminiApiKey?: string;
  geminiModel?: string;
  authenticate: (token: string, signal: AbortSignal) => Promise<string | null>;
  consumeQuota: (userId: string, signal: AbortSignal) => Promise<boolean>;
  fetcher?: typeof fetch;
}

async function readRequest(request: Request, signal: AbortSignal): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new AIError("Missing request body.", 400);
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new AIError("Ingredient image or recipe text is too large.", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError("Invalid JSON request.", 400);
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

export function createAIHandler({
  apiKey,
  geminiApiKey,
  geminiModel,
  authenticate,
  consumeQuota,
  fetcher,
}: HandlerOptions) {
  return async (request: Request): Promise<Response> => {
    const json = (body: unknown, status = 200) =>
      Response.json(body, { status, headers: { ...cors, "Cache-Control": "no-store" } });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return json({ error: "Authentication required." }, 401);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(75_000)]);
    try {
      const userId = await authenticate(token, signal);
      if (!userId) return json({ error: "Authentication required." }, 401);
      if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
        return json({ error: "Request is too large." }, 413);
      }
      const input = await readRequest(request, signal);
      validateAIRequest(input);
      if (!(await consumeQuota(userId, signal))) {
        return json({ error: "AI request limit reached. Please try again later." }, 429);
      }
      if (input.youtubeVideoUrl) {
        return json(
          await generateGeminiYouTubeContent(input, {
            apiKey: geminiApiKey,
            model: geminiModel,
            fetcher,
            signal,
          })
        );
      }
      return json(await generateNebiusContent(input, { apiKey, fetcher, signal }));
    } catch (error) {
      if (signal.aborted) return json({ error: "AI request timed out. Please try again." }, 504);
      if (error instanceof AIError) return json({ error: error.message }, error.status);
      return json({ error: "The AI service is unavailable. Please try again later." }, 502);
    }
  };
}
