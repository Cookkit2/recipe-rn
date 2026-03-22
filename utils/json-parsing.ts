import { log } from "~/utils/logger";

/**
 * Safely parses a JSON string, providing robust error handling and type fallback.
 * Prevents throwing errors on malformed JSON and avoids exposing stack traces.
 *
 * @param json The JSON string to parse.
 * @param fallback The fallback value to return if parsing fails.
 * @returns The parsed object of type T, or the fallback value if parsing fails or input is empty/null.
 */
export function safeJsonParse<T>(json: string | undefined | null, fallback: T): T {
  if (!json) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(json);

    // Additional sanity check: if fallback is an array but parsed is not, return fallback
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      log.warn("safeJsonParse: Parsed JSON is not an array, falling back.");
      return fallback;
    }

    // Additional sanity check: if fallback is an object but parsed is not (or is array), return fallback
    if (
      fallback !== null &&
      typeof fallback === "object" &&
      !Array.isArray(fallback) &&
      (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    ) {
      log.warn("safeJsonParse: Parsed JSON is not a matching object type, falling back.");
      return fallback;
    }

    return parsed as T;
  } catch (error) {
    log.warn("Failed to safely parse JSON. Returning fallback value.");
    return fallback;
  }
}
