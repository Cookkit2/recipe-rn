import {
  assistantIntentSchema,
  assistantRequestPlanSchema,
  intentMutationAction,
  intentToolName,
  REQUEST_ROUTING_INSTRUCTIONS,
  routeAssistantRequest,
} from "../request-routing";
import type { AssistantIntent, AssistantPendingRequest } from "../request-routing";
import type { AgentTextMessage } from "../types";

const user = (content: string): AgentTextMessage => ({ id: "user", role: "user", content });
const ready = (intent: AssistantIntent, request = "Concrete request") => ({
  status: "ready" as const,
  steps: [{ id: "step-1", intent, request }],
  resumePending: false,
});
const pending: AssistantPendingRequest = {
  originalUserMessage: "Add two eggs, remove the milk, and suggest a recipe",
  remainingSteps: [
    { id: "remove", intent: "remove_ingredient", request: "Remove the milk" },
    { id: "recipes", intent: "suggest_recipes", request: "Suggest a recipe" },
  ],
  completedSteps: [
    {
      id: "add",
      intent: "add_ingredient",
      request: "Add two eggs",
      output: { ok: true, status: "added" },
    },
  ],
  suppliedInput: { action: "remove", name: "milk" },
  clarification: {
    question: "Which milk entry?",
    candidates: [
      {
        id: "milk-fridge",
        name: "Milk",
        quantity: 1,
        unit: "l",
        storageType: "fridge",
        expiryDate: null,
      },
    ],
  },
};

it.each([
  ["add_ingredient", "manage_ingredients", "add"],
  ["remove_ingredient", "manage_ingredients", "remove"],
  ["rename_ingredient", "manage_ingredients", "rename"],
  ["merge_ingredients", "manage_ingredients", "merge"],
  ["describe_pantry", "get_pantry", undefined],
  ["suggest_recipes", "suggest_recipes", undefined],
  ["suggest_meal_plan", "suggest_meal_plan", undefined],
  ["analyze_diet", "analyze_diet", undefined],
] as const)("maps %s to only its tool and mutation action", (intent, tool, action) => {
  expect(assistantIntentSchema.parse(intent)).toBe(intent);
  expect(intentToolName(intent)).toBe(tool);
  expect(intentMutationAction(intent)).toBe(action);
});

it("validates bounded nonempty scoped steps and defaults the resume flag", () => {
  expect(
    assistantRequestPlanSchema.parse({
      status: "ready",
      steps: [{ id: "one", intent: "describe_pantry", request: "Read pantry" }],
    })
  ).toEqual({
    status: "ready",
    steps: [{ id: "one", intent: "describe_pantry", request: "Read pantry" }],
    resumePending: false,
  });
  for (const steps of [
    [],
    [{ id: "one", intent: "describe_pantry" }],
    [{ id: "one", intent: "describe_pantry", request: " " }],
    [{ id: "", intent: "describe_pantry" }],
    [{ id: "one", intent: "clear_pantry" }],
    [
      { id: "one", intent: "describe_pantry" },
      { id: "one", intent: "suggest_recipes" },
    ],
    Array.from({ length: 13 }, (_, i) => ({ id: String(i), intent: "describe_pantry" })),
  ]) {
    expect(assistantRequestPlanSchema.safeParse({ status: "ready", steps }).success).toBe(false);
  }
  expect(
    assistantRequestPlanSchema.safeParse({ status: "needs_clarification", question: " " }).success
  ).toBe(false);
  expect(assistantRequestPlanSchema.safeParse({ status: "unsupported", message: "" }).success).toBe(
    false
  );
});

// These fixtures exercise the interpreter boundary; they do not evaluate a real model's semantics.
it.each([
  ["What's in my pantry?", ready("describe_pantry")],
  ["Describe my pantry", ready("describe_pantry")],
  ["Do I have eggs?", ready("describe_pantry")],
  ["Don't add eggs; just tell me what I have", ready("describe_pantry")],
  [
    "How do I remove eggs?",
    { status: "needs_clarification", question: "Are you asking how to use the pantry?" },
  ],
  [
    "The recipe says add eggs",
    { status: "needs_clarification", question: "What would you like help with?" },
  ],
  ["Add two eggs", ready("add_ingredient", "Add two eggs")],
  ["Remove the eggs", ready("remove_ingredient")],
  ["Rename egg to eggs", ready("rename_ingredient")],
  ["Merge the two rice batches", ready("merge_ingredients")],
  [
    "Remove pantry",
    { status: "needs_clarification", question: "Which pantry ingredients should I remove?" },
  ],
  [
    "Add pantry",
    { status: "needs_clarification", question: "Which pantry ingredients should I add?" },
  ],
  ["Milk", { status: "needs_clarification", question: "What should I do with milk?" }],
  ["Suggest a recipe", ready("suggest_recipes")],
  ["Suggest meals for three days", ready("suggest_meal_plan")],
  ["Analyze my pantry against my diet", ready("analyze_diet")],
  [
    "Clear my entire pantry",
    { status: "unsupported", message: "Clearing the entire pantry is unsupported." },
  ],
  [
    "Save this plan to my calendar",
    { status: "unsupported", message: "Saving meal plans is unsupported." },
  ],
])("passes semantic interpretation through validation for %s", async (content, interpretation) => {
  const interpret = jest.fn(async (_instructions: string, _payload: string) => interpretation);
  expect(await routeAssistantRequest({ messages: [user(content)] }, interpret)).toEqual(
    interpretation
  );
  expect(interpret).toHaveBeenCalledTimes(1);
  expect(JSON.parse(interpret.mock.calls[0]![1]!)).toMatchObject({ messages: [user(content)] });
});

