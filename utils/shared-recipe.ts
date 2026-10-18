import type { SharedRecipeInput } from "~/types/SharedRecipe";

/** Raw SDK 58 payloads preserve captions even when a social URL cannot be resolved. */
export function normalizeIncomingRecipeShare(
  payloads: readonly { shareType?: string; value?: string }[]
): SharedRecipeInput | null {
  const text = [
    ...new Set(
      payloads
        .filter(({ shareType }) => !shareType || shareType === "text")
        .map(({ value }) => value?.trim() ?? "")
        .filter(Boolean)
    ),
  ].join("\n\n");
  const webUrl = payloads.find(({ shareType, value }) => shareType === "url" && value)?.value;
  return normalizeSharedRecipe({ webUrl, text });
}

export function normalizeSharedRecipe(input: {
  webUrl?: string | null;
  text?: string | null;
}): SharedRecipeInput | null {
  const text = input.text?.trim().slice(0, 32000) ?? "";
  const rawUrl =
    input.webUrl?.trim() || text.match(/https?:\/\/[^\s<>]+/i)?.[0]?.replace(/[.,)\]]+$/, "");
  let url: string | undefined;
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
      url = parsed.toString();
    } catch {
      return null;
    }
  }
  const caption = text.replace(/https?:\/\/[^\s<>]+/gi, "").trim();
  if (!url && !caption) return null;
  return { url, text: caption || undefined };
}
