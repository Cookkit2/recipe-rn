/**
 * Safely parses a JSON string, returning a fallback value if parsing fails
 * or if the input is null/undefined.
 */
export function safeJsonParse<T>(json: string | undefined | null, fallback: T): T {
  if (!json) return fallback;

  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
