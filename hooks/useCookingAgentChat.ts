import { stockIdsFromEvent } from "~/lib/agent/stock-id-display";
import type { PantryCandidate } from "~/types/AssistantPantryMutation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, AgentTextMessage, CookingAgent } from "~/lib/agent/types";
import { assistantErrorMessage, PANTRY_UPDATE_UNCERTAIN_MESSAGE } from "~/lib/agent/errors";
import type { AssistantPendingRequest, AssistantRequestStep } from "~/lib/agent/request-routing";
import {
  formatPantryReadPages,
  PANTRY_READ_ERROR,
  pantryReadResultSchema,
  type PantryReadResult,
} from "~/lib/agent/pantry-read";

import {
  RECIPE_LOOKUP_ERROR,
  recipeSuggestionsSchema,
  type RecipeSuggestionsResult,
} from "~/lib/agent/recipe-suggestions";

export interface CookingChatMessage extends AgentTextMessage {
  activities: string[];
  internalStockIds?: string[];
  error?: string;
  pantryError?: string;
  pantryClarification?: { question: string; candidates?: PantryCandidate[] };
  recipeStatus?: "pending" | "complete" | "failed";
  recipeSuggestions?: RecipeSuggestionsResult;
  pantryReadStatus?: "pending" | "complete" | "failed";
  pantryReadPages?: PantryReadResult[];
  requestMessage?: boolean;
  activeStep?: AssistantRequestStep;
  stepContents?: Record<string, string>;
  stepOrder?: string[];
}

export type CookingChatStatus = "idle" | "streaming";

const TOOL_LABELS: Record<string, string> = {
  manage_ingredients: "Updated pantry",
  get_pantry: "Read pantry",
  analyze_diet: "Checked diet",
  suggest_meal_plan: "Suggested meals",
  suggest_recipes: "Matched recipes",
};

