import { supabase } from "~/lib/supabase/supabase-client";
import type { QueryClient } from "@tanstack/react-query";
import { pantryApi } from "~/data/api/pantryApi";
import { pantryQueryKeys } from "~/hooks/queries/pantryQueryKeys";
import { recipeQueryKeys } from "~/hooks/queries/recipeQueryKeys";
import { createCookingAgent } from "./factory";
import type { CookingAgent } from "./types";
import { readDeviceDietProfile } from "./tools/device-diet";
import { withLocalPantry } from "./tools/local-pantry";
import { EMPTY_DIET_PROFILE } from "./tools/planning";
import {
  asCookingSupabase,
  createSignedOutCookingDataClient,
  createSupabaseCookingDataClient,
} from "./tools/supabase-cooking-data";

export function createAppCookingAgent(queryClient?: QueryClient): CookingAgent {
  const cloudData = supabase
    ? createSupabaseCookingDataClient(asCookingSupabase(supabase), readDeviceDietProfile)
    : createSignedOutCookingDataClient(
        "Supabase is not configured, so the assistant cannot read the recipe catalog."
      );
  const data = withLocalPantry(
    {
      ...cloudData,
      getDietProfile: supabase
        ? cloudData.getDietProfile
        : async () => readDeviceDietProfile() ?? EMPTY_DIET_PROFILE,
    },
    pantryApi,
    () => {
      void queryClient?.invalidateQueries({ queryKey: pantryQueryKeys.all });
      void queryClient?.invalidateQueries({ queryKey: recipeQueryKeys.all });
    }
  );
  return createCookingAgent({ kind: "nebius", data });
}
