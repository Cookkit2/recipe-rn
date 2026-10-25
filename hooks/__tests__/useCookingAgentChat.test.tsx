import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useCookingAgentChat } from "../useCookingAgentChat";
import type { AgentEvent, AgentTurnInput, CookingAgent } from "~/lib/agent/types";
import type { AssistantPendingRequest } from "~/lib/agent/request-routing";
import { PANTRY_READ_ERROR } from "~/lib/agent/pantry-read";

function createScriptedAgent(): CookingAgent {
  return {
    kind: "nebius",
    async *stream() {
      yield {
        type: "tool-result",
        toolCallId: "1",
        toolName: "suggest_recipes",
        output: { recipes: [], pantryCount: 1, truncated: false },
      };
      yield { type: "text-delta", text: "Tomato salad." };
      yield { type: "finish", text: "Tomato salad.", finishReason: "stop" };
    },
  };
}

it("stores verified recipe results and a tool activity without model prose", async () => {
  const { result } = await renderHook(() => useCookingAgentChat(createScriptedAgent()));
  await act(async () => {
    await result.current.send("What can I cook?");
  });
  await waitFor(() => {
    expect(result.current.status).toBe("idle");
  });
  expect(result.current.messages.map((message) => message.content)).toEqual([
    "What can I cook?",
    "",
  ]);
  expect(result.current.messages[1]).toMatchObject({
    recipeSuggestions: { recipes: [], pantryCount: 1, truncated: false },
  });
  expect(result.current.messages[1]?.activities).toEqual(["Matched recipes"]);
});

it.each(["error", "tool-error", "throw"] as const)(
  "sanitizes the %s failure path and allows retry",
  async (path) => {
    const agent: CookingAgent = {
      kind: "nebius",
      async *stream() {
        if (path === "throw") throw new Error("secret API response");
        if (path === "error") yield { type: "error", message: "secret API response" };
        else
          yield {
            type: "tool-error",
            toolCallId: "1",
            toolName: "analyze_diet",
            error: "secret API response",
          };
      },
    };
    const { result } = await renderHook(() => useCookingAgentChat(agent));
    await act(async () => {
      await result.current.send("Help");
    });
    expect(result.current.messages[1]?.error).toBe("Something went wrong, please try again later");
    expect(result.current.status).toBe("idle");
    await act(async () => {
      await result.current.send("Try again");
    });
    expect(result.current.messages).toHaveLength(4);
  }
);

it("shows recipe tool progress before the tool returns", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream() {
      yield { type: "tool-call", toolCallId: "1", toolName: "suggest_recipes", input: {} };
      await blocked;
      yield {
        type: "tool-result",
        toolCallId: "1",
        toolName: "suggest_recipes",
        output: { recipes: [], pantryCount: 1, truncated: false },
      };
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  let sent!: Promise<void>;
  await act(async () => {
    sent = result.current.send("Suggest recipes");
  });
  expect(result.current.messages[1]?.activities).toEqual(["Finding recipes…"]);
  await act(async () => {
    release();
    await sent;
  });
  expect(result.current.messages[1]?.activities).toEqual(["Matched recipes"]);
});

