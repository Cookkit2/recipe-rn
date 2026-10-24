/** Public links contain an opaque snapshot token, never a device-local recipe ID. */
export const RECIPE_SHARE_ORIGIN = "https://recipe-web-mings-projects-6bb85e23.vercel.app";
export const RECIPE_SHARE_HEALTH_PATH = "/api/recipe-sharing/health";
export const COOKKIT_APP_STORE_URL = "https://apps.apple.com/app/cookkit/id6752543191";
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRecipeShareToken(value: string): boolean {
  return TOKEN.test(value);
}

export function buildRecipeShareLink(token: string): string {
  if (!isRecipeShareToken(token)) throw new Error("Invalid recipe share token");
  return `${RECIPE_SHARE_ORIGIN}/r/${token.toLowerCase()}`;
}

export function parseRecipeShareLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.port) return null;
    const publicLink = url.origin === RECIPE_SHARE_ORIGIN;
    const appLink = url.protocol === "cookkit:" && url.hostname === "share";
    if (!publicLink && !appLink) return null;
    const match = url.pathname.match(publicLink ? /^\/r\/([^/]+)\/?$/ : /^\/([^/]+)\/?$/);
    const token = match?.[1];
    return token && isRecipeShareToken(token) ? token.toLowerCase() : null;
  } catch {
    return null;
  }
}
