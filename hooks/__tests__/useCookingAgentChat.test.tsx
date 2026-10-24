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
        output: { recipes: [] },
      };
      yield { type: "text-delta", text: "Tomato salad." };
      yield { type: "finish", text: "Tomato salad.", finishReason: "stop" };
    },
  };
}

it("appends streamed assistant text and a tool activity", async () => {
  const { result } = await renderHook(() => useCookingAgentChat(createScriptedAgent()));
  await act(async () => {
    await result.current.send("What can I cook?");
  });
  await waitFor(() => {
    expect(result.current.status).toBe("idle");
  });
  expect(result.current.messages.map((message) => message.content)).toEqual([
    "What can I cook?",
    "Tomato salad.",
  ]);
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
