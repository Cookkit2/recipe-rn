import { useCallback, useRef, useState } from "react";
import type { AgentEvent, AgentTextMessage, CookingAgent } from "~/lib/agent/types";
import { assistantErrorMessage } from "~/lib/agent/errors";

export interface CookingChatMessage extends AgentTextMessage {
  activities: string[];
  error?: string;
}

export type CookingChatStatus = "idle" | "streaming";

const TOOL_LABELS: Record<string, string> = {
  manage_ingredients: "Updated pantry",
  analyze_diet: "Checked diet",
  suggest_meal_plan: "Suggested meals",
  suggest_recipes: "Matched recipes",
};

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyEvent(message: CookingChatMessage, event: AgentEvent): CookingChatMessage {
  switch (event.type) {
    case "text-delta":
      return { ...message, content: message.content + event.text };
    case "tool-result":
      return {
        ...message,
        activities: [...message.activities, TOOL_LABELS[event.toolName] ?? event.toolName],
      };
    case "tool-error":
      return { ...message, error: assistantErrorMessage(event.error) };
    case "error":
      return { ...message, error: assistantErrorMessage(event.message) };
    case "tool-call":
    case "finish":
      return message;
    default: {
      const unknownEvent: never = event;
      return unknownEvent;
    }
  }
}

export function useCookingAgentChat(agent: CookingAgent) {
  const [messages, setMessages] = useState<CookingChatMessage[]>([]);
  const [status, setStatus] = useState<CookingChatStatus>("idle");
  const messagesRef = useRef(messages);
  const abortRef = useRef<AbortController | null>(null);
  messagesRef.current = messages;

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || abortRef.current) return;

      const userMessage: CookingChatMessage = {
        id: createId(),
        role: "user",
        content: trimmed,
        activities: [],
      };
      const assistantMessage: CookingChatMessage = {
        id: createId(),
        role: "assistant",
        content: "",
        activities: [],
      };
      const history = [...messagesRef.current, userMessage];
      setMessages([...history, assistantMessage]);
      setStatus("streaming");

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        for await (const event of agent.stream({
          messages: history,
          signal: controller.signal,
        })) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id ? applyEvent(message, event) : message
            )
          );
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = assistantErrorMessage(error);
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantMessage.id ? { ...item, error: message } : item
          )
        );
      } finally {
        abortRef.current = null;
        setStatus("idle");
      }
    },
    [agent]
  );

  return { messages, status, send, stop };
}
