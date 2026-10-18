/** Public prototype config. These EXPO_PUBLIC values are embedded in the app binary. */

export const NEBIUS_DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1";

/**
 * Model used in Nebius Token Factory's function-calling guide.
 * Stronger agent models such as nvidia/nemotron-3-super-120b-a12b can be set
 * with EXPO_PUBLIC_NEBIUS_MODEL after the owner confirms the id.
 */
export const RECOMMENDED_NEBIUS_TOOL_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-fast";

export interface NebiusAgentConfig {
  apiKey: string;
  model: string;
  baseURL: string;
}

export function readNebiusAgentConfig(
  env: Record<string, string | undefined> = process.env
): NebiusAgentConfig {
  const apiKey = env.EXPO_PUBLIC_NEBIUS_API_KEY?.trim() ?? "";
  const model = env.EXPO_PUBLIC_NEBIUS_MODEL?.trim() ?? "";
  const configuredBase = env.EXPO_PUBLIC_NEBIUS_BASE_URL?.trim() || NEBIUS_DEFAULT_BASE_URL;
  return {
    apiKey,
    model,
    baseURL: configuredBase.replace(/\/+$/, ""),
  };
}

export function describeMissingNebiusConfig(config: NebiusAgentConfig): string | null {
  if (!config.apiKey) {
    return "Set EXPO_PUBLIC_NEBIUS_API_KEY to use the cooking assistant. This prototype key ships in the app bundle and must move to a backend before release.";
  }
  if (!config.model) {
    return `Set EXPO_PUBLIC_NEBIUS_MODEL. Recommended tool-calling model: ${RECOMMENDED_NEBIUS_TOOL_MODEL}.`;
  }
  return null;
}
