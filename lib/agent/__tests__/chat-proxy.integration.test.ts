/** Actual agent + AI SDK + proxy, with a scripted provider and an in-memory pantry. */
import { NebiusCookingAgent } from "../NebiusCookingAgent";
import { createChatHandler } from "../../../server/chat-handler";
import { EMPTY_DIET_PROFILE, type CookingDataClient, type PantryItem } from "../tools/planning";
import type { AgentEvent } from "../types";

function providerResponse(delta: Record<string, unknown>, finishReason = "stop") {
  const chunk = (change: Record<string, unknown>, finish: string | null) => ({
    id: "chat-1",
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta: change, finish_reason: finish }],
  });
  return new Response(
    [chunk(delta, null), chunk({}, finishReason)]
      .map((data) => `data: ${JSON.stringify(data)}\n\n`)
      .join("") + "data: [DONE]\n\n",
    { headers: { "Content-Type": "text/event-stream" } }
  );
}

async function run(prompt: string) {
  const pantry: PantryItem[] = [];
  const data: CookingDataClient = {
    async listPantry() {
      return pantry;
    },
    async addIngredient(input) {
      const item: PantryItem = {
        id: "test-stock",
        name: input.name,
        quantity: input.quantity ?? 1,
        unit: input.unit ?? "count",
        expiryDate: null,
        householdId: null,
        addedByUserId: null,
      };
      pantry.push(item);
      return { ok: true, item };
    },
    async removeIngredient() {
      return { ok: true, removed: [] };
    },
    async getDietProfile() {
      return EMPTY_DIET_PROFILE;
    },
    async listRecipes() {
      return { recipes: [], truncated: false };
    },
  };
  const forwarded: Record<string, any>[] = [];
  const handler = createChatHandler({
    apiKey: "server-only-provider-key",
    authenticate: async (token) => (token === "guest-jwt" ? "guest-user" : null),
    consumeQuota: async () => true,
    fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      forwarded.push(body);
      if (prompt === "hello")
        return providerResponse({ content: "Hi! What would you like to cook?" });
      if (body.messages.some((message: { role: string }) => message.role === "tool"))
        return providerResponse({ content: "Added 2 broccoli to your pantry." });
      return providerResponse(
        {
          tool_calls: [
            {
              index: 0,
              id: "call-broccoli",
              type: "function",
              function: {
                name: "manage_ingredients",
                arguments: JSON.stringify({
                  action: "add",
                  name: "broccoli",
                  quantity: 2,
                  unit: "count",
                }),
              },
            },
          ],
        },
        "tool_calls"
      );
    },
  });
  const agent = new NebiusCookingAgent({
    data,
    config: {
      apiKey: "guest-jwt",
      headers: { apikey: "public-project-key" },
      model: "cookkit-assistant",
      baseURL: "https://project.supabase.co/functions/v1/nebius-chat/v1",
    },
    fetch: async (input, init) => {
      const request = new Request(input, init);
      expect(request.headers.get("apikey")).toBe("public-project-key");
      return handler(request);
    },
  });
  const events: AgentEvent[] = [];
  for await (const event of agent.stream({
    messages: [{ id: "message-1", role: "user", content: prompt }],
  }))
    events.push(event);
  expect(events.filter((event) => event.type === "error" || event.type === "tool-error")).toEqual(
    []
  );
  return { events, pantry, forwarded };
}

it("streams a normal greeting through the authenticated proxy", async () => {
  const result = await run("hello");
  expect(result.events).toContainEqual(
    expect.objectContaining({ type: "text-delta", text: "Hi! What would you like to cook?" })
  );
  expect(result.pantry).toEqual([]);
});

it("round-trips a pantry tool through the proxy and changes only the local pantry", async () => {
  const result = await run("add 2 brocolli");
  expect(result.events).toContainEqual(
    expect.objectContaining({
      type: "tool-result",
      toolName: "manage_ingredients",
      output: expect.objectContaining({ ok: true }),
    })
  );
  expect(result.pantry).toEqual([expect.objectContaining({ name: "broccoli", quantity: 2 })]);
  expect(result.forwarded).toHaveLength(2);
  expect(result.forwarded[1]?.messages).toContainEqual(
    expect.objectContaining({ role: "tool", tool_call_id: "call-broccoli" })
  );
  expect(JSON.stringify(result.forwarded)).not.toContain("server-only-provider-key");
});
