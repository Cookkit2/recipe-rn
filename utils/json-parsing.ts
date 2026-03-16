/**
 * Safely parses a JSON string, returning a fallback value if parsing fails or if the input is null/undefined.
 * This is particularly useful for WatermelonDB getters to prevent unhandled exceptions from corrupted data.
 *
 * @param json The JSON string to parse
 * @param fallback The fallback value to return if parsing fails
 * @returns The parsed object or the fallback value
 */
export function safeJsonParse<T>(json: string | undefined | null, fallback: T): T {
  if (!json) {
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    // We could log this error if needed, but for getters we usually just want to fail gracefully
    console.warn("Failed to parse JSON string:", error);
    return fallback;
  }
}
