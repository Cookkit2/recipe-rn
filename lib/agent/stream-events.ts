import type { AgentEvent } from "./types";

/** Subset of `streamText(...).stream` parts this agent forwards to the UI. */
export interface ProviderStreamPart {
  type: string;
  text?: unknown;
  delta?: unknown;
  toolCallId?: unknown;
  toolName?: unknown;
  input?: unknown;
  output?: unknown;
  error?: unknown;
  finishReason?: unknown;
}

function textOf(part: ProviderStreamPart): string {
  if (typeof part.text === "string") return part.text;
  if (typeof part.delta === "string") return part.delta;
  return "";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "The cooking assistant hit an unexpected error.";
}

export async function* mapProviderStream(
  source: AsyncIterable<ProviderStreamPart>
): AsyncIterable<AgentEvent> {
  let text = "";
  for await (const part of source) {
    switch (part.type) {
      case "text-delta": {
        const delta = textOf(part);
        if (!delta) break;
        text += delta;
        yield { type: "text-delta", text: delta };
        break;
      }
      case "tool-call":
        yield {
          type: "tool-call",
          toolCallId: String(part.toolCallId ?? ""),
          toolName: String(part.toolName ?? ""),
          input: part.input,
        };
        break;
      case "tool-result":
        yield {
          type: "tool-result",
          toolCallId: String(part.toolCallId ?? ""),
          toolName: String(part.toolName ?? ""),
          output: part.output,
        };
        break;
      case "tool-error":
        yield {
          type: "tool-error",
          toolCallId: String(part.toolCallId ?? ""),
          toolName: String(part.toolName ?? ""),
          error: errorMessage(part.error),
        };
        break;
      case "error":
        yield { type: "error", message: errorMessage(part.error) };
        break;
      case "finish":
        yield {
          type: "finish",
          text,
          ...(typeof part.finishReason === "string" ? { finishReason: part.finishReason } : {}),
        };
        break;
      default:
        break;
    }
  }
}
