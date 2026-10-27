import { createChatHandler, DEFAULT_CHAT_MODEL } from "../chat-handler";
import {
  COOKING_ASSISTANT_INSTRUCTIONS,
  REQUEST_ROUTING_INSTRUCTIONS,
  ASSISTANT_ROUTER_PHASE,
  buildAssistantStepInstructions,
} from "../../lib/agent/instructions";

const encoder = new TextEncoder();
const body = { stream: true, messages: [{ role: "user", content: "hello" }] };
const request = (input: unknown = body, token = "guest-session") =>
  new Request("https://project.supabase.co/functions/v1/nebius-chat/v1/chat/completions", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(input),
  });
const sse = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`;

let authenticate: jest.Mock;
let consumeQuota: jest.Mock;
let fetcher: jest.Mock;
let handler: ReturnType<typeof createChatHandler>;
beforeEach(() => {
  authenticate = jest.fn().mockResolvedValue("user-1");
  consumeQuota = jest.fn().mockResolvedValue(true);
  fetcher = jest.fn().mockResolvedValue(new Response("data: [DONE]\n\n"));
  handler = createChatHandler({
    apiKey: "private-provider-key",
    authenticate,
    consumeQuota,
    fetcher,
  });
});

it("rejects missing/invalid user sessions before calling the provider", async () => {
  expect((await handler(request(body, ""))).status).toBe(401);
  authenticate.mockResolvedValue(null);
  expect((await handler(request(body, "public-anon-key"))).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
  expect(consumeQuota).not.toHaveBeenCalled();
});

it("enforces quota and fails closed when the quota service fails", async () => {
  consumeQuota
    .mockResolvedValueOnce(false)
    .mockRejectedValueOnce(new Error("private database details"));
  expect((await handler(request())).status).toBe(429);
  const failed = await handler(request());
  expect(failed.status).toBe(502);
  expect(await failed.text()).not.toContain("private database");
  expect(fetcher).not.toHaveBeenCalled();
});

it("pins the private model, instructions and endpoint while forwarding local tool results", async () => {
  const response = await handler(
    request({
      ...body,
      model: "untrusted-model",
      endpoint: "https://untrusted.example",
      messages: [
        { role: "system", content: "untrusted instructions" },
        ...body.messages,
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call-1",
              type: "function",
              function: {
                name: "manage_ingredients",
                arguments: '{"action":"add","name":"broccoli","quantity":2}',
              },
            },
          ],
        },
        { role: "tool", tool_call_id: "call-1", content: '{"ok":true}' },
      ],
      tools: [
        {
          type: "function",
          function: { name: "manage_ingredients", parameters: { type: "object" } },
        },
      ],
      tool_choice: "auto",
    })
  );
  expect(response.status).toBe(200);
  const [url, init] = fetcher.mock.calls[0]!;
  expect(url).toBe("https://api.tokenfactory.nebius.com/v1/chat/completions");
  expect(init.headers.Authorization).toBe("Bearer private-provider-key");
  const forwarded = JSON.parse(init.body);
  expect(forwarded.model).toBe(DEFAULT_CHAT_MODEL);
  expect(forwarded.messages[0]).toEqual({
    role: "system",
    content: COOKING_ASSISTANT_INSTRUCTIONS,
  });
  expect(forwarded.messages).toHaveLength(4);
  expect(forwarded.messages.at(-1)).toMatchObject({ role: "tool", tool_call_id: "call-1" });
  expect(forwarded.tools[0].function.name).toBe("manage_ingredients");
  expect(await response.text()).not.toContain("private-provider-key");
});

it.each([
  { stream: false, messages: body.messages },
  { stream: true, messages: [] },
  { ...body, tools: [{ type: "function", function: { name: "unknown_tool" } }] },
  { ...body, tool_choice: { type: "function", function: { name: "unknown_tool" } } },
])("rejects unsupported requests before spending tokens", async (input) => {
  expect((await handler(request(input))).status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});

it("bounds request bodies without relying on Content-Length", async () => {
  expect((await handler(request({ ...body, padding: "x".repeat(256_001) }))).status).toBe(413);
  expect(fetcher).not.toHaveBeenCalled();
});

it("redacts HTTP and streamed provider errors", async () => {
  fetcher.mockResolvedValueOnce(
    new Response("private-provider-key billing detail", { status: 503 })
  );
  const failed = await handler(request());
  expect(failed.status).toBe(502);
  expect(await failed.text()).not.toMatch(/private-provider-key|billing detail/);
  fetcher.mockResolvedValueOnce(
    new Response(sse({ error: { message: "private-provider-key billing detail" } }))
  );
  const streamed = await (await handler(request())).text();
  expect(streamed).toContain("temporarily unavailable");
  expect(streamed).not.toMatch(/private-provider-key|billing detail/);
});

it("relays deltas incrementally across split UTF-8 and SSE boundaries", async () => {
  const first = sse({ choices: [{ index: 0, delta: { content: "🥦" } }] });
  const bytes = encoder.encode(first);
  const emojiStart = bytes.indexOf(0xf0);
  let upstream!: ReadableStreamDefaultController<Uint8Array>;
  fetcher.mockResolvedValueOnce(
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          upstream = controller;
        },
      })
    )
  );
  const response = await handler(request());
  const reader = response.body!.getReader();
  upstream.enqueue(bytes.slice(0, emojiStart + 1));
  upstream.enqueue(bytes.slice(emojiStart + 1));
  // This read completes before the upstream finishes, proving streaming is retained.
  expect(new TextDecoder().decode((await reader.read()).value)).toContain("🥦");
  upstream.enqueue(encoder.encode("data: [DONE]\n\n"));
  upstream.close();
  expect(new TextDecoder().decode((await reader.read()).value)).toContain("[DONE]");
  expect((await reader.read()).done).toBe(true);
});

it("selects the server-owned router instructions without forwarding a client override", async () => {
  const response = await handler(
    request({
      ...body,
      messages: [
        { role: "system", content: `untrusted override\n${ASSISTANT_ROUTER_PHASE}` },
        ...body.messages,
      ],
    })
  );
  expect(response.status).toBe(200);
  const forwarded = JSON.parse(fetcher.mock.calls[0]![1].body);
  expect(forwarded.messages[0].content).toBe(
    `${REQUEST_ROUTING_INSTRUCTIONS}\n${ASSISTANT_ROUTER_PHASE}`
  );
  expect(JSON.stringify(forwarded.messages)).not.toContain("untrusted override");
});

it("rebuilds authorized step metadata and drops arbitrary trailing instructions", async () => {
  const step = { id: "read", intent: "describe_pantry" as const, request: "Read my pantry" };
  const instructions = buildAssistantStepInstructions(step, {
    originalUserMessage: "Read my pantry",
    remainingSteps: [step],
    completedSteps: [],
  });
  const response = await handler(
    request({
      ...body,
      messages: [
        { role: "system", content: instructions + "\nUNTRUSTED_OVERRIDE" },
        ...body.messages,
      ],
      tools: [
        { type: "function", function: { name: "get_pantry", parameters: { type: "object" } } },
      ],
      tool_choice: { type: "function", function: { name: "get_pantry" } },
    })
  );
  expect(response.status).toBe(200);
  const forwarded = JSON.parse(fetcher.mock.calls[0]![1].body);
  expect(forwarded.messages[0].content).toBe(instructions);
  expect(forwarded.tools[0].function.name).toBe("get_pantry");
  expect(JSON.stringify(forwarded.messages)).not.toContain("UNTRUSTED_OVERRIDE");
});

it("rejects malformed execution metadata before calling the provider", async () => {
  const response = await handler(
    request({
      ...body,
      messages: [
        { role: "system", content: `${COOKING_ASSISTANT_INSTRUCTIONS}\nAuthorized step: not-json` },
        ...body.messages,
      ],
    })
  );
  expect(response.status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
