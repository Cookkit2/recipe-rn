/** Actual agent + AI SDK + proxy, with a scripted provider and an in-memory pantry. */
import { NebiusCookingAgent } from "../NebiusCookingAgent";
import { createChatHandler } from "../../../server/chat-handler";
import { EMPTY_DIET_PROFILE, type CookingDataClient, type PantryItem } from "../tools/planning";
import type { AgentEvent } from "../types";
import { ASSISTANT_ROUTER_PHASE } from "../instructions";

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
      if (
        body.messages.some(
          (message: { content?: unknown }) =>
            typeof message.content === "string" && message.content.endsWith(ASSISTANT_ROUTER_PHASE)
        )
      )
        return providerResponse({
          content: JSON.stringify(
            prompt === "hello"
              ? { status: "needs_clarification", question: "Hi! What would you like to cook?" }
              : {
                  status: "ready",
                  resumePending: false,
                  steps: [
                    {
                      id: "step-1",
                      intent: prompt === "what do I have?" ? "describe_pantry" : "add_ingredient",
                      request: prompt,
                    },
                  ],
                }
          ),
        });
      if (prompt === "what do I have?")
        return providerResponse(
          {
            tool_calls: [
              {
                index: 0,
                id: "call-read",
                type: "function",
                function: { name: "get_pantry", arguments: "{}" },
              },
            ],
          },
          "tool_calls"
        );
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

it("routes a normal greeting through the authenticated proxy", async () => {
  const result = await run("hello");
  expect(result.events).toContainEqual(
    expect.objectContaining({
      type: "request-message",
      message: "Hi! What would you like to cook?",
    })
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
  expect(result.forwarded[0]?.messages[0]?.content).toContain(ASSISTANT_ROUTER_PHASE);
  expect(result.forwarded[1]?.messages[0]?.content).toContain("Authorized step:");
  expect(result.forwarded[1]?.tool_choice).toEqual({
    type: "function",
    function: { name: "manage_ingredients" },
  });
  expect(JSON.stringify(result.forwarded)).not.toContain("server-only-provider-key");
});

it("round-trips a read-only pantry tool through the authenticated proxy", async () => {
  const result = await run("what do I have?");
  expect(result.events).toContainEqual(
    expect.objectContaining({ type: "tool-result", toolName: "get_pantry" })
  );
  expect(result.pantry).toEqual([]);
  expect(result.forwarded).toHaveLength(2);
  expect(result.forwarded[1]?.tool_choice).toEqual({
    type: "function",
    function: { name: "get_pantry" },
  });
});