const REQUEST_TIMEOUT_MS = 45_000;
const TOOL_PROGRESS_LABELS: Record<string, string> = {
  manage_ingredients: "Updating pantry…",
  get_pantry: "Reading pantry…",
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

/** Replace the active step's text while retaining verified earlier outcomes. */
function withStepContent(message: CookingChatMessage, content: string): CookingChatMessage {
  if (!message.activeStep) return { ...message, content };
  const stepContents = { ...message.stepContents, [message.activeStep.id]: content };
  return {
    ...message,
    stepContents,
    content: (message.stepOrder ?? Object.keys(stepContents))
      .map((id) => stepContents[id])
      .filter(Boolean)
      .join("\n\n"),
  };
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyEvent(message: CookingChatMessage, event: AgentEvent): CookingChatMessage {
  const ids = stockIdsFromEvent(event);
  if (ids.length)
    message = {
      ...message,
      internalStockIds: [...new Set([...(message.internalStockIds ?? []), ...ids])],
    };
  // Routing messages are complete, verified conversation responses.
  if (message.requestMessage && event.type !== "request-context") return clearProgress(message);
  switch (event.type) {
    case "request-context":
      return message;
    case "request-step": {
      const pantry = event.step.intent === "describe_pantry";
      const recipes = event.step.intent === "suggest_recipes";
      return {
        ...message,
        activeStep: event.step,
        stepContents: { ...message.stepContents, [event.step.id]: "" },
        stepOrder: [...(message.stepOrder ?? []), event.step.id],
        recipeStatus: recipes
          ? "pending"
          : message.recipeStatus === "complete"
            ? "complete"
            : undefined,
        pantryReadStatus: pantry
          ? "pending"
          : message.pantryReadStatus === "complete"
            ? "complete"
            : undefined,
        pantryReadPages: pantry ? undefined : message.pantryReadPages,
      };
    }
    case "request-plan": {
      if (event.plan.status !== "ready") return message;
      const recipes = event.plan.steps.some((step) => step.intent === "suggest_recipes");
      const pantry = event.plan.steps.some((step) => step.intent === "describe_pantry");
      return {
        ...message,
        content: recipes || pantry ? "" : message.content,
        recipeStatus: recipes ? "pending" : undefined,
        pantryReadStatus: pantry ? "pending" : undefined,
      };
    }
    case "request-message":
      return {
        ...withStepContent(message, event.message),
        activities: clearProgress(message).activities,
        error: undefined,
        pantryError: undefined,
        pantryClarification: undefined,
        recipeStatus: message.recipeStatus === "complete" ? "complete" : undefined,
        recipeSuggestions:
          message.recipeStatus === "complete" ? message.recipeSuggestions : undefined,
        pantryReadStatus: message.pantryReadPages?.length ? "complete" : undefined,
        requestMessage: true,
      };
    case "text-delta":
      if (message.activeStep) {
        return ["describe_pantry", "suggest_recipes"].includes(message.activeStep.intent) ||
          message.pantryClarification
          ? message
          : withStepContent(
              message,
              (message.stepContents?.[message.activeStep.id] ?? "") + event.text
            );
      }
      return message.recipeStatus || message.pantryClarification || message.pantryReadStatus
        ? message
        : { ...message, content: message.content + event.text };
    case "tool-result": {
      const activities = message.activities.filter(
        (activity) => activity !== TOOL_PROGRESS_LABELS[event.toolName]
      );
      if (event.toolName === "get_pantry") {
        const result = pantryReadResultSchema.safeParse(event.output);
        if (!result.success) {
          return {
            ...message,
            content: message.activeStep || message.pantryReadPages?.length ? message.content : "",
            activities,
            pantryReadStatus: "failed",
            error: PANTRY_READ_ERROR,
          };
        }
        const pages = [...(message.pantryReadPages ?? []), result.data];
        let content: string;
        try {
          content = formatPantryReadPages(pages);
        } catch {
          return {
            ...clearProgress(message),
            pantryReadStatus: "failed",
            error: PANTRY_READ_ERROR,
          };
        }
        return {
          ...withStepContent(message, content),
          activities: activities.includes(TOOL_LABELS.get_pantry!)
            ? activities
            : [...activities, TOOL_LABELS.get_pantry!],
          pantryReadStatus: "complete",
          pantryReadPages: pages,
          error: message.pantryError,
        };
      }
      if (event.toolName === "suggest_recipes") {
        if (message.pantryClarification) return { ...message, activities };
        const result = recipeSuggestionsSchema.safeParse(event.output);
        if (!result.success)
          return {
            ...message,
            content: message.activeStep || message.pantryReadPages?.length ? message.content : "",
            activities,
            recipeStatus: "failed",
            recipeSuggestions: undefined,
            error: RECIPE_LOOKUP_ERROR,
          };
        return {
          ...message,
          content: message.activeStep || message.pantryReadPages?.length ? message.content : "",
          activities: [...activities, TOOL_LABELS.suggest_recipes!],
          recipeStatus: "complete",
          recipeSuggestions: result.data,
          error: message.pantryError,
        };
      }
      const output = event.output;
      if (
        event.toolName === "manage_ingredients" &&
        output &&
        typeof output === "object" &&
        "ok" in output &&
        output.ok === false &&
        "status" in output &&
        output.status === "needs_clarification" &&
        "question" in output &&
        typeof output.question === "string"
      ) {
        const candidates =
          "candidates" in output && Array.isArray(output.candidates)
            ? (output.candidates as PantryCandidate[])
            : undefined;
        return {
          ...withStepContent(
            message,
            [
              output.question,
              ...(candidates ?? []).map(
                (candidate, index) =>
                  `Entry ${index + 1}: ${candidate.name}, ${candidate.quantity} ${candidate.unit}${candidate.storageType ? `, ${candidate.storageType}` : ""}${candidate.expiryDate ? `, expires ${candidate.expiryDate.slice(0, 10)}` : ""}`
              ),
            ].join("\n")
          ),
          activities,
          pantryClarification: { question: output.question, candidates },
          pantryReadStatus: message.pantryReadPages?.length ? "complete" : undefined,
          recipeStatus: message.recipeStatus === "complete" ? "complete" : undefined,
          recipeSuggestions:
            message.recipeStatus === "complete" ? message.recipeSuggestions : undefined,
          error: undefined,
          pantryError: undefined,
        };
      }
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
      const pantryStatus =
        event.toolName === "manage_ingredients" &&
        output &&
        typeof output === "object" &&
        "ok" in output &&
        output.ok === true &&
        "status" in output
          ? output.status
          : undefined;
      const label =
        pantryStatus === "added"
          ? "Added to pantry"
          : pantryStatus === "removed"
            ? "Removed from pantry"
            : (TOOL_LABELS[event.toolName] ?? event.toolName);
      return {
        ...message,
        activities: [...activities, label],
      };
    }
    case "tool-error":
      if (event.toolName === "get_pantry") {
        return {
          ...clearProgress(message),
          content: message.activeStep || message.pantryReadPages?.length ? message.content : "",
          pantryReadStatus: "failed",
          error: PANTRY_READ_ERROR,
        };
      }
      if (message.pantryClarification && event.toolName === "suggest_recipes") return message;
      if (event.toolName === "suggest_recipes") {
        return {
          ...clearProgress(message),
          content: message.activeStep || message.pantryReadPages?.length ? message.content : "",
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
      if (message.pantryReadStatus === "pending" || message.pantryReadStatus === "failed") {
        return { ...clearProgress(message), error: PANTRY_READ_ERROR };
      }
      if (
        message.recipeStatus === "complete" &&
        (!message.activeStep || message.activeStep.intent === "suggest_recipes")
      )
        return clearProgress(message);
      return {
        ...clearProgress(message),
        error:
          message.recipeStatus &&
          (!message.activeStep || message.activeStep.intent === "suggest_recipes")
            ? RECIPE_LOOKUP_ERROR
            : assistantErrorMessage(event.message),
      };
    case "tool-call": {
      if (event.toolName === "get_pantry") {
        return {
          ...message,
          content: message.activeStep || message.pantryReadPages?.length ? message.content : "",
          pantryReadStatus: "pending",
          activities: [...message.activities, TOOL_PROGRESS_LABELS.get_pantry!],
        };
      }
      if (message.pantryClarification && event.toolName === "suggest_recipes") return message;
      if (event.toolName === "suggest_recipes") {
        return {
          ...message,
          content: message.activeStep || message.pantryReadPages?.length ? message.content : "",
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
  const pendingRequestRef = useRef<AssistantPendingRequest | undefined>(undefined);
  const updateMessages = useCallback(
    (update: (current: CookingChatMessage[]) => CookingChatMessage[]) => {
      // A follow-up may start before React commits the previous turn's state.
      messagesRef.current = update(messagesRef.current);
      setMessages(messagesRef.current);
    },
    []
  );

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
      assistantMessage.internalStockIds = [
        ...new Set(history.flatMap((message) => message.internalStockIds ?? [])),
      ];
      updateMessages(() => [...history, assistantMessage]);
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
        for await (const event of agent.stream({
          messages: history.map(
            ({
              id,
              role,
              content,
              error,
              pantryError,
              recipeSuggestions,
              pantryClarification,
              pantryReadPages,
            }) => ({
              id,
              role,
              // Keep failures beside confirmed results; an interrupted write may
              // still commit and must not look like an ordinary retryable request.
              content:
                pantryError || error
                  ? JSON.stringify({
                      content,
                      error: pantryError ?? error,
                      pantryClarification,
                      pantry: pantryReadPages,
                      recipeSuggestions,
                    })
                  : pantryClarification
                    ? JSON.stringify(pantryClarification)
                    : recipeSuggestions && (pantryReadPages?.length || content)
                      ? JSON.stringify({ pantry: pantryReadPages, content, recipeSuggestions })
                      : recipeSuggestions
                        ? JSON.stringify(recipeSuggestions)
                        : content,
            })
          ),
          signal: controller.signal,
          pendingRequest: pendingRequestRef.current,
        })) {
          // Some data operations cannot be aborted. Never apply their late results.
          if (controller.signal.aborted) break;
          if (event.type === "request-context") {
            // Keep the exact provider context, including completed steps and row IDs.
            pendingRequestRef.current = event.context ?? undefined;
          }
          if (event.type === "tool-call" && event.toolName === "manage_ingredients") {
            pendingPantryUpdates.add(event.toolCallId);
          } else if (event.type === "tool-result" || event.type === "tool-error") {
            pendingPantryUpdates.delete(event.toolCallId);
          }
          updateMessages((current) =>
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
        if (uncertainUpdate) pendingRequestRef.current = undefined;
        if (controller.signal.aborted && !timedOut && !uncertainUpdate) return;
        const message = assistantErrorMessage(
          uncertainUpdate
            ? PANTRY_UPDATE_UNCERTAIN_MESSAGE
            : timedOut
              ? "Assistant request timed out"
              : error
        );
        updateMessages((current) =>
          current.map((item) =>
            item.id === assistantMessage.id &&
            (item.recipeStatus !== "complete" ||
              uncertainUpdate ||
              (item.activeStep && item.activeStep.intent !== "suggest_recipes"))
              ? {
                  ...item,
                  error:
                    !uncertainUpdate &&
                    !timedOut &&
                    item.pantryReadStatus &&
                    (!item.activeStep || item.activeStep.intent === "describe_pantry")
                      ? PANTRY_READ_ERROR
                      : message,
                  ...(uncertainUpdate ? { pantryError: message } : {}),
                }
              : item
          )
        );
      } finally {
        clearTimeout(timer);
        controller.signal.removeEventListener("abort", onAbort);
        abortRef.current = null;
        updateMessages((current) =>
          current.map((item) => {
            if (item.id !== assistantMessage.id) return item;
            const settled = clearProgress(item);
            if (item.pantryReadStatus === "pending" && !item.error && !controller.signal.aborted) {
              settled.pantryReadStatus = "failed";
              settled.error = PANTRY_READ_ERROR;
            }
            if (item.recipeStatus !== "pending") return settled;
            const stopped = controller.signal.aborted && !timedOut && !item.error;
            return {
              ...settled,
              content: item.pantryReadPages?.length
                ? item.content
                : stopped
                  ? "Recipe search stopped."
                  : "",
              recipeStatus: "failed" as const,
              error: stopped ? undefined : (item.error ?? RECIPE_LOOKUP_ERROR),
            };
          })
        );
        setStatus("idle");
      }
    },
    [agent, updateMessages]
  );

  return { messages, status, send, stop };
}
