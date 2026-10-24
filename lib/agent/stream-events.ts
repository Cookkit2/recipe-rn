import type { AgentEvent } from "./types";
import { assistantErrorMessage } from "./errors";

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

export async function* mapProviderStream(
  source: AsyncIterable<ProviderStreamPart>
): AsyncIterable<AgentEvent> {
  let text = "";
  let pending = "";
  let providerError: string | undefined;
  const marker = "[ERROR:";

  function* flush(): Generator<AgentEvent> {
    if (pending) {
      text += pending;
      yield { type: "text-delta", text: pending };
      pending = "";
    }
    if (providerError !== undefined) {
      yield { type: "error", message: assistantErrorMessage(providerError) };
      providerError = undefined;
    }
  }

  for await (const part of source) {
    switch (part.type) {
      case "text-delta": {
        const delta = textOf(part);
        if (!delta) break;
        if (providerError !== undefined) {
          providerError += delta;
          break;
        }
        pending += delta;
        const errorStart = pending.toUpperCase().indexOf(marker);
        if (errorStart >= 0) {
          providerError = pending.slice(errorStart);
          pending = pending.slice(0, errorStart);
        }
        // Retain a possible split error prefix so no internal details flash in the UI.
        let held = 0;
        for (let size = 1; size < marker.length && size <= pending.length; size++) {
          if (marker.startsWith(pending.slice(-size).toUpperCase())) held = size;
        }
        const ready = pending.slice(0, pending.length - held);
        pending = pending.slice(ready.length);
        if (ready) {
          text += ready;
          yield { type: "text-delta", text: ready };
        }
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
          error: assistantErrorMessage(part.error),
        };
        break;
      case "error":
        yield { type: "error", message: assistantErrorMessage(part.error) };
        break;
      case "finish":
        yield* flush();
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
  yield* flush();
}
