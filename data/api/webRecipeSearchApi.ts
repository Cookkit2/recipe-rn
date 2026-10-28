import { getAIProxyConnection } from "~/lib/ai/proxy-connection";
import type { WebRecipeSearchResult } from "~/types/WebRecipeSearch";
import { normalizeWebRecipeUrl } from "~/utils/web-recipe-search";

export async function searchWebRecipes(
  query: string,
  signal?: AbortSignal
): Promise<WebRecipeSearchResult[]> {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl?.startsWith("https://")) throw new Error("Web recipe search is not available yet.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 20_000);
  try {
    controller.signal.throwIfAborted();
    const connection = await getAIProxyConnection();
    controller.signal.throwIfAborted();
    const response = await fetch(`${baseUrl}/functions/v1/recipe-search`, {
      method: "POST",
      headers: { ...connection.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error("Search limit reached. Please try again later.");
      if (response.status === 503) throw new Error("Web recipe search is not available yet.");
      throw new Error("Couldn’t search the web. Please try again.");
    }
    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      !("results" in payload) ||
      !Array.isArray(payload.results)
    )
      throw new Error("Couldn’t read the search results. Please try again.");
    return payload.results
      .filter(
        (row): row is WebRecipeSearchResult =>
          row &&
          typeof row === "object" &&
          normalizeWebRecipeUrl(row.url) !== null &&
          typeof row.title === "string" &&
          typeof row.description === "string" &&
          typeof row.source === "string"
      )
      .slice(0, 8);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
