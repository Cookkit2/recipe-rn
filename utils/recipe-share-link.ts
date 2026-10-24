/** Public links contain an opaque snapshot token, never a device-local recipe ID. */
export const RECIPE_SHARE_ORIGIN = "https://recipe-web-mings-projects-6bb85e23.vercel.app";
export const RECIPE_SHARE_HEALTH_PATH = "/api/recipe-sharing/health";
export const COOKKIT_APP_STORE_URL = "https://apps.apple.com/app/cookkit/id6752543191";
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Encode all 16 UUID bytes without truncation, preserving the token's randomness. */
function compactToken(token: string): string {
  const hex = token.replaceAll("-", "");
  let value = 0;
  let bits = 0;
  let result = "";
  for (let index = 0; index < hex.length; index += 2) {
    value = (value << 8) | Number.parseInt(hex.slice(index, index + 2), 16);
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      result += BASE64URL.charAt((value >> bits) & 63);
    }
    value &= (1 << bits) - 1;
  }
  return result + BASE64URL.charAt(value << (6 - bits));
}

/** Decode canonical Base64URL while retaining support for existing UUID links. */
function expandToken(token: string): string | null {
  if (isRecipeShareToken(token)) return token.toLowerCase();
  if (!/^[A-Za-z0-9_-]{21}[AQgw]$/.test(token)) return null;
  let value = 0;
  let bits = 0;
  let hex = "";
  for (const char of token) {
    value = (value << 6) | BASE64URL.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      hex += ((value >> bits) & 255).toString(16).padStart(2, "0");
      value &= (1 << bits) - 1;
    }
  }
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return isRecipeShareToken(uuid) ? uuid : null;
}

export function isRecipeShareToken(value: string): boolean {
  return TOKEN.test(value);
}

export function buildRecipeShareLink(token: string): string {
  if (!isRecipeShareToken(token)) throw new Error("Invalid recipe share token");
  return `${RECIPE_SHARE_ORIGIN}/r/${compactToken(token)}`;
}

export function parseRecipeShareLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    // Reject user information and non-default ports in shared URLs.
    if (url.username) return null;
    if (url.password) return null;
    if (url.port) return null;
    const publicLink = url.origin === RECIPE_SHARE_ORIGIN;
    const appLink = url.protocol === "cookkit:" && url.hostname === "share";
    if (!publicLink && !appLink) return null;
    const match = url.pathname.match(publicLink ? /^\/r\/([^/]+)\/?$/ : /^\/([^/]+)\/?$/);
    const token = match?.[1];
    return token ? expandToken(token) : null;
  } catch {
    return null;
  }
}
