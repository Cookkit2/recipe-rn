export const PANTRY_UPDATE_UNCERTAIN_MESSAGE =
  "A pantry update may still finish. Check your pantry before trying again.";

const MESSAGES = {
  uncertainPantryUpdate: PANTRY_UPDATE_UNCERTAIN_MESSAGE,
  unknown: "Something went wrong, please try again later",
  timeout: "The assistant took too long to respond. Please try again.",
  network: "Unable to connect. Check your connection and try again.",
  busy: "The assistant is busy. Please try again in a moment.",
  unavailable: "The assistant is temporarily unavailable. Please try again later.",
} as const;

/** Only allow known, app-owned copy across the chat UI boundary. */
export function assistantErrorMessage(error: unknown, depth = 0): string {
  const details = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const message = typeof error === "string" ? error : String(details.message ?? "");
  if (Object.values(MESSAGES).some((safe) => safe === message)) return message;

  const status = details.statusCode ?? details.status;
  if (status === 429) return MESSAGES.busy;
  if (
    status === 408 ||
    status === 504 ||
    details.name === "TimeoutError" ||
    /\b(timed?\s*out|timeout|ETIMEDOUT)\b/i.test(message)
  )
    return MESSAGES.timeout;
  if (
    /network request failed|failed to fetch|fetch failed|networkerror|ECONNREFUSED|ENOTFOUND|offline/i.test(
      message
    ) ||
    details.name === "NetworkError"
  )
    return MESSAGES.network;
  if (status === 401 || status === 403 || (typeof status === "number" && status >= 500)) {
    return MESSAGES.unavailable;
  }
  // SDK retry wrappers keep the useful status on their cause/lastError.
  const cause = details.cause ?? details.lastError;
  if (cause && depth < 3) return assistantErrorMessage(cause, depth + 1);
  return MESSAGES.unknown;
}
