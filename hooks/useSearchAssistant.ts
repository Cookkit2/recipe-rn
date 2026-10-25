import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCookingAgentChat } from "./useCookingAgentChat";
import type { CookingAgent } from "~/lib/agent/types";

/** Searching local data never initializes the model or sends an AI request. */
export function useSearchAssistant() {
  const queryClient = useQueryClient();
  const agent = useMemo<CookingAgent>(() => {
    let loaded: CookingAgent | undefined;
    return {
      kind: "nebius",
      async *stream(input) {
        if (!loaded) {
          const { createAppCookingAgent } = await import("~/lib/agent/create-app-agent");
          input.signal?.throwIfAborted();
          loaded = createAppCookingAgent(queryClient);
        }
        input.signal?.throwIfAborted();
        yield* loaded.stream(input);
      },
    };
  }, [queryClient]);
  return useCookingAgentChat(agent);
}