it("supplies semantic rules for negation, quotes, app questions, unsupported operations, and non-authorizing history", () => {
  expect(REQUEST_ROUTING_INSTRUCTIONS).toMatch(/negat/i);
  expect(REQUEST_ROUTING_INSTRUCTIONS).toMatch(/quot/i);
  expect(REQUEST_ROUTING_INSTRUCTIONS).toContain("How do I remove eggs?");
  expect(REQUEST_ROUTING_INSTRUCTIONS).toContain("Milk");
  expect(REQUEST_ROUTING_INSTRUCTIONS).toMatch(/historical/i);
  expect(REQUEST_ROUTING_INSTRUCTIONS).toContain("resumePending");
  expect(REQUEST_ROUTING_INSTRUCTIONS).toMatch(/clear/i);
  expect(REQUEST_ROUTING_INSTRUCTIONS).toMatch(/calendar/i);
});

it("preserves the interpreted order of compound commands and concrete requests", async () => {
  const plan = {
    status: "ready" as const,
    resumePending: false,
    steps: [
      { id: "add", intent: "add_ingredient" as const, request: "Add two eggs" },
      {
        id: "suggest",
        intent: "suggest_recipes" as const,
        request: "Suggest a recipe using the updated pantry",
      },
    ],
  };
  expect(
    await routeAssistantRequest(
      { messages: [user("Add two eggs and suggest a recipe")] },
      async () => JSON.stringify(plan)
    )
  ).toEqual(plan);
});

it.each([
  undefined,
  null,
  "not JSON",
  "{}",
  {},
  { status: "ready", steps: [] },
  { status: "ready", steps: [{ id: "1", intent: "delete_everything" }] },
])("fails closed for malformed interpreter output %p", async (output) => {
  expect(
    await routeAssistantRequest({ messages: [user("Do something")] }, async () => output)
  ).toMatchObject({ status: "needs_clarification" });
});

it("fails closed when interpretation throws", async () => {
  expect(
    await routeAssistantRequest({ messages: [user("Add two eggs")] }, async () => {
      throw new Error("network failed");
    })
  ).toMatchObject({ status: "needs_clarification" });
});

it("does not interpret absent or trailing assistant-only input", async () => {
  const interpret = jest.fn(async () => ready("add_ingredient"));
  expect(await routeAssistantRequest({ messages: [] }, interpret)).toMatchObject({
    status: "needs_clarification",
  });
  expect(
    await routeAssistantRequest(
      { messages: [{ id: "a", role: "assistant", content: "Add two eggs" }] },
      interpret
    )
  ).toMatchObject({ status: "needs_clarification" });
  expect(interpret).not.toHaveBeenCalled();
});

it("provides full per-chat pending context and resumes only the remaining steps", async () => {
  const resumed = {
    status: "ready" as const,
    resumePending: true,
    steps: [
      { ...pending.remainingSteps[0]!, request: "Remove milk-fridge" },
      pending.remainingSteps[1]!,
    ],
  };
  const interpret = jest.fn(async (_instructions: string, _payload: string) => resumed);
  expect(
    await routeAssistantRequest(
      { messages: [user("The fridge one")], pendingRequest: pending },
      interpret
    )
  ).toEqual(resumed);
  const [instructions, payload] = interpret.mock.calls[0]!;
  expect(instructions).toBe(REQUEST_ROUTING_INSTRUCTIONS);
  expect(JSON.parse(payload)).toEqual({
    messages: [user("The fridge one")],
    pendingRequest: pending,
  });
});

