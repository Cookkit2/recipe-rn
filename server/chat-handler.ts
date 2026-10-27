import { resolveAssistantProxyInstructions } from "../lib/agent/instructions.ts";

export const DEFAULT_CHAT_MODEL = "nvidia/Nemotron-3_5-Lightning";
const ENDPOINT = "https://api.tokenfactory.nebius.com/v1/chat/completions";
const MAX_BODY_BYTES = 256_000;
const TOOLS = new Set([
  "manage_ingredients",
  "get_pantry",
  "analyze_diet",
  "suggest_meal_plan",
  "suggest_recipes",
]);
const UNAVAILABLE = "The assistant is temporarily unavailable. Please try again later.";
const TIMEOUT = "The assistant took too long to respond. Please try again.";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
interface Options {
  apiKey: string;
  model?: string;
  authenticate: (token: string, signal: AbortSignal) => Promise<string | null>;
  consumeQuota: (userId: string, signal: AbortSignal) => Promise<boolean>;
  fetcher?: typeof fetch;
}
class RequestError extends Error {
  constructor(readonly status: number) {
    super("Invalid assistant request");
  }
}

async function readBody(request: Request, signal: AbortSignal) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw new RequestError(413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400);
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder();
  let text = "",
    size = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestError(413);
      }
      text += decoder.decode(value, { stream: true });
    }
    const body = JSON.parse(text + decoder.decode());
    if (
      !body ||
      !Array.isArray(body.messages) ||
      !body.messages.length ||
      body.messages.length > 80 ||
      body.stream !== true
    )
      throw new RequestError(400);
    const messages = body.messages.filter(
      (message: { role?: string }) => !["system", "developer"].includes(message?.role ?? "")
    );
    if (
      !messages.length ||
      messages.some(
        (message: { role?: string; content?: unknown }) =>
          !message ||
          !["user", "assistant", "tool"].includes(message.role ?? "") ||
          (typeof message.content !== "string" &&
            message.content !== null &&
            !Array.isArray(message.content))
      )
    )
      throw new RequestError(400);
    if (
      body.tools !== undefined &&
      (!Array.isArray(body.tools) ||
        body.tools.length > TOOLS.size ||
        body.tools.some(
          (tool: { type?: string; function?: { name?: string } }) =>
            tool?.type !== "function" || !TOOLS.has(tool.function?.name ?? "")
        ))
    )
      throw new RequestError(400);
    const choice = body.tool_choice;
    if (
      choice !== undefined &&
      !["auto", "none", "required"].includes(choice) &&
      !(choice?.type === "function" && TOOLS.has(choice.function?.name))
    )
      throw new RequestError(400);
    return {
      model: "",
      messages: [
        { role: "system", content: resolveAssistantProxyInstructions(body.messages) },
        ...messages,
      ],
      ...(body.tools ? { tools: body.tools } : {}),
      ...(choice !== undefined ? { tool_choice: choice } : {}),
      ...(typeof body.parallel_tool_calls === "boolean"
        ? { parallel_tool_calls: body.parallel_tool_calls }
        : {}),
      stream: true,
      max_tokens: 4096,
      temperature: 0,
      chat_template_kwargs: { enable_thinking: false },
    };
  } catch (error) {
    if (error instanceof RequestError || signal.aborted) throw error;
    throw new RequestError(400);
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

/** Relay incremental SSE while replacing upstream errors with app-owned copy. */
function safeStream(body: ReadableStream<Uint8Array>, signal: AbortSignal) {
  const reader = body.getReader();
  const encoder = new TextEncoder();
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const cancel = () => {
        void reader.cancel().catch(() => {});
      };
      signal.addEventListener("abort", cancel, { once: true });
      const decoder = new TextDecoder();
      let pending = "",
        bytes = 0;
      const send = (data: unknown) =>
        controller.enqueue(
          encoder.encode(`data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`)
        );
      try {
        while (true) {
          signal.throwIfAborted();
          const { value, done } = await reader.read();
          signal.throwIfAborted();
          if (done) {
            if (pending.trim()) throw new Error("Incomplete stream");
            break;
          }
          bytes += value.byteLength;
          if (bytes > 2_000_000) throw new Error("Stream too large");
          pending += decoder.decode(value, { stream: true });
          const records = pending.split(/\r?\n\r?\n/);
          pending = records.pop()!;
          if (pending.length > 64_000) throw new Error("Stream event too large");
          for (const record of records) {
            if (record.length > 64_000) throw new Error("Stream event too large");
            const data = record
              .split(/\r?\n/)
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart())
              .join("\n");
            if (!data) continue;
            if (data === "[DONE]") {
              send(data);
              return;
            }
            const part = JSON.parse(data);
            if (part.error || part.object === "error") throw new Error("Provider stream failed");
            send(part);
          }
        }
      } catch {
        if (!cancelled && !signal.aborted)
          send({ error: { message: UNAVAILABLE, type: "server_error" } });
        else if (!cancelled) send({ error: { message: TIMEOUT, type: "server_error" } });
      } finally {
        signal.removeEventListener("abort", cancel);
        await reader.cancel().catch(() => {});
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      return reader.cancel();
    },
  });
}

/** User-authenticated streaming gateway. Pantry tools continue executing on-device. */
export function createChatHandler({
  apiKey,
  model = DEFAULT_CHAT_MODEL,
  authenticate,
  consumeQuota,
  fetcher = fetch,
}: Options) {
  return async (request: Request): Promise<Response> => {
    const json = (status: number, message = UNAVAILABLE) =>
      Response.json(
        { error: { message, type: "server_error" } },
        { status, headers: { ...cors, "Cache-Control": "no-store" } }
      );
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json(405);
    if (!new URL(request.url).pathname.endsWith("/v1/chat/completions")) return json(404);
    const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return json(401);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(40_000)]);
    try {
      if (!apiKey) return json(503);
      const userId = await authenticate(token, signal);
      if (!userId) return json(401);
      const body = await readBody(request, signal);
      if (!(await consumeQuota(userId, signal)))
        return json(429, "The assistant is busy. Please try again in a moment.");
      // Lightning's forced-tool mode can repeat tool markup until the output
      // limit, which prevents the client SDK from executing even a valid call.
      // Keep the supplied tool schemas and on-device capability checks; only
      // let this model select normally from the tools already offered to it.
      const toolChoice =
        model === DEFAULT_CHAT_MODEL &&
        (body.tool_choice === "required" || typeof body.tool_choice === "object")
          ? "auto"
          : body.tool_choice;
      const response = await fetcher(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, model, tool_choice: toolChoice }),
        signal,
      });
      if (!response.ok || !response.body) {
        await response.body?.cancel().catch(() => {});
        return json(response.status === 429 ? 429 : 502);
      }
      return new Response(safeStream(response.body, signal), {
        headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
      });
    } catch (error) {
      return json(
        signal.aborted ? 504 : error instanceof RequestError ? error.status : 502,
        signal.aborted ? TIMEOUT : UNAVAILABLE
      );
    }
  };
}
