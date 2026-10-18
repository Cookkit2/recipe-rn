import { mapProviderStream } from "../stream-events";

it("maps text, tool calls, and the finish event from a model stream", async () => {
  async function* parts() {
    yield { type: "text-delta", text: "Add " };
    yield {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "manage_ingredients",
      input: { action: "add", name: "eggs" },
    };
    yield {
      type: "tool-result",
      toolCallId: "call-1",
      toolName: "manage_ingredients",
      output: { ok: true },
    };
    yield { type: "text-delta", text: "eggs." };
    yield { type: "finish", finishReason: "stop" };
  }

  const events = [];
  for await (const event of mapProviderStream(parts())) events.push(event);

  expect(events).toEqual([
    { type: "text-delta", text: "Add " },
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "manage_ingredients",
      input: { action: "add", name: "eggs" },
    },
    {
      type: "tool-result",
      toolCallId: "call-1",
      toolName: "manage_ingredients",
      output: { ok: true },
    },
    { type: "text-delta", text: "eggs." },
    { type: "finish", text: "Add eggs.", finishReason: "stop" },
  ]);
});

it("surfaces a tool failure as a tool-error event", async () => {
  async function* parts() {
    yield {
      type: "tool-error",
      toolCallId: "call-2",
      toolName: "analyze_diet",
      error: new Error("nope"),
    };
  }
  const events = [];
  for await (const event of mapProviderStream(parts())) events.push(event);
  expect(events).toEqual([
    { type: "tool-error", toolCallId: "call-2", toolName: "analyze_diet", error: "nope" },
  ]);
});
