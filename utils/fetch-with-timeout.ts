/**
 * Fetch with AbortController-based timeout.
 * Aborts the request after timeoutMs; rejects with AbortError when timeout fires.
 * Honors an existing options.signal (e.g. from React Query) - aborts when either
 * the timeout or the external signal fires.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = options.signal;

  const onAbort = (): void => {
    controller.abort();
    clearTimeout(timeoutId);
  };
  externalSignal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    externalSignal?.removeEventListener("abort", onAbort);
    clearTimeout(timeoutId);
  }
}
