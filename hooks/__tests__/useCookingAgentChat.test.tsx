import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useCookingAgentChat } from "../useCookingAgentChat";
import type { CookingAgent } from "~/lib/agent/types";

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
