/**
 * Node smoke test: real AI SDK `streamText` + tools against a local
 * OpenAI-compatible SSE server. This does not call Nebius and does not run
 * inside React Native. It checks that the installed SDK can stream a tool
 * call, execute a Cookkit tool, and stream the follow-up text.
 *
 * The HTTP fixture lives in `lib/agent/testing/openai-compatible-server.ts`
 * and is shared with the Jest Tier A integration tests.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { isStepCount, streamText } from "ai";
import { startOpenAICompatibleServer } from "../lib/agent/testing/openai-compatible-server";
import { createCookingTools } from "../lib/agent/tools/definitions";
import type { CookingDataClient, PantryItem } from "../lib/agent/tools/planning";

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
  const server = await startOpenAICompatibleServer({
    onRequest: (recorded) => {
      requestCount += 1;
      const hasToolResult = recorded.body.messages?.some((message) => message.role === "tool");
      console.log(
        `[agent-smoke] request ${requestCount} stream=${String(recorded.body.stream)} toolResult=${String(hasToolResult)} messages=${recorded.body.messages?.length ?? 0}`
      );
    },
    script: ({ body }) => {
      const hasToolResult = body.messages?.some((message) => message.role === "tool");
      if (!hasToolResult) {
        return {
          toolCalls: [
            {
              id: "call_eggs",
              name: "manage_ingredients",
              arguments: { action: "add", name: "eggs", quantity: 6, unit: "count" },
            },
          ],
        };
      }
      return { textDeltas: ["Added eggs to your pantry."] };
    },
  });
  console.log(`[agent-smoke] mock OpenAI-compatible server at ${server.baseURL}`);

  try {
    const provider = createOpenAICompatible({
      name: "nebius-mock",
      baseURL: server.baseURL,
      apiKey: "test-key",
    });
    const result = streamText({
      model: provider.chatModel("mock-tool-model"),
      instructions: "Use tools.",
      prompt: "Add 6 eggs to my pantry.",
      tools: createCookingTools(data, { intent: "add_ingredient" }),
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
    if (server.requests.length < 2) {
      throw new Error(`Expected a tool round-trip, saw ${server.requests.length} request(s).`);
    }
    console.log("[agent-smoke] ok");
  } finally {
    await server.close();
  }
}

main().catch((error: unknown) => {
  console.error("[agent-smoke] failed", error);
  process.exitCode = 1;
});
