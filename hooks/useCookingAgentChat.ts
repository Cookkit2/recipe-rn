import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, AgentTextMessage, CookingAgent } from "~/lib/agent/types";
import { assistantErrorMessage, PANTRY_UPDATE_UNCERTAIN_MESSAGE } from "~/lib/agent/errors";

import {
  RECIPE_LOOKUP_ERROR,
  recipeSuggestionsSchema,
  requestsRecipeSuggestions,
  type RecipeSuggestionsResult,
} from "~/lib/agent/recipe-suggestions";

export interface CookingChatMessage extends AgentTextMessage {
  activities: string[];
  error?: string;
  pantryError?: string;
  recipeStatus?: "pending" | "complete" | "failed";
  recipeSuggestions?: RecipeSuggestionsResult;
}

export type CookingChatStatus = "idle" | "streaming";

const TOOL_LABELS: Record<string, string> = {
  manage_ingredients: "Updated pantry",
  analyze_diet: "Checked diet",
  suggest_meal_plan: "Suggested meals",
  suggest_recipes: "Matched recipes",
};

const REQUEST_TIMEOUT_MS = 45_000;
const TOOL_PROGRESS_LABELS: Record<string, string> = {
  manage_ingredients: "Updating pantry…",
  analyze_diet: "Checking diet…",
  suggest_meal_plan: "Planning meals…",
  suggest_recipes: "Finding recipes…",
};
const PROGRESS_LABELS = new Set(Object.values(TOOL_PROGRESS_LABELS));

function clearProgress(message: CookingChatMessage): CookingChatMessage {
  return {
    ...message,
    activities: message.activities.filter((activity) => !PROGRESS_LABELS.has(activity)),
  };
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyEvent(message: CookingChatMessage, event: AgentEvent): CookingChatMessage {
  switch (event.type) {
    case "text-delta":
      return message.recipeStatus ? message : { ...message, content: message.content + event.text };
    case "tool-result": {
      const activities = message.activities.filter(
        (activity) => activity !== TOOL_PROGRESS_LABELS[event.toolName]
      );
      if (event.toolName === "suggest_recipes") {
        const result = recipeSuggestionsSchema.safeParse(event.output);
        if (!result.success)
          return {
            ...message,
            content: "",
            activities,
            recipeStatus: "failed",
            recipeSuggestions: undefined,
            error: RECIPE_LOOKUP_ERROR,
          };
        return {
          ...message,
          content: "",
          activities: [...activities, TOOL_LABELS.suggest_recipes!],
          recipeStatus: "complete",
          recipeSuggestions: result.data,
          error: message.pantryError,
        };
      }
      const output = event.output;
      if (output && typeof output === "object" && "ok" in output && output.ok === false) {
        return {
          ...message,
          activities,
          error: assistantErrorMessage("error" in output ? output.error : undefined),
          ...(event.toolName === "manage_ingredients"
            ? { pantryError: assistantErrorMessage("error" in output ? output.error : undefined) }
            : {}),
        };
      }
      return {
        ...message,
        activities: [...activities, TOOL_LABELS[event.toolName] ?? event.toolName],
      };
    }
    case "tool-error":
      if (event.toolName === "suggest_recipes") {
        return {
          ...clearProgress(message),
          content: "",
          recipeStatus: "failed",
          recipeSuggestions: undefined,
          error: RECIPE_LOOKUP_ERROR,
        };
      }
      return {
        ...clearProgress(message),
        error: assistantErrorMessage(event.error),
        ...(event.toolName === "manage_ingredients"
          ? { pantryError: assistantErrorMessage(event.error) }
          : {}),
      };
    case "error":
      if (message.recipeStatus === "complete") return clearProgress(message);
      return {
        ...clearProgress(message),
        error: message.recipeStatus ? RECIPE_LOOKUP_ERROR : assistantErrorMessage(event.message),
      };
    case "tool-call": {
      if (event.toolName === "suggest_recipes") {
        return {
          ...message,
          content: "",
          recipeStatus: "pending",
          recipeSuggestions: undefined,
          activities: [...message.activities, TOOL_PROGRESS_LABELS.suggest_recipes!],
        };
      }
      const progress = TOOL_PROGRESS_LABELS[event.toolName];
      return progress ? { ...message, activities: [...message.activities, progress] } : message;
    }
    case "finish":
      return clearProgress(message);
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

  useEffect(() => () => abortRef.current?.abort(), []);

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
      if (requestsRecipeSuggestions(history)) assistantMessage.recipeStatus = "pending";
      setMessages([...history, assistantMessage]);
      setStatus("streaming");

      const controller = new AbortController();
      abortRef.current = controller;
      let timedOut = false;
      let onAbort!: () => void;
      const interrupted = new Promise<void>((resolve) => {
        onAbort = resolve;
        controller.signal.addEventListener("abort", onAbort, { once: true });
      });
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      const pendingPantryUpdates = new Set<string>();
      const consume = async () => {
        for await (const event of agent.stream({ messages: history, signal: controller.signal })) {
          // Some data operations cannot be aborted. Never apply their late results.
          if (controller.signal.aborted) break;
          if (event.type === "tool-call" && event.toolName === "manage_ingredients") {
            pendingPantryUpdates.add(event.toolCallId);
          } else if (event.type === "tool-result" || event.type === "tool-error") {
            pendingPantryUpdates.delete(event.toolCallId);
          }
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id ? applyEvent(message, event) : message
            )
          );
        }
      };
      try {
        // Release the UI even if an SDK/tool ignores the abort signal.
        await Promise.race([consume(), interrupted]);
        if (controller.signal.aborted && pendingPantryUpdates.size > 0) {
          throw new Error(PANTRY_UPDATE_UNCERTAIN_MESSAGE);
        }
        if (timedOut) throw new Error("Assistant request timed out");
      } catch (error) {
        const uncertainUpdate = controller.signal.aborted && pendingPantryUpdates.size > 0;
        if (controller.signal.aborted && !timedOut && !uncertainUpdate) return;
        const message = assistantErrorMessage(
          uncertainUpdate
            ? PANTRY_UPDATE_UNCERTAIN_MESSAGE
            : timedOut
              ? "Assistant request timed out"
              : error
        );
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantMessage.id && (item.recipeStatus !== "complete" || uncertainUpdate)
              ? { ...item, error: message, ...(uncertainUpdate ? { pantryError: message } : {}) }
              : item
          )
        );
      } finally {
        clearTimeout(timer);
        controller.signal.removeEventListener("abort", onAbort);
        abortRef.current = null;
        setMessages((current) =>
          current.map((item) => {
            if (item.id !== assistantMessage.id) return item;
            const settled = clearProgress(item);
            if (item.recipeStatus !== "pending") return settled;
            const stopped = controller.signal.aborted && !timedOut && !item.error;
            return {
              ...settled,
              content: stopped ? "Recipe search stopped." : "",
              recipeStatus: "failed" as const,
              error: stopped ? undefined : (item.error ?? RECIPE_LOOKUP_ERROR),
            };
          })
        );
        setStatus("idle");
      }
    },
    [agent]
  );

  return { messages, status, send, stop };
}
