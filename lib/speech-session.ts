let current: symbol | undefined;

/** The native recognizer emits global events, so microphone commands and file imports share a lease. */
export function acquireSpeechSession(owner: "voice" | "recipe-video"): symbol | undefined {
  if (current) return;
  current = Symbol(owner);
  return current;
}

export function ownsSpeechSession(token: symbol | undefined): boolean {
  return token !== undefined && token === current;
}

export function releaseSpeechSession(token: symbol | undefined): void {
  if (ownsSpeechSession(token)) current = undefined;
}
