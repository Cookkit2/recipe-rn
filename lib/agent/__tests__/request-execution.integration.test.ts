import { createCookingAgent } from "../factory";
import {
  startOpenAICompatibleServer,
  type OpenAITurnScript,
} from "../testing/openai-compatible-server";
import type { AgentEvent, CookingAgent } from "../types";
import type { AssistantPendingRequest, AssistantRequestPlan } from "../request-routing";
import type { CookingDataClient, PantryItem } from "../tools/planning";

function ready(...steps: Array<[string, string, string]>): unknown {
  return {
    status: "ready",
    resumePending: false,
    steps: steps.map(([id, intent, request]) => ({ id, intent, request })),
  };
}
function createData() {
  const items: PantryItem[] = [];
  const managePantry = jest.fn(async (input) => {
    if (input.action !== "add") throw new Error("Unexpected write");
    const item = {
      id: String(items.length + 1),
      name: input.name,
      quantity: input.quantity ?? 1,
      unit: input.unit ?? "count",
      expiryDate: null,
      householdId: null,
      addedByUserId: null,
    };
    items.push(item);
    return { ok: true as const, status: "added" as const, item };
  });
  const data = {
    managePantry,
    listPantry: jest.fn(async () => [...items]),
    addIngredient: jest.fn(),
    removeIngredient: jest.fn(),
    getDietProfile: async () => ({
      diet: null,
      allergens: [],
      macroTarget: null,
      source: "none" as const,
    }),
    listRecipes: jest.fn(async () => ({
      truncated: false,
      recipes: [
        {
          id: "r1",
          title: "Egg dish",
          tags: [],
          allergens: [],
          calories: null,
          protein: null,
          carbs: null,
          fat: null,
          fiber: null,
          servings: 1,
          cookMinutes: 1,
          ingredients: [{ name: "egg", quantity: 1, unit: "count" }],
        },
      ],
    })),
  } satisfies CookingDataClient;
  return { data, items, managePantry };
}
async function collect(
  agent: CookingAgent,
  content: string,
  pendingRequest?: AssistantPendingRequest
) {
  const events: AgentEvent[] = [];
  for await (const event of agent.stream({
    messages: [{ id: "user", role: "user", content }],
    pendingRequest,
  }))
    events.push(event);
  return events;
}
function pending(events: AgentEvent[]): AssistantPendingRequest {
  const value = events
    .filter((event) => event.type === "request-context" && event.context !== null)
    .at(-1);
  if (value?.type !== "request-context" || !value.context)
    throw new Error("Missing pending request");
  return value.context;
}
async function scenario(plans: unknown[], execution: OpenAITurnScript) {
  let routed = 0;
  const model = await startOpenAICompatibleServer({
    script: (context) => {
      const routing = context.body.messages?.some(
        (message) =>
          typeof message.content === "string" && message.content.includes("COOKKIT_REQUEST_ROUTER")
      );
      return routing
        ? {
            textDeltas: [
              typeof plans[routed] === "string"
                ? (plans[routed++] as string)
                : JSON.stringify(plans[routed++]),
            ],
          }
        : execution(context);
    },
  });
  const state = createData();
  const agent = createCookingAgent({
    data: state.data,
    kind: "nebius",
    config: { apiKey: "test", model: "test-model", baseURL: model.baseURL },
    fetch: globalThis.fetch,
  });
  return { ...state, agent, model };
}
function authorizedStep(instructions: string): { id: string; request: string } {
  return JSON.parse(
    instructions
      .split("\n")
      .find((line) => line.startsWith("Authorized step: "))!
      .slice("Authorized step: ".length)
  );
}
const tools = (name: string, args: Record<string, unknown> = {}) => ({
  toolCalls: [{ id: `call-${name}`, name, arguments: args }],
});

it("reads a pantry without authorizing a validly shaped removal attempt", async () => {
  const state = await scenario([ready(["read", "describe_pantry", "Describe my pantry"])], () =>
    tools("manage_ingredients", { action: "remove", name: "eggs" })
  );
  try {
    const events = await collect(state.agent, "Describe my pantry");
    expect(events).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "request-plan" })])
    );
    expect(state.managePantry).not.toHaveBeenCalled();
    expect(state.data.removeIngredient).not.toHaveBeenCalled();
  } finally {
    await state.model.close();
  }
});

it.each([null, { status: "ready", steps: [] }, "malformed JSON"])(
  "fails closed for malformed routing output %p",
  async (plan) => {
    const state = await scenario([plan], () =>
      tools("manage_ingredients", { action: "add", name: "eggs" })
    );
    try {
      const events = await collect(state.agent, "Milk");
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "request-plan",
            plan: expect.objectContaining({ status: "needs_clarification" }),
          }),
        ])
      );
      expect(state.managePantry).not.toHaveBeenCalled();
      expect(state.model.requests).toHaveLength(1);
    } finally {
      await state.model.close();
    }
  }
);

