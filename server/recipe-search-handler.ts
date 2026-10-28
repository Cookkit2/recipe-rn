import type { WebRecipeSearchResult } from "../types/WebRecipeSearch.ts";
import { normalizeWebRecipeQuery, normalizeWebRecipeUrl } from "../utils/web-recipe-search.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_BODY_BYTES = 2048;

interface HandlerOptions {
  apiKey?: string;
  authenticate: (token: string, signal: AbortSignal) => Promise<string | null>;
  consumeQuota: (userId: string, signal: AbortSignal) => Promise<boolean>;
  fetcher?: typeof fetch;
}

async function readBody(request: Request, signal: AbortSignal): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let bytes = 0;
  let text = "";
  const decoder = new TextDecoder();
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch {
    return null;
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

function resultsFromProvider(payload: unknown): WebRecipeSearchResult[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("results" in payload) ||
    !Array.isArray(payload.results)
  ) {
    throw new Error("Invalid search response");
  }
  const seen = new Set<string>();
  const results: WebRecipeSearchResult[] = [];
  for (const row of payload.results.slice(0, 20)) {
    if (!row || typeof row !== "object") continue;
    const url = normalizeWebRecipeUrl(row.url);
    if (!url || seen.has(url) || typeof row.title !== "string" || !row.title.trim()) continue;
    const description = typeof row.content === "string" ? row.content.slice(0, 600) : "";
    // Search can also return shop/category pages. Keep results with recipe evidence.
    if (
      !/recipe|ingredients|instructions|directions|cooking|\btbsp\b|\btsp\b/i.test(
        `${row.title} ${description}`
      )
    )
      continue;
    const imageUrl = Array.isArray(row.images)
      ? row.images
          .map((image: unknown) =>
            normalizeWebRecipeUrl(
              typeof image === "string"
                ? image
                : image && typeof image === "object" && "url" in image
                  ? image.url
                  : null
            )
          )
          .find((image: string | null) => image?.startsWith("https://"))
      : undefined;
    seen.add(url);
    results.push({
      url,
      title: row.title.trim().slice(0, 240),
      description,
      source: new URL(url).hostname.replace(/^www\./, ""),
      ...(imageUrl ? { imageUrl } : {}),
    });
    if (results.length === 8) break;
  }
  return results;
}

export function createRecipeSearchHandler({
  apiKey,
  authenticate,
  consumeQuota,
  fetcher = fetch,
}: HandlerOptions) {
  return async (request: Request): Promise<Response> => {
    const json = (body: unknown, status = 200) =>
      Response.json(body, {
        status,
        headers: { ...cors, "Cache-Control": "no-store" },
      });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return json({ error: "Authentication required." }, 401);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]);
    try {
      const userId = await authenticate(token, signal);
      if (!userId) return json({ error: "Authentication required." }, 401);
      const input = await readBody(request, signal);
      signal.throwIfAborted();
      const query =
        input && typeof input === "object" && "query" in input && typeof input.query === "string"
          ? normalizeWebRecipeQuery(input.query)
          : "";
      if (query.length < 2 || query.length > 200)
        return json({ error: "Search using 2–200 characters." }, 400);
      if (!apiKey) return json({ error: "Web recipe search is not available yet." }, 503);
      if (!(await consumeQuota(userId, signal)))
        return json({ error: "Search limit reached. Please try again later." }, 429);
      const response = await fetcher("https://api.tavily.com/search", {
        method: "POST",
        signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${query} recipe ingredients instructions`,
          topic: "general",
          search_depth: "basic",
          max_results: 10,
          include_images: true,
          include_answer: false,
          include_raw_content: false,
          auto_parameters: false,
        }),
      });
      if (!response.ok) return json({ error: "Web search is unavailable. Please try again." }, 502);
      return json({ results: resultsFromProvider(await response.json()) });
    } catch {
      return json(
        {
          error: signal.aborted
            ? "Web search timed out. Please try again."
            : "Web search is unavailable. Please try again.",
        },
        signal.aborted ? 504 : 502
      );
    }
  };
}
