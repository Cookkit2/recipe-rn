import { AgentUnavailableError, type AgentKind, type CookingAgent } from "./types";
import { NebiusCookingAgent, type NebiusCookingAgentOptions } from "./NebiusCookingAgent";

export interface CreateCookingAgentOptions extends Partial<NebiusCookingAgentOptions> {
  kind?: AgentKind;
}

/**
 * Picks the cooking agent implementation.
 * `local` is reserved for a future on-device model; nothing in the repo implements one today.
 */
export function createCookingAgent(options: CreateCookingAgentOptions = {}): CookingAgent {
  const kind = options.kind ?? "nebius";
  switch (kind) {
    case "nebius": {
      if (!options.data) {
        throw new AgentUnavailableError("The Nebius cooking agent needs a pantry data client.");
      }
      return new NebiusCookingAgent({
        data: options.data,
        ...(options.config ? { config: options.config } : {}),
        ...(options.fetch ? { fetch: options.fetch } : {}),
        ...(options.streamTurn ? { streamTurn: options.streamTurn } : {}),
      });
    }
    case "local":
      throw new AgentUnavailableError(
        "No on-device cooking agent is installed. A local provider can implement CookingAgent later."
      );
    default: {
      const unknownKind: never = kind;
      throw new AgentUnavailableError(`Unknown cooking agent: ${String(unknownKind)}`);
    }
  }
}
