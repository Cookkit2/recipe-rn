/** Shared by the app and Edge Function. Never fetch these URLs during search. */
export function normalizeWebRecipeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (
      !host.includes(".") ||
      host.endsWith(".local") ||
      host.endsWith(".localhost") ||
      host.includes(":") ||
      /^(?:0|10|127|169\.254|192\.168)\./.test(host) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(host)
    )
      return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|fbclid|gclid|msclkid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeWebRecipeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
