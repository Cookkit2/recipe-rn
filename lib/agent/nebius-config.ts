import { getAIProxyConnection } from "~/lib/ai/proxy-connection";
import { AgentUnavailableError } from "./types";
import { E2E_NEBIUS_API_KEY, E2E_NEBIUS_MODEL, e2eNebiusBaseURL } from "./testing/e2e-contract";

/** OpenAI-compatible gateway config. apiKey is a user JWT, never a provider key. */
export interface NebiusAgentConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  headers?: Record<string, string>;
}

/** Resolve a current guest/account session using the same auth as recipe imports. */
export async function readNebiusAgentConfig(
  env: Record<string, string | undefined> = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_E2E: process.env.EXPO_PUBLIC_E2E,
  }
): Promise<NebiusAgentConfig> {
  // The native Detox build talks only to the existing loopback fixture.
  if (env.EXPO_PUBLIC_E2E === "true") {
    return {
      apiKey: E2E_NEBIUS_API_KEY,
      model: E2E_NEBIUS_MODEL,
      baseURL: e2eNebiusBaseURL(),
    };
  }
  try {
    const project = new URL(env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "");
    if (
      project.protocol !== "https:" ||
      project.username ||
      project.password ||
      project.search ||
      project.hash ||
      !["", "/"].includes(project.pathname)
    )
      throw new Error("Invalid project URL");
    const { headers } = await getAIProxyConnection();
    const token = headers.Authorization?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token || !headers.apikey) throw new Error("Missing user session");
    return {
      apiKey: token,
      model: "cookkit-assistant",
      baseURL: `${project.origin}/functions/v1/nebius-chat/v1`,
      headers: { apikey: headers.apikey },
    };
  } catch {
    throw new AgentUnavailableError(
      "The assistant is temporarily unavailable. Please try again later."
    );
  }
}

export function describeMissingNebiusConfig(config: NebiusAgentConfig): string | null {
  return !config.apiKey || !config.model || !config.baseURL
    ? "The assistant connection is unavailable."
    : null;
}
