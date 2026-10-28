import { createRecipeSearchHandler } from "../../../server/recipe-search-handler.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}
const supabaseUrl = requiredEnv("SUPABASE_URL");
const anonKey = requiredEnv("SUPABASE_ANON_KEY");
const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const dailyLimit = Math.max(
  1,
  Math.min(1000, Math.floor(Number(Deno.env.get("AI_REQUESTS_PER_DAY")) || 200))
);

Deno.serve(
  createRecipeSearchHandler({
    apiKey: Deno.env.get("TAVILY_API_KEY"),
    async authenticate(token, signal) {
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
        signal,
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error("Authentication unavailable");
      const user = await response.json();
      return typeof user.id === "string" ? user.id : null;
    },
    async consumeQuota(userId, signal) {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_ai_request`, {
        method: "POST",
        signal,
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_user_id: userId, p_limit: dailyLimit }),
      });
      if (!response.ok) throw new Error("Quota unavailable");
      return (await response.json()) === true;
    },
  })
);
