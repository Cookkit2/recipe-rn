/** Shared cooking-agent contract. Callers do not know which provider is speaking. */

export type AgentKind = "nebius" | "local";

export interface AgentTextMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type AgentEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; input: unknown }
  | { type: "tool-result"; toolCallId: string; toolName: string; output: unknown }
  | { type: "tool-error"; toolCallId: string; toolName: string; error: string }
  | { type: "finish"; text: string; finishReason?: string }
  | { type: "error"; message: string };

export interface AgentTurnInput {
  messages: readonly AgentTextMessage[];
  signal?: AbortSignal;
}

export interface CookingAgent {
  readonly kind: AgentKind;
  stream(input: AgentTurnInput): AsyncIterable<AgentEvent>;
}

export class AgentUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentUnavailableError";
  }
}