it("does not claim a failed pantry update succeeded", async () => {
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream() {
      yield { type: "tool-call", toolCallId: "1", toolName: "manage_ingredients", input: {} };
      yield {
        type: "tool-result",
        toolCallId: "1",
        toolName: "manage_ingredients",
        output: { ok: false, error: "Local write failed" },
      };
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  await act(async () => {
    await result.current.send("Add eggs");
  });
  expect(result.current.messages[1]?.activities).toEqual([]);
  expect(result.current.messages[1]?.error).toBe("Something went wrong, please try again later");
});

it.each(["timeout", "stop"] as const)(
  "releases a stalled stream on %s and ignores late events",
  async (ending) => {
    jest.useFakeTimers();
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    let signal: AbortSignal | undefined;
    const agent: CookingAgent = {
      kind: "nebius",
      async *stream(input) {
        signal = input.signal;
        yield { type: "tool-call", toolCallId: "1", toolName: "suggest_recipes", input: {} };
        await blocked;
        yield { type: "text-delta", text: "Late answer" };
      },
    };
    try {
      const { result } = await renderHook(() => useCookingAgentChat(agent));
      let sent!: Promise<void>;
      await act(async () => {
        sent = result.current.send("Suggest recipes");
      });
      await act(async () => {
        if (ending === "timeout") await jest.advanceTimersByTimeAsync(45000);
        else result.current.stop();
        // Do not await a stream that ignores cancellation: verify the UI is already idle.
      });
      expect(result.current.status).toBe("idle");
      expect(signal?.aborted).toBe(true);
      expect(result.current.messages[1]?.activities).toEqual([]);
      expect(result.current.messages[1]?.error).toBe(
        ending === "timeout"
          ? "The assistant took too long to respond. Please try again."
          : undefined
      );
      await act(async () => {
        release();
        await sent;
      });
      expect(result.current.messages[1]?.content).toBe(
        ending === "stop" ? "Recipe search stopped." : ""
      );
      await act(async () => {
        await result.current.send("Try again");
      });
      expect(result.current.messages).toHaveLength(4);
    } finally {
      release();
      jest.useRealTimers();
    }
  }
);

it.each(["timeout", "stop"] as const)(
  "reports an uncertain pantry write on %s without inviting a duplicate",
  async (ending) => {
    jest.useFakeTimers();
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    let writes = 0;
    const agent: CookingAgent = {
      kind: "nebius",
      async *stream() {
        yield {
          type: "tool-call",
          toolCallId: "add-1",
          toolName: "manage_ingredients",
          input: { action: "add", name: "eggs" },
        };
        await blocked;
        writes += 1;
        yield {
          type: "tool-result",
          toolCallId: "add-1",
          toolName: "manage_ingredients",
          output: { ok: true },
        };
      },
    };
    const { result } = await renderHook(() => useCookingAgentChat(agent));
    let sent!: Promise<void>;
    try {
      await act(async () => {
        sent = result.current.send("Add eggs");
      });
      await act(async () => {
        if (ending === "timeout") await jest.advanceTimersByTimeAsync(45000);
        else result.current.stop();
      });
      expect(result.current.status).toBe("idle");
      expect(result.current.messages[1]?.error).toBe(
        "A pantry update may still finish. Check your pantry before trying again."
      );
      await act(async () => {
        release();
        await sent;
      });
      expect(writes).toBe(1);
      expect(result.current.messages[1]?.activities).toEqual([]);
    } finally {
      await act(async () => {
        release();
        await sent;
      });
      jest.useRealTimers();
    }
  }
);

const verifiedRecipeOutput = {
  recipes: [
    {
      id: "r-eggs",
      title: "Catalog omelette",
      matched: ["eggs"],
      missing: ["spinach"],
      coverage: 0.5,
      calories: 100,
      tags: [],
    },
  ],
  pantryCount: 1,
  truncated: false,
};

it("renders verified results instead of invented recipe prose before or after a tool call", async () => {
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream() {
      yield { type: "text-delta", text: "Invented pasta" };
      yield { type: "tool-call", toolCallId: "r1", toolName: "suggest_recipes", input: {} };
      yield {
        type: "tool-result",
        toolCallId: "r1",
        toolName: "suggest_recipes",
        output: verifiedRecipeOutput,
      };
      yield { type: "text-delta", text: "You have chicken and rice" };
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  await act(async () => {
    await result.current.send("Suggest 3 recipes using my pantry");
  });
  expect(result.current.messages[1]).toMatchObject({
    content: "",
    recipeSuggestions: verifiedRecipeOutput,
  });
  expect(result.current.messages[1]?.error).toBeUndefined();
});

it.each(["tool-error", "no-tool", "malformed"] as const)(
  "fails closed on %s instead of displaying unverified recipe suggestions",
  async (failure) => {
    const agent: CookingAgent = {
      kind: "nebius",
      async *stream() {
        yield {
          type: "request-plan",
          plan: {
            status: "ready",
            resumePending: false,
            steps: [{ id: "recipes", intent: "suggest_recipes", request: "Suggest recipes" }],
          },
        };
        yield { type: "text-delta", text: "Invented pasta" };
        if (failure === "tool-error")
          yield {
            type: "tool-error",
            toolCallId: "r1",
            toolName: "suggest_recipes",
            error: "Missing column",
          };
        if (failure === "malformed")
          yield {
            type: "tool-result",
            toolCallId: "r1",
            toolName: "suggest_recipes",
            output: { recipes: [{ title: "Unverified" }] },
          };
        yield { type: "text-delta", text: "Try chicken soup instead" };
      },
    };
    const { result } = await renderHook(() => useCookingAgentChat(agent));
    await act(async () => {
      await result.current.send("Suggest recipes from my fridge");
    });
    expect(result.current.messages[1]).toMatchObject({
      content: "",
      error: "Couldn't load recipe suggestions. Please try again.",
    });
    expect(result.current.messages[1]).not.toHaveProperty(
      "recipeSuggestions",
      verifiedRecipeOutput
    );
  }
);

it("still streams general cooking advice", async () => {
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream() {
      yield { type: "text-delta", text: "Boil for 8 minutes." };
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  await act(async () => {
    await result.current.send("How long should I boil eggs?");
  });
  expect(result.current.messages[1]?.content).toBe("Boil for 8 minutes.");
});

it("preserves a failed pantry update alongside verified recipes in a combined request", async () => {
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream() {
      yield {
        type: "tool-result",
        toolCallId: "add",
        toolName: "manage_ingredients",
        output: { ok: false, error: "Local write failed" },
      };
      yield {
        type: "tool-result",
        toolCallId: "recipes",
        toolName: "suggest_recipes",
        output: verifiedRecipeOutput,
      };
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  await act(async () => {
    await result.current.send("Add eggs and suggest recipes");
  });
  expect(result.current.messages[1]).toMatchObject({
    recipeSuggestions: verifiedRecipeOutput,
    error: "Something went wrong, please try again later",
  });
});

it("keeps an uncertain pantry warning after recipes have already loaded", async () => {
  jest.useFakeTimers();
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream() {
      yield {
        type: "tool-result",
        toolCallId: "recipes",
        toolName: "suggest_recipes",
        output: verifiedRecipeOutput,
      };
      yield { type: "tool-call", toolCallId: "add", toolName: "manage_ingredients", input: {} };
      await blocked;
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  let sent!: Promise<void>;
  try {
    await act(async () => {
      sent = result.current.send("Suggest recipes and add eggs");
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(45000);
    });
    expect(result.current.messages[1]).toMatchObject({
      recipeSuggestions: verifiedRecipeOutput,
      error: "A pantry update may still finish. Check your pantry before trying again.",
    });
  } finally {
    await act(async () => {
      release();
      await sent;
    });
    jest.useRealTimers();
  }
});

it("retains verified recipe details in model history for cooking follow-ups", async () => {
  const requests: Parameters<CookingAgent["stream"]>[0][] = [];
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream(input) {
      requests.push(input);
      if (requests.length === 1) {
        yield {
          type: "tool-result",
          toolCallId: "recipes",
          toolName: "suggest_recipes",
          output: verifiedRecipeOutput,
        };
      } else {
        yield { type: "text-delta", text: "Cook the omelette in a pan." };
      }
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  await act(async () => {
    await result.current.send("Suggest recipes");
  });
  await act(async () => {
    await result.current.send("How do I cook the first one?");
  });
  const priorReply = requests[1]?.messages.find((message) => message.role === "assistant");
  expect(JSON.parse(priorReply?.content ?? "null")).toEqual(verifiedRecipeOutput);
  expect(result.current.messages[1]?.content).toBe("");
  expect(result.current.messages[3]?.content).toBe("Cook the omelette in a pan.");
});

it("shows pantry clarification as ordinary conversation and carries row choices to the next turn", async () => {
  const requests: unknown[] = [];
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream(input) {
      requests.push(input.messages);
      yield { type: "tool-call", toolCallId: "1", toolName: "manage_ingredients", input: {} };
      yield {
        type: "tool-result",
        toolCallId: "1",
        toolName: "manage_ingredients",
        output: {
          ok: false,
          status: "needs_clarification",
          question: "Which pantry entry should I update?",
          candidates: [
            {
              id: "egg-1",
              name: "eggs",
              quantity: 6,
              unit: "pcs",
              storageType: "fridge",
              expiryDate: null,
            },
          ],
        },
      };
      yield { type: "text-delta", text: "Updated your pantry." };
      yield { type: "finish", text: "Updated your pantry." };
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  await act(async () => {
    await result.current.send("Add 2 eggs");
  });
  expect(result.current.messages[1]).toMatchObject({
    content: expect.stringContaining("Which pantry entry should I update?"),
    activities: [],
  });
  expect(result.current.messages[1]?.content).toContain("6 pcs");
  expect(result.current.messages[1]?.content).toContain("fridge");
  expect(result.current.messages[1]?.error).toBeUndefined();
  expect(result.current.messages[1]?.pantryError).toBeUndefined();
  await act(async () => {
    await result.current.send("The fridge entry");
  });
  expect(JSON.stringify(requests[1])).toContain("egg-1");
});

it.each(["added", "updated", "renamed", "merged", "removed"])(
  "reports the confirmed %s pantry result",
  async (status) => {
    const agent: CookingAgent = {
      kind: "nebius",
      async *stream() {
        yield {
          type: "tool-result",
          toolCallId: "1",
          toolName: "manage_ingredients",
          output: {
            ok: true,
            status,
            item: { id: "egg", name: "eggs", quantity: 8, unit: "count" },
            removed: [],
          },
        };
      },
    };
    const { result } = await renderHook(() => useCookingAgentChat(agent));
    await act(async () => {
      await result.current.send("Change my pantry");
    });
    expect(result.current.messages[1]?.activities).toEqual([
      status === "added"
        ? "Added to pantry"
        : status === "removed"
          ? "Removed from pantry"
          : "Updated pantry",
    ]);
  }
);

it("keeps a pantry clarification visible if the model calls recipes afterward", async () => {
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream() {
      yield {
        type: "tool-result",
        toolCallId: "1",
        toolName: "manage_ingredients",
        output: { ok: false, status: "needs_clarification", question: "Which vegetables?" },
      };
      yield { type: "tool-call", toolCallId: "2", toolName: "suggest_recipes", input: {} };
      yield {
        type: "tool-result",
        toolCallId: "2",
        toolName: "suggest_recipes",
        output: { recipes: [], pantryCount: 1, truncated: false },
      };
      yield { type: "finish", text: "Recipes" };
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  await act(async () => {
    await result.current.send("Add vegetables and suggest food");
  });
  expect(result.current.messages[1]).toMatchObject({
    content: "Which vegetables?",
    activities: [],
  });
  expect(result.current.messages[1]?.error).toBeUndefined();
});

const pantryPage = {
  items: [{ id: "egg-1", name: "Eggs", quantity: 6, unit: "pcs", expiryDate: null }],
  totalCount: 1,
  offset: 0,
  truncated: false,
};

function eventAgent(events: AgentEvent[]): CookingAgent {
  return {
    kind: "nebius",
    async *stream() {
      yield* events;
    },
  };
}

it("shows neutral pantry read progress and keeps grounded rows without model prose", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream() {
      yield { type: "text-delta", text: "Invented chicken" };
      yield { type: "tool-call", toolCallId: "read", toolName: "get_pantry", input: {} };
      await blocked;
      yield { type: "tool-result", toolCallId: "read", toolName: "get_pantry", output: pantryPage };
      yield { type: "text-delta", text: "There is no food and it is all in the freezer." };
      yield { type: "finish", text: "Invented summary" };
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  let sent!: Promise<void>;
  await act(async () => {
    sent = result.current.send("Describe my pantry");
  });
  expect(result.current.messages[1]?.activities).toEqual(["Reading pantry…"]);
  expect(result.current.messages[1]?.content).toBe("");
  await act(async () => {
    release();
    await sent;
  });
  expect(result.current.messages[1]?.activities).toEqual(["Read pantry"]);
  expect(result.current.messages[1]?.content).toContain("Eggs: 6 pcs");
  expect(result.current.messages[1]?.content).not.toMatch(/chicken|freezer|no food|Invented/);
  expect(result.current.messages[1]?.error).toBeUndefined();
});

it.each(["malformed", "tool-error", "throw"] as const)(
  "keeps %s pantry read failure distinct from empty stock and allows retry",
  async (failure) => {
    let count = 0;
    const agent: CookingAgent = {
      kind: "nebius",
      async *stream() {
        count += 1;
        yield { type: "tool-call", toolCallId: "read", toolName: "get_pantry", input: {} };
        if (count === 2) {
          yield {
            type: "tool-result",
            toolCallId: "read",
            toolName: "get_pantry",
            output: { items: [], totalCount: 0, offset: 0, truncated: false },
          };
          return;
        }
        if (failure === "throw") throw new Error("private database details");
        if (failure === "tool-error")
          yield {
            type: "tool-error",
            toolCallId: "read",
            toolName: "get_pantry",
            error: "private database details",
          };
        else
          yield {
            type: "tool-result",
            toolCallId: "read",
            toolName: "get_pantry",
            output: { ...pantryPage, totalCount: "broken" },
          };
        yield { type: "text-delta", text: "Your pantry is empty." };
      },
    };
    const { result } = await renderHook(() => useCookingAgentChat(agent));
    await act(async () => {
      await result.current.send("What do I have?");
    });
    expect(result.current.messages[1]).toMatchObject({
      content: "",
      activities: [],
      error: PANTRY_READ_ERROR,
    });
    await act(async () => {
      await result.current.send("Try again");
    });
    expect(result.current.messages[3]).toMatchObject({
      content: "Your pantry is empty.",
      activities: ["Read pantry"],
    });
    expect(result.current.messages[3]?.error).toBeUndefined();
  }
);

it("retains all retrieved pantry pages and suppresses absence claims on partial results", async () => {
  const { result } = await renderHook(() =>
    useCookingAgentChat(
      eventAgent([
        {
          type: "tool-result",
          toolCallId: "first",
          toolName: "get_pantry",
          output: { ...pantryPage, totalCount: 3, truncated: true },
        },
        { type: "tool-call", toolCallId: "second", toolName: "get_pantry", input: { offset: 1 } },
        {
          type: "tool-result",
          toolCallId: "second",
          toolName: "get_pantry",
          output: {
            items: [{ id: "milk", name: "Milk", quantity: null, unit: null, expiryDate: null }],
            offset: 1,
            totalCount: 3,
            truncated: true,
          },
        },
        { type: "text-delta", text: "You have no carrots." },
      ])
    )
  );
  await act(async () => {
    await result.current.send("Do I have carrots?");
  });
  expect(result.current.messages[1]?.content).toContain("Eggs: 6 pcs");
  expect(result.current.messages[1]?.content).toContain("Milk: quantity not recorded");
  expect(result.current.messages[1]?.content).toContain("partial");
  expect(result.current.messages[1]?.content).not.toContain("no carrots");
  expect(result.current.messages[1]?.activities).toEqual(["Read pantry"]);
});

it("retains readable pantry rows when a later page fails", async () => {
  const { result } = await renderHook(() =>
    useCookingAgentChat(
      eventAgent([
        {
          type: "tool-result",
          toolCallId: "first",
          toolName: "get_pantry",
          output: { ...pantryPage, totalCount: 2, truncated: true },
        },
        { type: "tool-call", toolCallId: "second", toolName: "get_pantry", input: { offset: 1 } },
        {
          type: "tool-error",
          toolCallId: "second",
          toolName: "get_pantry",
          error: "database error",
        },
      ])
    )
  );
  await act(async () => {
    await result.current.send("Read pantry");
  });
  expect(result.current.messages[1]?.content).toContain("Eggs: 6 pcs");
  expect(result.current.messages[1]?.error).toBe(PANTRY_READ_ERROR);
  expect(result.current.messages[1]?.activities).toEqual(["Read pantry"]);
});

it.each(["needs_clarification", "unsupported"] as const)(
  "renders a %s request message as authoritative conversation",
  async (status) => {
    const message = "Which pantry ingredients do you mean?";
    const { result } = await renderHook(() =>
      useCookingAgentChat(
        eventAgent([
          {
            type: "request-plan",
            plan:
              status === "needs_clarification"
                ? { status, question: message }
                : { status, message },
          },
          { type: "request-message", message },
          { type: "text-delta", text: "Updated your pantry successfully." },
          { type: "finish", text: "Unverified" },
        ])
      )
    );
    await act(async () => {
      await result.current.send("Remove pantry");
    });
    expect(result.current.messages[1]).toMatchObject({ content: message, activities: [] });
    expect(result.current.messages[1]?.error).toBeUndefined();
    expect(result.current.messages[1]?.recipeStatus).toBeUndefined();
  }
);

const pendingRequest: AssistantPendingRequest = {
  originalUserMessage: "Add two eggs, add six vegetables and suggest recipes",
  remainingSteps: [
    { id: "vegetables", intent: "add_ingredient", request: "Add six vegetables" },
    { id: "recipes", intent: "suggest_recipes", request: "Suggest recipes" },
  ],
  completedSteps: [
    {
      id: "eggs",
      intent: "add_ingredient",
      request: "Add two eggs",
      output: { ok: true, status: "added", id: "eggs-1" },
    },
  ],
  suppliedInput: { action: "add", name: "vegetables", quantity: 6, unit: "count" },
  clarification: {
    question: "Which vegetables?",
    candidates: [
      {
        id: "carrot-fridge",
        name: "Carrots",
        quantity: 4,
        unit: "count",
        storageType: "fridge",
        expiryDate: null,
      },
    ],
  },
};

it("passes pending context unchanged on the immediate next send and clears it on completion or abandonment", async () => {
  const requests: AgentTurnInput[] = [];
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream(input) {
      requests.push(input);
      if (requests.length === 1) {
        yield { type: "request-context", context: pendingRequest };
        yield { type: "request-message", message: "Which vegetables?" };
      } else yield { type: "request-context", context: null };
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  await act(async () => {
    await result.current.send(pendingRequest.originalUserMessage);
    await result.current.send("Carrots");
    await result.current.send("Actually, just show my pantry");
  });
  expect(requests[1]?.pendingRequest).toEqual(pendingRequest);
  expect(requests[1]?.pendingRequest).toBe(pendingRequest);
  expect(requests[1]?.messages.map(({ content }) => content)).toEqual([
    pendingRequest.originalUserMessage,
    "Which vegetables?",
    "Carrots",
  ]);
  expect(requests[2]?.pendingRequest).toBeUndefined();
});

it("isolates pending requests between chat hook instances", async () => {
  const requests: AgentTurnInput[] = [];
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream(input) {
      requests.push(input);
      yield { type: "request-context", context: pendingRequest };
    },
  };
  const { result } = await renderHook(() => ({
    first: useCookingAgentChat(agent),
    second: useCookingAgentChat(agent),
  }));
  await act(async () => {
    await result.current.first.send("Add six vegetables");
  });
  await act(async () => {
    await result.current.second.send("Milk");
  });
  expect(requests[1]?.pendingRequest).toBeUndefined();
  await act(async () => {
    await result.current.first.send("Carrots");
  });
  expect(requests[2]?.pendingRequest).toEqual(pendingRequest);
});

it("uses the routed read plan after recipe history without blanking pantry rows", async () => {
  let count = 0;
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream() {
      count += 1;
      if (count === 1)
        yield {
          type: "tool-result",
          toolCallId: "recipes",
          toolName: "suggest_recipes",
          output: verifiedRecipeOutput,
        };
      else {
        yield {
          type: "request-plan",
          plan: {
            status: "ready",
            resumePending: false,
            steps: [{ id: "read", intent: "describe_pantry", request: "Describe pantry" }],
          },
        };
        yield {
          type: "tool-result",
          toolCallId: "read",
          toolName: "get_pantry",
          output: pantryPage,
        };
      }
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  await act(async () => {
    await result.current.send("Suggest recipes");
  });
  await act(async () => {
    await result.current.send("More about what is in my pantry");
  });
  expect(result.current.messages[3]?.content).toContain("Eggs: 6 pcs");
  expect(result.current.messages[3]?.recipeStatus).toBeUndefined();
  expect(result.current.messages[3]?.error).toBeUndefined();
});

it("keeps the last valid pantry page when page metadata changes", async () => {
  const { result } = await renderHook(() =>
    useCookingAgentChat(
      eventAgent([
        {
          type: "tool-result",
          toolCallId: "first",
          toolName: "get_pantry",
          output: { ...pantryPage, totalCount: 2, truncated: true },
        },
        {
          type: "tool-result",
          toolCallId: "second",
          toolName: "get_pantry",
          output: { ...pantryPage, totalCount: 3, offset: 1, truncated: true },
        },
      ])
    )
  );
  await act(async () => {
    await result.current.send("Show my pantry");
  });
  expect(result.current.messages[1]?.content).toContain("Eggs: 6 pcs");
  expect(result.current.messages[1]?.error).toBe(PANTRY_READ_ERROR);
});

it("waits for ingredient clarification without treating later planned reads as failed", async () => {
  const { result } = await renderHook(() =>
    useCookingAgentChat(
      eventAgent([
        {
          type: "request-plan",
          plan: {
            status: "ready",
            resumePending: false,
            steps: [
              { id: "add", intent: "add_ingredient", request: "Add vegetables" },
              { id: "read", intent: "describe_pantry", request: "Show pantry" },
            ],
          },
        },
        {
          type: "tool-result",
          toolCallId: "add",
          toolName: "manage_ingredients",
          output: { ok: false, status: "needs_clarification", question: "Which vegetables?" },
        },
        { type: "finish", text: "" },
      ])
    )
  );
  await act(async () => {
    await result.current.send("Add vegetables then show pantry");
  });
  expect(result.current.messages[1]?.content).toBe("Which vegetables?");
  expect(result.current.messages[1]?.error).toBeUndefined();
});

it("keeps diet analysis text alongside a later recipe result", async () => {
  const { result } = await renderHook(() =>
    useCookingAgentChat(
      eventAgent([
        {
          type: "request-step",
          step: { id: "diet", intent: "analyze_diet", request: "Analyze diet" },
        },
        { type: "tool-result", toolCallId: "diet", toolName: "analyze_diet", output: {} },
        { type: "text-delta", text: "Milk matches your saved allergen." },
        {
          type: "request-step",
          step: { id: "recipes", intent: "suggest_recipes", request: "Suggest recipes" },
        },
        {
          type: "tool-result",
          toolCallId: "recipes",
          toolName: "suggest_recipes",
          output: verifiedRecipeOutput,
        },
        { type: "text-delta", text: "Invented recipe prose" },
      ])
    )
  );
  await act(async () => {
    await result.current.send("Analyze my diet then suggest recipes");
  });
  expect(result.current.messages[1]?.content).toBe("Milk matches your saved allergen.");
  expect(result.current.messages[1]?.recipeSuggestions).toEqual(verifiedRecipeOutput);
});

it("treats a second planned pantry read as a new result after a write", async () => {
  const { result } = await renderHook(() =>
    useCookingAgentChat(
      eventAgent([
        {
          type: "request-step",
          step: { id: "before", intent: "describe_pantry", request: "Show pantry" },
        },
        {
          type: "tool-result",
          toolCallId: "before",
          toolName: "get_pantry",
          output: { items: [], totalCount: 0, offset: 0, truncated: false },
        },
        {
          type: "request-step",
          step: { id: "add", intent: "add_ingredient", request: "Add eggs" },
        },
        { type: "text-delta", text: "Added eggs." },
        {
          type: "request-step",
          step: { id: "after", intent: "describe_pantry", request: "Show pantry again" },
        },
        { type: "tool-result", toolCallId: "after", toolName: "get_pantry", output: pantryPage },
      ])
    )
  );
  await act(async () => {
    await result.current.send("Show pantry, add eggs, show pantry again");
  });
  expect(result.current.messages[1]?.content).toContain("Your pantry is empty.");
  expect(result.current.messages[1]?.content).toContain("Added eggs.");
  expect(result.current.messages[1]?.content).toContain("Eggs: 6 pcs");
  expect(result.current.messages[1]?.error).toBeUndefined();
});

it("retains confirmed read results when a later action fails", async () => {
  const { result } = await renderHook(() =>
    useCookingAgentChat(
      eventAgent([
        {
          type: "request-step",
          step: { id: "read", intent: "describe_pantry", request: "Show pantry" },
        },
        { type: "tool-result", toolCallId: "read", toolName: "get_pantry", output: pantryPage },
        {
          type: "request-step",
          step: { id: "add", intent: "add_ingredient", request: "Add milk" },
        },
        {
          type: "request-message",
          message: "I couldn't complete the requested action. Please try again.",
        },
      ])
    )
  );
  await act(async () => {
    await result.current.send("Show pantry then add milk");
  });
  expect(result.current.messages[1]?.content).toContain("Eggs: 6 pcs");
  expect(result.current.messages[1]?.content).toContain("couldn't complete");
  expect(result.current.messages[1]?.activities).toEqual(["Read pantry"]);
});

it.each(["event", "throw"] as const)(
  "reports a later step's %s failure beside completed recipes",
  async (mode) => {
    const agent: CookingAgent = {
      kind: "nebius",
      async *stream() {
        yield {
          type: "request-step",
          step: { id: "recipes", intent: "suggest_recipes", request: "Suggest recipes" },
        };
        yield {
          type: "tool-result",
          toolCallId: "recipes",
          toolName: "suggest_recipes",
          output: verifiedRecipeOutput,
        };
        yield {
          type: "request-step",
          step: { id: "add", intent: "add_ingredient", request: "Add eggs" },
        };
        if (mode === "throw") throw new Error("network request failed");
        yield { type: "error", message: "network request failed" };
      },
    };
    const { result } = await renderHook(() => useCookingAgentChat(agent));
    await act(async () => {
      await result.current.send("Suggest recipes then add eggs");
    });
    expect(result.current.messages[1]?.recipeSuggestions).toEqual(verifiedRecipeOutput);
    expect(result.current.messages[1]?.error).toBe(
      "Unable to connect. Check your connection and try again."
    );
  }
);

it("retains completed recipe cards when a later ingredient needs clarification", async () => {
  const { result } = await renderHook(() =>
    useCookingAgentChat(
      eventAgent([
        {
          type: "request-step",
          step: { id: "recipes", intent: "suggest_recipes", request: "Suggest recipes" },
        },
        {
          type: "tool-result",
          toolCallId: "recipes",
          toolName: "suggest_recipes",
          output: verifiedRecipeOutput,
        },
        {
          type: "request-step",
          step: { id: "add", intent: "add_ingredient", request: "Add vegetables" },
        },
        {
          type: "tool-result",
          toolCallId: "add",
          toolName: "manage_ingredients",
          output: { ok: false, status: "needs_clarification", question: "Which vegetables?" },
        },
      ])
    )
  );
  await act(async () => {
    await result.current.send("Suggest recipes then add vegetables");
  });
  expect(result.current.messages[1]?.recipeSuggestions).toEqual(verifiedRecipeOutput);
  expect(result.current.messages[1]?.content).toBe("Which vegetables?");
});

it("retains execution order when the model chooses numeric step IDs", async () => {
  const { result } = await renderHook(() =>
    useCookingAgentChat(
      eventAgent([
        {
          type: "request-step",
          step: { id: "2", intent: "analyze_diet", request: "Analyze diet" },
        },
        { type: "text-delta", text: "First result" },
        {
          type: "request-step",
          step: { id: "1", intent: "suggest_meal_plan", request: "Suggest meals" },
        },
        { type: "text-delta", text: "Second result" },
      ])
    )
  );
  await act(async () => {
    await result.current.send("Analyze diet then plan meals");
  });
  expect(result.current.messages[1]?.content).toBe("First result\n\nSecond result");
});

it("clears an interrupted write's pending authorization and retains its uncertainty in history", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requests: AgentTurnInput[] = [];
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream(input) {
      requests.push(input);
      if (requests.length > 1) return;
      yield { type: "request-context", context: pendingRequest };
      yield {
        type: "tool-call",
        toolCallId: "write",
        toolName: "manage_ingredients",
        input: { action: "add", name: "carrots" },
      };
      await blocked;
      yield { type: "request-context", context: pendingRequest };
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  let sent!: Promise<void>;
  try {
    await act(async () => {
      sent = result.current.send("Add carrots");
    });
    await act(async () => {
      result.current.stop();
      await sent;
    });
    await act(async () => {
      await result.current.send("Try again");
    });
    expect(requests[1]?.pendingRequest).toBeUndefined();
    expect(
      requests[1]?.messages.some((message) =>
        message.content.includes("A pantry update may still finish")
      )
    ).toBe(true);
  } finally {
    await act(async () => {
      release();
      await sent;
    });
  }
});

it("attributes a later write failure to that write while retaining earlier pantry rows", async () => {
  const agent: CookingAgent = {
    kind: "nebius",
    async *stream() {
      yield {
        type: "request-step",
        step: { id: "read", intent: "describe_pantry", request: "Read pantry" },
      };
      yield { type: "tool-result", toolCallId: "read", toolName: "get_pantry", output: pantryPage };
      yield {
        type: "request-step",
        step: { id: "write", intent: "add_ingredient", request: "Add milk" },
      };
      throw new Error("network request failed");
    },
  };
  const { result } = await renderHook(() => useCookingAgentChat(agent));
  await act(async () => {
    await result.current.send("Read pantry then add milk");
  });
  expect(result.current.messages[1]?.content).toContain("Eggs: 6 pcs");
  expect(result.current.messages[1]?.error).toBe(
    "Unable to connect. Check your connection and try again."
  );
});

it.each(["read", "recipes"] as const)(
  "retains write uncertainty beside earlier %s results in follow-up history",
  async (earlier) => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requests: AgentTurnInput[] = [];
    const agent: CookingAgent = {
      kind: "nebius",
      async *stream(input) {
        requests.push(input);
        if (requests.length > 1) return;
        if (earlier === "read") {
          yield {
            type: "request-step",
            step: { id: "read", intent: "describe_pantry", request: "Read pantry" },
          };
          yield {
            type: "tool-result",
            toolCallId: "read",
            toolName: "get_pantry",
            output: pantryPage,
          };
        } else {
          yield {
            type: "request-step",
            step: { id: "recipes", intent: "suggest_recipes", request: "Suggest recipes" },
          };
          yield {
            type: "tool-result",
            toolCallId: "recipes",
            toolName: "suggest_recipes",
            output: verifiedRecipeOutput,
          };
        }
        yield { type: "request-context", context: pendingRequest };
        yield {
          type: "request-step",
          step: { id: "add", intent: "add_ingredient", request: "Add carrots" },
        };
        yield {
          type: "tool-call",
          toolCallId: "write",
          toolName: "manage_ingredients",
          input: { action: "add", name: "carrots" },
        };
        await blocked;
      },
    };
    const { result } = await renderHook(() => useCookingAgentChat(agent));
    let sent!: Promise<void>;
    try {
      await act(async () => {
        sent = result.current.send("Inspect my food then add carrots");
      });
      await act(async () => {
        result.current.stop();
        await sent;
      });
      await act(async () => {
        await result.current.send("Try again");
      });
      expect(requests[1]?.pendingRequest).toBeUndefined();
      const reply = requests[1]?.messages.find((message) => message.role === "assistant");
      expect(reply?.content).toContain("A pantry update may still finish");
      expect(reply?.content).toContain(earlier === "read" ? "Eggs" : "Catalog omelette");
    } finally {
      await act(async () => {
        release();
        await sent;
      });
    }
  }
);