it("runs an addition before pantry reads and recipe suggestions", async () => {
  const state = await scenario(
    [
      ready(
        ["add", "add_ingredient", "Add two eggs"],
        ["read", "describe_pantry", "Describe my pantry"],
        ["recipes", "suggest_recipes", "Suggest a recipe"]
      ),
    ],
    ({ body }) => {
      const instructions = String(
        body.messages?.find((message) => message.role === "system")?.content
      );
      if (body.messages?.some((message) => message.role === "tool"))
        return { textDeltas: ["Done."] };
      if (authorizedStep(instructions).id === "add")
        return tools("manage_ingredients", { action: "add", name: "eggs", quantity: 2 });
      if (authorizedStep(instructions).id === "read") return tools("get_pantry");
      return tools("suggest_recipes");
    }
  );
  try {
    const events = await collect(state.agent, "Add two eggs, show my pantry, and suggest a recipe");
    expect(state.managePantry).toHaveBeenCalledTimes(1);
    const results = events.filter((event) => event.type === "tool-result");
    expect(results.map((event) => event.toolName)).toEqual([
      "manage_ingredients",
      "get_pantry",
      "suggest_recipes",
    ]);
    expect(results[1]).toMatchObject({ output: { items: [{ name: "eggs", quantity: 2 }] } });
    expect(results[2]).toMatchObject({ output: { recipes: [{ id: "r1", coverage: 1 }] } });
  } finally {
    await state.model.close();
  }
});

it("resumes only pending steps with the original quantity and never replays the completed write", async () => {
  const original = ready(
    ["eggs", "add_ingredient", "Add two eggs"],
    ["veg", "add_ingredient", "Add six vegetables"],
    ["recipes", "suggest_recipes", "Suggest a recipe"]
  ) as Extract<AssistantRequestPlan, { status: "ready" }>;
  const resumed = {
    status: "ready",
    resumePending: true,
    steps: [{ id: "veg", intent: "add_ingredient", request: "Add six carrots" }, original.steps[2]],
  };
  const state = await scenario([original, resumed], ({ body }) => {
    const instructions = String(
      body.messages?.find((message) => message.role === "system")?.content
    );
    if (body.messages?.some((message) => message.role === "tool")) return { textDeltas: ["Done."] };
    if (authorizedStep(instructions).id === "eggs")
      return tools("manage_ingredients", { action: "add", name: "eggs", quantity: 2 });
    if (authorizedStep(instructions).id === "veg")
      return tools("manage_ingredients", {
        action: "add",
        name: authorizedStep(instructions).request.includes("carrots") ? "carrots" : "vegetables",
        quantity: authorizedStep(instructions).request.includes("carrots") ? 1 : 6,
      });
    return tools("suggest_recipes");
  });
  try {
    const first = await collect(state.agent, "Add two eggs, six vegetables, and suggest a recipe");
    expect(state.managePantry).toHaveBeenCalledTimes(1);
    expect(state.data.listRecipes).not.toHaveBeenCalled();
    const context = pending(first);
    expect(context.completedSteps.map((step) => step.id)).toEqual(["eggs"]);
    expect(context.remainingSteps.map((step) => step.id)).toEqual(["veg", "recipes"]);
    await collect(state.agent, "Carrots", context);
    expect(state.managePantry).toHaveBeenCalledTimes(2);
    expect(state.items.map((item) => [item.name, item.quantity])).toEqual([
      ["eggs", 2],
      ["carrots", 6],
    ]);
    expect(state.data.listRecipes).toHaveBeenCalledTimes(1);
  } finally {
    await state.model.close();
  }
});

it("abandons a pending addition when the next request is read-only", async () => {
  const state = await scenario(
    [
      ready(["veg", "add_ingredient", "Add six vegetables"]),
      ready(["read", "describe_pantry", "Show my pantry"]),
    ],
    ({ body }) => {
      const instructions = String(
        body.messages?.find((message) => message.role === "system")?.content
      );
      if (body.messages?.some((message) => message.role === "tool"))
        return { textDeltas: ["Done."] };
      return authorizedStep(instructions).id === "veg"
        ? tools("manage_ingredients", { action: "add", name: "vegetables", quantity: 6 })
        : tools("get_pantry");
    }
  );
  try {
    const first = await collect(state.agent, "Add six vegetables");
    const second = await collect(state.agent, "Actually, just show my pantry", pending(first));
    expect(state.managePantry).not.toHaveBeenCalled();
    expect(second).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool-result",
          toolName: "get_pantry",
          output: expect.objectContaining({ items: [], totalCount: 0 }),
        }),
      ])
    );
  } finally {
    await state.model.close();
  }
});

it("rejects removal even when the planned tool is an addition", async () => {
  const state = await scenario([ready(["add", "add_ingredient", "Add two eggs"])], () =>
    tools("manage_ingredients", { action: "remove", name: "eggs" })
  );
  try {
    const events = await collect(state.agent, "Add two eggs");
    expect(state.managePantry).not.toHaveBeenCalled();
    expect(state.data.removeIngredient).not.toHaveBeenCalled();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool-result",
          output: expect.objectContaining({ status: "not_authorized" }),
        }),
      ])
    );
  } finally {
    await state.model.close();
  }
});

