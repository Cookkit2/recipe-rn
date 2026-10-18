import { COOKING_ASSISTANT_INSTRUCTIONS } from "./instructions";
import {
  describeMissingNebiusConfig,
  readNebiusAgentConfig,
  type NebiusAgentConfig,
} from "./nebius-config";
import { assertCookingAgentRuntime, resolveStreamingFetch } from "./runtime";
import { mapProviderStream, type ProviderStreamPart } from "./stream-events";
import type { AgentEvent, AgentTurnInput, CookingAgent } from "./types";
import type { CookingDataClient } from "./tools/planning";

export interface NebiusCookingAgentOptions {
  data: CookingDataClient;
  config?: NebiusAgentConfig;
  fetch?: typeof globalThis.fetch;
  /**
   * Test seam. When set, the agent maps this stream and does not call Nebius.
   * Production turns use `streamText` against the OpenAI-compatible endpoint.
   */
  streamTurn?: (input: AgentTurnInput) => AsyncIterable<ProviderStreamPart>;
}

export class NebiusCookingAgent implements CookingAgent {
  readonly kind = "nebius" as const;

  constructor(private readonly options: NebiusCookingAgentOptions) {}

  stream(input: AgentTurnInput): AsyncIterable<AgentEvent> {
    return this.run(input);
  }

  private async *run(input: AgentTurnInput): AsyncIterable<AgentEvent> {
    try {
      const source = this.options.streamTurn
        ? this.options.streamTurn(input)
        : this.streamFromNebius(input);
      yield* mapProviderStream(source);
    } catch (error) {
      yield {
        type: "error",
        message: error instanceof Error ? error.message : "The cooking assistant failed.",
      };
    }
  }

  private async *streamFromNebius(input: AgentTurnInput): AsyncIterable<ProviderStreamPart> {
    assertCookingAgentRuntime();
    const config = this.options.config ?? readNebiusAgentConfig();
    const missing = describeMissingNebiusConfig(config);
    if (missing) throw new Error(missing);

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
      fetch: await resolveStreamingFetch(this.options.fetch),
    });
    const result = streamText({
      model: provider.chatModel(config.model),
      instructions: COOKING_ASSISTANT_INSTRUCTIONS,
      messages: input.messages
        .filter((message) => message.content.trim().length > 0)
        .map((message) => ({ role: message.role, content: message.content })),
      tools: createCookingTools(this.options.data),
      stopWhen: isStepCount(5),
      abortSignal: input.signal,
    });

    for await (const part of result.stream) {
      yield part as ProviderStreamPart;
    }
  }
}
