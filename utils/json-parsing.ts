import { log } from "~/utils/logger";

/**
 * Safely parses a JSON string, returning `fallback` on errors or unexpected shape.
 */
export function safeJsonParse<T>(json: string | undefined | null, fallback: T): T {
  if (!json) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(json);

    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      log.warn("safeJsonParse: Parsed JSON is not an array, falling back.");
      return fallback;
    }

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