it("starts pantry inspection at the first page and retrieves later entries", async () => {
  const state = await scenario([ready(["read", "describe_pantry", "Do I have eggs?"])], () =>
    tools("get_pantry", { limit: 50, offset: 999 })
  );
  for (let i = 0; i < 55; i++)
    state.items.push({
      id: String(i),
      name: `Food ${String(i).padStart(2, "0")}`,
      quantity: null,
      unit: null,
      expiryDate: null,
      householdId: null,
      addedByUserId: null,
    });
  try {
    const events = await collect(state.agent, "Do I have eggs?");
    const pages = events.filter(
      (event) => event.type === "tool-result" && event.toolName === "get_pantry"
    );
    expect(pages).toHaveLength(2);
    expect(pages[0]).toMatchObject({ output: { offset: 0, totalCount: 55, truncated: true } });
    expect(pages[1]).toMatchObject({ output: { offset: 50, totalCount: 55, truncated: false } });
    expect(state.managePantry).not.toHaveBeenCalled();
  } finally {
    await state.model.close();
  }
});

it("retains a failed multi-page read as pending and stops dependent writes", async () => {
  const state = await scenario(
    [ready(["read", "describe_pantry", "Read pantry"], ["add", "add_ingredient", "Add eggs"])],
    () => tools("get_pantry")
  );
  for (let i = 0; i < 51; i++)
    state.items.push({
      id: String(i),
      name: `Food ${i}`,
      quantity: null,
      unit: null,
      expiryDate: null,
      householdId: null,
      addedByUserId: null,
    });
  // First page succeeds; the subsequent page fails.
  state.data.listPantry
    .mockReset()
    .mockResolvedValueOnce([...state.items])
    .mockRejectedValue(new Error("database unavailable"));
  try {
    const events = await collect(state.agent, "Read pantry and add eggs");
    expect(pending(events).remainingSteps.map((step) => step.id)).toEqual(["read", "add"]);
    expect(state.managePantry).not.toHaveBeenCalled();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "tool-error", toolName: "get_pantry" }),
      ])
    );
  } finally {
    await state.model.close();
  }
});

it("clears a cancelled pending write without invoking execution", async () => {
  const state = await scenario(
    [
      {
        status: "needs_clarification",
        question: "Cancelled. What would you like help with next?",
        abandonPending: true,
      },
    ],
    () => tools("manage_ingredients", { action: "add", name: "eggs" })
  );
  try {
    const context: AssistantPendingRequest = {
      originalUserMessage: "Add vegetables",
      remainingSteps: [{ id: "veg", intent: "add_ingredient", request: "Add vegetables" }],
      completedSteps: [],
    };
    const events = await collect(state.agent, "Cancel that", context);
    expect(events).toContainEqual({ type: "request-context", context: null });
    expect(state.model.requests).toHaveLength(1);
    expect(state.managePantry).not.toHaveBeenCalled();
  } finally {
    await state.model.close();
  }
});

it.each(["wrong-first", "success-first"] as const)(
  "never leaves an executed write pending after mixed action calls (%s)",
  async (order) => {
    const state = await scenario([ready(["add", "add_ingredient", "Add two eggs"])], () => {
      const add = {
        id: "add",
        name: "manage_ingredients",
        arguments: { action: "add", name: "eggs", quantity: 2 },
      };
      const wrong = {
        id: "wrong",
        name: "manage_ingredients",
        arguments: { action: "remove", name: "eggs" },
      };
      return { toolCalls: order === "wrong-first" ? [wrong, add] : [add, wrong] };
    });
    try {
      const events = await collect(state.agent, "Add two eggs");
      if (order === "wrong-first") expect(state.managePantry).not.toHaveBeenCalled();
      else {
        expect(state.managePantry).toHaveBeenCalledTimes(1);
        const context = pending(events);
        expect(context.remainingSteps).toEqual([]);
        expect(context.completedSteps.map((step) => step.id)).toEqual(["add"]);
      }
    } finally {
      await state.model.close();
    }
  }
);

it("serializes parallel pantry page calls before choosing each next offset", async () => {
  const state = await scenario([ready(["read", "describe_pantry", "Read pantry"])], () => ({
    toolCalls: [
      { id: "first", name: "get_pantry", arguments: { limit: 50, offset: 0 } },
      { id: "second", name: "get_pantry", arguments: { limit: 50, offset: 50 } },
    ],
  }));
  for (let i = 0; i < 55; i++)
    state.items.push({
      id: String(i),
      name: `Food ${i}`,
      quantity: 1,
      unit: "count",
      expiryDate: null,
      householdId: null,
      addedByUserId: null,
    });
  try {
    const events = await collect(state.agent, "Read pantry");
    expect(
      events
        .filter((event) => event.type === "tool-result")
        .map((event) => (event.output as { offset: number }).offset)
    ).toEqual([0, 50]);
    expect(events.some((event) => event.type === "error" || event.type === "tool-error")).toBe(
      false
    );
  } finally {
    await state.model.close();
  }
});