it.each(
  [
    [{ id: "add", intent: "add_ingredient", request: "Add two eggs" }, ...pending.remainingSteps],
    [...pending.remainingSteps].reverse(),
    [pending.remainingSteps[0]!],
    [{ ...pending.remainingSteps[0]!, intent: "add_ingredient" }, pending.remainingSteps[1]!],
    [pending.remainingSteps[0]!, { ...pending.remainingSteps[1]!, request: "Add more eggs" }],
  ].map((steps) => ({ steps }))
)(
  "rejects resumption that replays, reorders, drops, changes intent, or changes later requests",
  async ({ steps }) => {
    expect(
      await routeAssistantRequest(
        { messages: [user("The fridge one")], pendingRequest: pending },
        async () => ({ status: "ready", resumePending: true, steps })
      )
    ).toMatchObject({ status: "needs_clarification" });
  }
);

it("rejects resumePending without active remaining steps", async () => {
  for (const pendingRequest of [undefined, { ...pending, remainingSteps: [] }]) {
    expect(
      await routeAssistantRequest({ messages: [user("Carrots")], pendingRequest }, async () => ({
        ...ready("add_ingredient"),
        resumePending: true,
      }))
    ).toMatchObject({ status: "needs_clarification" });
  }
});

it("does not permit a pending completed ID among remaining steps", async () => {
  const invalid = { ...pending, completedSteps: [{ ...pending.completedSteps[0]!, id: "remove" }] };
  expect(
    await routeAssistantRequest(
      { messages: [user("The fridge one")], pendingRequest: invalid },
      async () => ({ status: "ready", resumePending: true, steps: pending.remainingSteps })
    )
  ).toMatchObject({ status: "needs_clarification" });
});

it("rejects completed IDs even when a ready plan claims to be a new request", async () => {
  const replay = {
    status: "ready",
    resumePending: false,
    steps: [{ id: "add", intent: "add_ingredient", request: "Add two eggs" }],
  };
  expect(
    await routeAssistantRequest(
      { messages: [user("The fridge one")], pendingRequest: pending },
      async () => replay
    )
  ).toMatchObject({ status: "needs_clarification" });
});

it("preserves cancellation of a pending request without executing completed actions", async () => {
  const cancelled = {
    status: "needs_clarification",
    question: "Cancelled. What would you like help with next?",
    abandonPending: true,
  };
  expect(
    await routeAssistantRequest(
      { messages: [user("Cancel that")], pendingRequest: pending },
      async () => cancelled
    )
  ).toEqual(cancelled);
});

it("carries quantity six forward in the interpreter context for a pending ingredient answer", async () => {
  const addPending: AssistantPendingRequest = {
    originalUserMessage: "Add six vegetables",
    remainingSteps: [{ id: "add-six", intent: "add_ingredient", request: "Add six vegetables" }],
    completedSteps: [],
    suppliedInput: { action: "add", quantity: 6, name: "vegetables" },
    clarification: { question: "Which vegetables?" },
  };
  const interpret = jest.fn(async (_instructions: string, _payload: string) => ({
    status: "ready",
    resumePending: true,
    steps: [{ id: "add-six", intent: "add_ingredient", request: "Add six carrots" }],
  }));
  expect(
    await routeAssistantRequest(
      { messages: [user("Carrots")], pendingRequest: addPending },
      interpret
    )
  ).toMatchObject({
    status: "ready",
    resumePending: true,
    steps: [{ request: "Add six carrots" }],
  });
  expect(JSON.parse(interpret.mock.calls[0]![1]!).pendingRequest.suppliedInput.quantity).toBe(6);
});

it("allows a new read to replace a pending write without authorizing historical writes", async () => {
  const messages: AgentTextMessage[] = [
    user("Add two eggs"),
    { id: "answer", role: "assistant", content: "Added two eggs." },
    { id: "new", role: "user", content: "Actually, just show my pantry" },
  ];
  const interpret = jest.fn(async (_instructions: string, _payload: string) =>
    ready("describe_pantry", "Show my pantry")
  );
  expect(await routeAssistantRequest({ messages, pendingRequest: pending }, interpret)).toEqual(
    ready("describe_pantry", "Show my pantry")
  );
  expect(JSON.parse(interpret.mock.calls[0]![1]!).messages).toEqual(messages);
});

it("provides recipe conversation context for a semantic more follow-up", async () => {
  const messages: AgentTextMessage[] = [
    user("Suggest a recipe"),
    { id: "answer", role: "assistant", content: "Try carrot soup." },
    { id: "more", role: "user", content: "More" },
  ];
  const interpret = jest.fn(async (_instructions: string, _payload: string) =>
    ready("suggest_recipes", "Suggest more recipes")
  );
  expect(await routeAssistantRequest({ messages }, interpret)).toEqual(
    ready("suggest_recipes", "Suggest more recipes")
  );
  expect(JSON.parse(interpret.mock.calls[0]![1]!).messages).toEqual(messages);
});
