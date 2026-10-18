/**
 * Streaming globals used by the AI SDK's OpenAI-compatible client.
 *
 * Expo SDK 58 already installs these on device before app code runs:
 * - `import "expo"` loads the winter runtime (`expo/src/winter/runtime.native.ts`),
 *   which polyfills `structuredClone` (`@ungap/structured-clone`), `TextDecoderStream`,
 *   `TextEncoderStream`, and `Symbol.asyncIterator`.
 * - That same runtime replaces global `fetch` with `expo/fetch` unless
 *   `EXPO_PUBLIC_USE_RN_FETCH` is set. React Native's own fetch does not stream
 *   response bodies, so the agent passes `expo/fetch` explicitly.
 * - Hermes provides `TextEncoder` / `TextDecoder`. Metro injects `ReadableStream`.
 *
 * No extra polyfill packages are required for this Expo and AI SDK pair.
 * Node 22 (Jest and the smoke script) already has the same globals.
 */
const REQUIRED_GLOBALS = [
  "TextEncoder",
  "TextDecoder",
  "TextDecoderStream",
  "ReadableStream",
  "TransformStream",
  "structuredClone",
] as const;

export function missingCookingAgentGlobals(): string[] {
  return REQUIRED_GLOBALS.filter((name) => typeof globalThis[name] !== "function");
}

export function assertCookingAgentRuntime(): void {
  const missing = missingCookingAgentGlobals();
  if (missing.length === 0) return;
  throw new Error(
    `Cooking assistant streaming needs ${missing.join(", ")}. On device these come from the Expo winter runtime and Hermes; no extra polyfill package is bundled.`
  );
}

export async function resolveStreamingFetch(
  override?: typeof globalThis.fetch
): Promise<typeof globalThis.fetch> {
  if (override) return override;
  const expoFetch = await import("expo/fetch");
  if (typeof expoFetch.fetch !== "function") {
    throw new Error("expo/fetch did not provide a fetch function for streaming.");
  }
  return expoFetch.fetch as unknown as typeof globalThis.fetch;
}
