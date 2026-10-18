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
