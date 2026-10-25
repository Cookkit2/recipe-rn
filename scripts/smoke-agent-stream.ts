/**
 * Node smoke test: real AI SDK `streamText` + tools against a local
 * OpenAI-compatible SSE server. This does not call Nebius and does not run
 * inside React Native. It checks that the installed SDK can stream a tool
 * call, execute a Cookkit tool, and stream the follow-up text.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { isStepCount, streamText } from "ai";
import { createCookingTools } from "../lib/agent/tools/definitions";
import type { CookingDataClient, PantryItem } from "../lib/agent/tools/planning";

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

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function createFakeData(): CookingDataClient & { added: PantryItem[] } {
  return {
    added: [],
    async listPantry() {
      return this.added;
    },
    async addIngredient(input) {
      const item: PantryItem = {
        id: "stock-1",
        name: input.name,
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        expiryDate: null,
        householdId: "house-1",
        addedByUserId: "user-1",
      };
      this.added.push(item);
      return { ok: true, item };
    },
    async removeIngredient() {
      return { ok: true, removed: [] };
    },
    async getDietProfile() {
      return { diet: null, allergens: [], macroTarget: null, source: "none" };
    },
    async listRecipes() {
      return { recipes: [], truncated: false };
    },
  };
}

async function main(): Promise<void> {
  const data = createFakeData();
  let requestCount = 0;
  const server = createServer(async (request, response) => {
    requestCount += 1;
    const body = JSON.parse(await readBody(request)) as {
      stream?: boolean;
      messages?: { role?: string; tool_calls?: unknown[] }[];
    };
    const hasToolResult = body.messages?.some((message) => message.role === "tool");
    console.log(
      `[agent-smoke] request ${requestCount} stream=${String(body.stream)} toolResult=${String(hasToolResult)} messages=${body.messages?.length ?? 0}`
    );
    if (!hasToolResult) {
      sse(
        response,
        [
          {
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            choices: [
              {
                index: 0,
                delta: {
                  role: "assistant",
                  tool_calls: [
                    {
                      index: 0,
                      id: "call_eggs",
                      type: "function",
                      function: {
                        name: "manage_ingredients",
                        arguments: JSON.stringify({
                          action: "add",
                          name: "eggs",
                          quantity: 6,
                          unit: "count",
                        }),
                      },
                    },
                  ],
                },
                finish_reason: null,
              },
            ],
          },
        ],
        "tool_calls"
      );
      return;
    }
    sse(
      response,
      [
        {
          id: "chatcmpl-2",
          object: "chat.completion.chunk",
          choices: [
            {
              index: 0,
              delta: { role: "assistant", content: "Added eggs to your pantry." },
              finish_reason: null,
            },
          ],
        },
      ],
      "stop"
    );
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Smoke server did not bind.");
  const baseURL = `http://127.0.0.1:${address.port}/v1`;
  console.log(`[agent-smoke] mock OpenAI-compatible server at ${baseURL}`);

  try {
    const provider = createOpenAICompatible({
      name: "nebius-mock",
      baseURL,
      apiKey: "test-key",
    });
    const result = streamText({
      model: provider.chatModel("mock-tool-model"),
      instructions: "Use tools.",
      prompt: "Add 6 eggs to my pantry.",
      tools: createCookingTools(data),
      stopWhen: isStepCount(4),
    });

    let text = "";
    const toolCalls: string[] = [];
    for await (const part of result.stream) {
      if (part.type === "text-delta") text += part.text;
      if (part.type === "tool-call") toolCalls.push(part.toolName);
      if (part.type === "error") {
        throw new Error(
          `Stream error: ${part.error instanceof Error ? part.error.message : String(part.error)}`
        );
      }
    }

    console.log(
      `[agent-smoke] toolCalls=${toolCalls.join(",") || "(none)"} text=${JSON.stringify(text)}`
    );
    console.log(`[agent-smoke] added=${JSON.stringify(data.added)}`);
    if (!toolCalls.includes("manage_ingredients")) {
      throw new Error("Expected streamText to emit a manage_ingredients tool call.");
    }
    if (data.added[0]?.name !== "eggs" || data.added[0]?.quantity !== 6) {
      throw new Error("The manage_ingredients tool did not add eggs.");
    }
    if (!text.includes("Added eggs")) {
      throw new Error(`Expected follow-up text, received: ${text}`);
    }
    if (requestCount < 2) {
      throw new Error(`Expected a tool round-trip, saw ${requestCount} request(s).`);
    }
    console.log("[agent-smoke] ok");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

main().catch((error: unknown) => {
  console.error("[agent-smoke] failed", error);
  process.exitCode = 1;
});
