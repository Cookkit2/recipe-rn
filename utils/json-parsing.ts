export function safeJsonParse<T>(json: string | undefined | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn("Failed to parse JSON string:", error, "String:", json);
    return fallback;
  }
}
