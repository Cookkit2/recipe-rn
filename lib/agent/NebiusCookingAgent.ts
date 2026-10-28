import { ASSISTANT_ROUTER_PHASE, buildAssistantStepInstructions } from "./instructions";
import { assistantErrorMessage } from "./errors";
import {
  describeMissingNebiusConfig,
  readNebiusAgentConfig,
  type NebiusAgentConfig,
} from "./nebius-config";
import { assertCookingAgentRuntime, resolveStreamingFetch } from "./runtime";
import { mapProviderStream, type ProviderStreamPart } from "./stream-events";
import {
  routeAssistantRequest,
  intentToolName,
  intentMutationAction,
  type AssistantPendingRequest,
} from "./request-routing";
import {
  pantryReadResultSchema,
  formatPantryReadPages,
  PANTRY_READ_ERROR,
  type PantryReadResult,
} from "./pantry-read";
import type { AssistantPantryInput, PantryCandidate } from "~/types/AssistantPantryMutation";
import {
  AgentUnavailableError,
  type AgentEvent,
  type AgentTurnInput,
  type CookingAgent,
} from "./types";
import type { CookingDataClient } from "./tools/planning";

export interface NebiusCookingAgentOptions {
  data: CookingDataClient;
  config?: NebiusAgentConfig;
  fetch?: typeof globalThis.fetch;
  /** Protocol mapping seam only; production always routes before executing tools. */
  streamTurn?: (input: AgentTurnInput) => AsyncIterable<ProviderStreamPart>;
}

function isProblem(
  output: unknown
): output is { ok: false; status?: string; question?: string; candidates?: PantryCandidate[] } {
  return Boolean(output && typeof output === "object" && "ok" in output && output.ok === false);
}

function mutationReply(output: unknown): string {
  if (!output || typeof output !== "object") return "Updated your pantry.";
  if ("removed" in output && Array.isArray(output.removed))
    return `Removed ${output.removed.length} pantry ${output.removed.length === 1 ? "entry" : "entries"}.`;
  if ("item" in output && output.item && typeof output.item === "object" && "name" in output.item) {
    const item = output.item as { name: string; quantity?: number | null; unit?: string | null };
    const verb = "status" in output && output.status === "added" ? "Added" : "Updated";
    return `${verb} ${item.name}.${item.quantity != null ? ` Pantry total: ${item.quantity}${item.unit ? ` ${item.unit}` : ""}.` : ""}`;
  }
  return "Updated your pantry.";
}

export class NebiusCookingAgent implements CookingAgent {
  readonly kind = "nebius" as const;
  constructor(private readonly options: NebiusCookingAgentOptions) {}
  stream(input: AgentTurnInput): AsyncIterable<AgentEvent> {
    return this.run(input);
  }

  private async *run(input: AgentTurnInput): AsyncIterable<AgentEvent> {
    try {
      if (this.options.streamTurn) yield* mapProviderStream(this.options.streamTurn(input));
      else yield* this.executeRequest(input);
    } catch (error) {
      if (!input.signal?.aborted) yield { type: "error", message: assistantErrorMessage(error) };
    }
  }

