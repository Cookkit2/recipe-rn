import { log } from "./logger";

/**
 * Safely parses a JSON string.
 * @param json The JSON string to parse.
 * @param fallback The fallback value to return if parsing fails.
 * @returns The parsed object or the fallback value.
 */
export function safeJsonParse<T>(json: string | undefined | null, fallback: T): T {
  if (!json) {
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    log.error("Failed to parse JSON", {
      json,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}
