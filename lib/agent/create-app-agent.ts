import { supabase } from "~/lib/supabase/supabase-client";
import { createCookingAgent } from "./factory";
import type { CookingAgent } from "./types";
import { readDeviceDietProfile } from "./tools/device-diet";
import {
  asCookingSupabase,
  createSignedOutCookingDataClient,
  createSupabaseCookingDataClient,
} from "./tools/supabase-cooking-data";

export function createAppCookingAgent(): CookingAgent {
  const data = supabase
    ? createSupabaseCookingDataClient(asCookingSupabase(supabase), readDeviceDietProfile)
    : createSignedOutCookingDataClient(
        "Supabase is not configured, so the assistant cannot read your pantry."
      );
  return createCookingAgent({ kind: "nebius", data });
}
