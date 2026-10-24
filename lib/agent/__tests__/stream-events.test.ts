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
    {
      type: "tool-error",
      toolCallId: "call-2",
      toolName: "analyze_diet",
      error: "Something went wrong, please try again later",
    },
  ]);
});

it("hides a provider error streamed as text, even when its prefix spans chunks", async () => {
  async function* parts() {
    for (const text of [
      "[ER",
      "ROR: Agent failed (Function process_single_item_agent ",
      "timed out after 90.0 seconds), API failed]",
    ]) {
      yield { type: "text-delta", text };
    }
    yield { type: "finish", finishReason: "stop" };
  }
  const events = [];
  for await (const event of mapProviderStream(parts())) events.push(event);
  expect(events).toEqual([
    { type: "error", message: "The assistant took too long to respond. Please try again." },
    { type: "finish", text: "", finishReason: "stop" },
  ]);
});

it("maps structured API failures without exposing the response body", async () => {
  async function* parts() {
    yield { type: "error", error: { statusCode: 429, message: "private provider details" } };
  }
  const events = [];
  for await (const event of mapProviderStream(parts())) events.push(event);
  expect(events).toEqual([
    { type: "error", message: "The assistant is busy. Please try again in a moment." },
  ]);
});

it("preserves normal text and incomplete bracket prefixes at the end of a stream", async () => {
  async function* parts() {
    for (const text of ["Cook ", "[", "eggs]", " [ER"]) yield { type: "text-delta", text };
  }
  const events = [];
  for await (const event of mapProviderStream(parts())) events.push(event);
  expect(events.map((event) => (event.type === "text-delta" ? event.text : "")).join("")).toBe(
    "Cook [eggs] [ER"
  );
  expect(events.every((event) => event.type === "text-delta")).toBe(true);
});

it("hides an inline error after a partial answer without requiring a finish event", async () => {
  async function* parts() {
    yield { type: "text-delta", text: "Beat the eggs. [ERR" };
    yield { type: "text-delta", text: "OR: private provider details]" };
  }
  const events = [];
  for await (const event of mapProviderStream(parts())) events.push(event);
  expect(events).toEqual([
    { type: "text-delta", text: "Beat the eggs. " },
    { type: "error", message: "Something went wrong, please try again later" },
  ]);
});
