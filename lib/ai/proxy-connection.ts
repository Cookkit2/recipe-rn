import type { Session } from "@supabase/supabase-js";

let pendingGuestSession: Promise<Session> | undefined;

/** Lazily obtain a persisted guest session; pantry/offline use never requires a login. */
export async function getAIProxyConnection() {
  const customUrl = process.env.EXPO_PUBLIC_AI_PROXY_URL?.trim();
  if (
    __DEV__ &&
    customUrl &&
    /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\//.test(customUrl)
  ) {
    return { url: customUrl, headers: {} as Record<string, string> };
  }
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const url = customUrl || (supabaseUrl && `${supabaseUrl}/functions/v1/nebius-ai`);
  if (!url || !url.startsWith("https://") || !anonKey) {
    throw new Error("The AI service isn't configured yet.");
  }
  const { supabase } = await import("~/lib/supabase/supabase-client");
  if (!supabase) throw new Error("The AI service isn't configured yet.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Couldn't connect to the AI service. Please try again.");
  let session = data.session;
  if (!session) {
    pendingGuestSession ??= supabase.auth.signInAnonymously().then(({ data, error }) => {
      if (error || !data.session) {
        throw new Error("Guest AI access isn't available yet. Please try again later.");
      }
      return data.session;
    });
    try {
      session = await pendingGuestSession;
    } finally {
      pendingGuestSession = undefined;
    }
  }
  return {
    url,
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: anonKey },
  };
}
