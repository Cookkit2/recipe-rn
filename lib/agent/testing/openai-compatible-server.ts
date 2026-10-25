/**
 * In-process OpenAI-compatible chat completions server.
 *
 * Speaks the SSE shape the installed `@ai-sdk/openai-compatible` client parses
 * (`POST {baseURL}/chat/completions`). Scenarios script each turn. This is the
 * same protocol fixture `scripts/smoke-agent-stream.ts` uses.
 *
 * Node's `fetch` talks to this server. It does not exercise Hermes or `expo/fetch`.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export interface OpenAIRequestMessage {
  role?: string;
  content?: unknown;
  tool_calls?: unknown[];
}

export interface OpenAIChatRequest {
  stream?: boolean;
  model?: string;
  messages?: OpenAIRequestMessage[];
}

export interface ScriptedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** One model turn: either tool calls or incremental text deltas. */
export interface ScriptedTurn {
  toolCalls?: readonly ScriptedToolCall[];
  textDeltas?: readonly string[];
}

export interface OpenAIScriptContext {
  requestIndex: number;
  body: OpenAIChatRequest;
}

export type OpenAITurnScript = (context: OpenAIScriptContext) => ScriptedTurn;

export interface RecordedChatRequest {
  path: string;
  body: OpenAIChatRequest;
}

export interface OpenAICompatibleServer {
  /** Base URL including the `/v1` prefix, with no trailing slash. */
  baseURL: string;
  requests: RecordedChatRequest[];
  close(): Promise<void>;
}

function sse(response: ServerResponse, chunks: unknown[], finishReason: string): void {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  for (const chunk of chunks) {
    response.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  response.write(
    `data: ${JSON.stringify({
      id: "chatcmpl-finish",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
    })}\n\n`
  );
  response.write("data: [DONE]\n\n");
  response.end();
}

function completionChunk(id: string, delta: Record<string, unknown>): unknown {
  return {
    id,
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta, finish_reason: null }],
  };
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

export async function startOpenAICompatibleServer(options: {
  script: OpenAITurnScript;
  onRequest?: (request: RecordedChatRequest) => void;
  /** Fixed port for Detox. Jest leaves this unset and uses an ephemeral port. */
  port?: number;
}): Promise<OpenAICompatibleServer> {
  const requests: RecordedChatRequest[] = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method !== "POST" || !url.pathname.endsWith("/chat/completions")) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ error: { message: `Unexpected ${request.method} ${url.pathname}` } })
      );
      return;
    }
    let body: OpenAIChatRequest = {};
    try {
      body = JSON.parse(await readBody(request)) as OpenAIChatRequest;
    } catch {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: { message: "Invalid JSON" } }));
      return;
    }
    const recorded = { path: url.pathname, body };
    requests.push(recorded);
    options.onRequest?.(recorded);
    const turn = options.script({ requestIndex: requests.length - 1, body });
    const toolCalls = turn.toolCalls ?? [];
    if (toolCalls.length > 0) {
      sse(
        response,
        [
          completionChunk("chatcmpl-tool", {
            role: "assistant",
            tool_calls: toolCalls.map((call, index) => ({
              index,
              id: call.id,
              type: "function",
              function: {
                name: call.name,
                arguments: JSON.stringify(call.arguments),
              },
            })),
          }),
        ],
        "tool_calls"
      );
      return;
    }
    const deltas = turn.textDeltas ?? [];
    sse(
      response,
      deltas.map((text, index) =>
        completionChunk(`chatcmpl-text-${index}`, { role: "assistant", content: text })
      ),
      "stop"
    );
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("OpenAI-compatible fixture did not bind.");
  }

  return {
    baseURL: `http://127.0.0.1:${address.port}/v1`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