  private async *executeRequest(input: AgentTurnInput): AsyncIterable<AgentEvent> {
    assertCookingAgentRuntime();
    const config = this.options.config ?? (await readNebiusAgentConfig());
    input.signal?.throwIfAborted();
    const missing = describeMissingNebiusConfig(config);
    if (missing) throw new AgentUnavailableError(missing);

    const [{ createOpenAICompatible }, { isStepCount, streamText }, { createCookingTools }] =
      await Promise.all([
        import("@ai-sdk/openai-compatible"),
        import("ai"),
        import("./tools/definitions"),
      ]);
    const provider = createOpenAICompatible({
      name: "nebius",
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      headers: config.headers,
      fetch: await resolveStreamingFetch(this.options.fetch),
    });
    const model = provider.chatModel(config.model);
    const plan = await routeAssistantRequest(input, async (instructions, payload) => {
      const routing = streamText({
        model,
        instructions: `${instructions}\n${ASSISTANT_ROUTER_PHASE}`,
        messages: [{ role: "user", content: payload }],
        abortSignal: input.signal,
        onError: () => {},
      });
      return routing.text;
    });
    if (input.signal?.aborted) return;
    yield { type: "request-plan", plan };
    if (plan.status !== "ready") {
      const context =
        plan.status === "needs_clarification" && !plan.abandonPending && input.pendingRequest
          ? {
              ...input.pendingRequest,
              clarification: {
                question: plan.question,
                candidates: input.pendingRequest.clarification?.candidates,
              },
            }
          : null;
      yield { type: "request-context", context };
      const message = plan.status === "needs_clarification" ? plan.question : plan.message;
      yield { type: "request-message", message };
      yield { type: "finish", text: message };
      return;
    }

    let context: AssistantPendingRequest = {
      originalUserMessage:
        plan.resumePending && input.pendingRequest
          ? input.pendingRequest.originalUserMessage
          : (input.messages.at(-1)?.content ?? ""),
      remainingSteps: plan.steps,
      completedSteps: plan.resumePending ? [...(input.pendingRequest?.completedSteps ?? [])] : [],
      ...(plan.resumePending && input.pendingRequest?.suppliedInput
        ? { suppliedInput: input.pendingRequest.suppliedInput }
        : {}),
      ...(plan.resumePending && input.pendingRequest?.clarification
        ? { clarification: input.pendingRequest.clarification }
        : {}),
    };
    yield { type: "request-context", context };
    let finalText = "";
    for (const [index, step] of plan.steps.entries()) {
      if (input.signal?.aborted) return;
      yield { type: "request-step", step };
      const toolName = intentToolName(step.intent);
      const mutation = intentMutationAction(step.intent) !== undefined;
      let confirmed = false;
      let recorded = false;
      let blocked = false;
      let lastOutput: unknown;
      let lastReadTruncated = false;
      const readPages: PantryReadResult[] = [];
      let lastMutationInput: AssistantPantryInput | undefined;
      const tools = createCookingTools(this.options.data, {
        intent: step.intent,
        suppliedInput: index === 0 ? context.suppliedInput : undefined,
        completePantryRead: step.intent === "describe_pantry",
        onResult: (name, actualInput, output) => {
          if (isProblem(output)) blocked = true;
          else if (name === toolName) {
            confirmed = true;
            lastOutput = output;
            if (name === "get_pantry") {
              const page = pantryReadResultSchema.safeParse(output);
              if (!page.success) blocked = true;
              else {
                readPages.push(page.data);
                try {
                  formatPantryReadPages(readPages);
                } catch {
                  blocked = true;
                }
                lastReadTruncated = page.data.truncated;
              }
            }
          }
          if (name === "manage_ingredients" && !lastMutationInput)
            lastMutationInput = actualInput as AssistantPantryInput;
        },
        onError: () => {
          blocked = true;
        },
      });
      const stepPrompt = buildAssistantStepInstructions(step, context, index === 0);
      const result = streamText({
        model,
        instructions: stepPrompt,
        messages: input.messages
          .filter((message) => message.content.trim())
          .map(({ role, content }) => ({ role, content })),
        tools,
        activeTools: [toolName],
        // Lightning can emit invalid extra calls under forced tool selection.
        // Each step still exposes only its authorized tool and requires a confirmed result.
        toolChoice: "auto",
        stopWhen: [
          isStepCount(5),
          () =>
            blocked ||
            (confirmed && (mutation || (toolName === "get_pantry" && !lastReadTruncated))),
        ],
        abortSignal: input.signal,
        onError: () => {},
      });
      let stepText = "";
      let problem:
        | { ok: false; status?: string; question?: string; candidates?: PantryCandidate[] }
        | undefined;
      for await (const event of mapProviderStream(
        result.stream as AsyncIterable<ProviderStreamPart>
      )) {
        if (input.signal?.aborted) return;
        if (event.type === "finish") continue;
        if (event.type === "text-delta") {
          if (!mutation && toolName !== "get_pantry") {
            stepText += event.text;
            yield event;
          }
          continue;
        }
        if (event.type === "tool-result") {
          const output = event.output;
          if (isProblem(output)) {
            problem ??= output;
            yield event;
            continue;
          }
          if (
            (!blocked || mutation) &&
            event.toolName === toolName &&
            !recorded &&
            (toolName !== "get_pantry" || !pantryReadResultSchema.parse(output).truncated)
          ) {
            recorded = true;
            context = {
              originalUserMessage: context.originalUserMessage,
              remainingSteps: plan.steps.slice(index + 1),
              completedSteps: [...context.completedSteps, { ...step, output }],
            };
            yield { type: "request-context", context };
          }
        }
        yield event;
      }
      // Drain this tool batch before settling a failure: an earlier authorized
      // write may already have committed when a later call is rejected.
      if (problem) {
        context = {
          ...context,
          remainingSteps: plan.steps.slice(recorded ? index + 1 : index),
          ...(lastMutationInput &&
          !recorded &&
          lastMutationInput.action === intentMutationAction(step.intent)
            ? { suppliedInput: lastMutationInput }
            : {}),
          ...(problem.status === "needs_clarification" && problem.question
            ? { clarification: { question: problem.question, candidates: problem.candidates } }
            : {}),
        };
        yield { type: "request-context", context };
        if (problem.status !== "needs_clarification") {
          yield {
            type: "request-message",
            message:
              recorded && mutation
                ? `${mutationReply(lastOutput)} I stopped the remaining actions because another tool call was rejected.`
                : "I couldn't complete the requested action. Please try again.",
          };
        }
        yield { type: "finish", text: finalText };
        return;
      }
      if (blocked || !confirmed) {
        yield {
          type: "error",
          message:
            toolName === "get_pantry"
              ? PANTRY_READ_ERROR
              : "Something went wrong, please try again later",
        };
        yield { type: "finish", text: finalText };
        return;
      }
      // A capped read remains useful but partial; mark it complete only after the
      // page loop settles, so a failed later page remains retryable.
      if (!recorded) {
        context = {
          originalUserMessage: context.originalUserMessage,
          remainingSteps: plan.steps.slice(index + 1),
          completedSteps: [...context.completedSteps, { ...step, output: lastOutput }],
        };
        yield { type: "request-context", context };
      }
      if (mutation) {
        stepText = mutationReply(lastOutput);
        yield { type: "text-delta", text: `${finalText ? "\n\n" : ""}${stepText}` };
      }
      finalText += `${finalText && stepText ? "\n\n" : ""}${stepText}`;
    }
    yield { type: "request-context", context: null };
    yield { type: "finish", text: finalText, finishReason: "stop" };
  }
}
