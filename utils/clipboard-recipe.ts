import { normalizeSharedRecipe } from "./shared-recipe";

export interface ClipboardRecipe {
  url: string;
  text?: string;
  platform: "YouTube" | "TikTok";
}

/** Recognize a video locally. Never fetch copied URLs before import consent. */
export function getClipboardRecipe(content: string): ClipboardRecipe | null {
  const input = normalizeSharedRecipe({ text: content });
  if (!input?.url) return null;
  try {
    const url = new URL(input.url);
    if (url.username || url.password || url.port) return null;
    const host = url.hostname;
    let id: string | undefined;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
      id =
        url.pathname === "/watch"
          ? (url.searchParams.get("v") ?? undefined)
          : url.pathname.match(/^\/(?:shorts|live)\/([\w-]{11})\/?$/)?.[1];
    } else if (host === "youtu.be") {
      id = url.pathname.match(/^\/([\w-]{11})\/?$/)?.[1];
    }
    if (id && /^[\w-]{11}$/.test(id)) {
      return {
        url: `https://www.youtube.com/watch?v=${id}`,
        text: input.text,
        platform: "YouTube",
      };
    }
    if (!["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(host))
      return null;
    const valid =
      host === "vm.tiktok.com" || host === "vt.tiktok.com"
        ? /^\/[A-Za-z0-9]{4,64}\/?$/.test(url.pathname)
        : /^\/(?:@[\w.-]+\/video\/\d+|t\/[A-Za-z0-9]{4,64})\/?$/.test(url.pathname);
    if (!valid) return null;
    url.protocol = "https:";
    if (host === "tiktok.com") url.hostname = "www.tiktok.com";
    url.search = "";
    url.hash = "";
    return { url: url.toString(), text: input.text, platform: "TikTok" };
  } catch {
    return null;
  }
}

export function clipboardRecipeIdentity(recipe: ClipboardRecipe): string {
  const post = recipe.url.match(/\/video\/(\d+)/)?.[1];
  return post ? `tiktok:${post}` : recipe.url.replace(/\/$/, "");
}
