/**
 * Deep-link ingestion hook for recipe sharing (issue #737 MVP).
 *
 * Subscribes to the `cookkit://recipe/<id>` custom scheme on BOTH cold start
 * (`Linking.getInitialURL()`) and foreground app-links
 * (`Linking.addEventListener("url")`), delegating each event to the pure
 * `handleShareDeepLink` handler (in utils/deep-link-share.ts). That handler:
 *  - emits `share_link_opened` (with whether the recipe is local);
 *  - if a local recipe with that id exists, navigates to the recipe detail
 *    route so the user lands on the shared recipe;
 *  - otherwise surfaces a clear "recipe not in your library" state (the
 *    server-snapshot fetch for UNOWNED recipes is DEFERRED — see the PR body).
 *
 * The MVP resolves LOCAL recipes only. This keeps the feature testable in CI
 * (no Supabase migration, no owner's database) and establishes the deep-link
 * plumbing that the deferred server snapshot will slot into.
 */

import { useEffect, useRef } from "react";
import { Linking, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { handleShareDeepLink } from "~/utils/deep-link-share";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { emitShareLinkOpened } from "~/lib/analytics/funnel-events";

// Re-export so callers can import the pure handler from this module too.
export { handleShareDeepLink } from "~/utils/deep-link-share";
export type { HandleShareDeepLinkDeps } from "~/utils/deep-link-share";

/**
 * React hook: wires cold-start + foreground deep-link listeners to
 * `handleShareDeepLink`. Mount once near the app root (app/_layout.tsx).
 *
 * Uses an in-flight ref so a rapid foreground-then-cold-start double-fire
 * (or a duplicate initial-URL + listener event on some Android versions) does
 * not navigate twice.
 */
export function useDeepLinkShare(): void {
  const router = useRouter();
  const inFlight = useRef(false);

  useEffect(() => {
    const alertNotInLibrary = (recipeId: string) => {
      // The server-snapshot import flow is DEFERRED. Until it lands, give the
      // recipient an unambiguous state rather than a silent spinner.
      Alert.alert(
        "Recipe not in your library",
        `This recipe isn't saved on this device yet. Ask the person who shared it to cook from Cookkit together, or save it to your library first.\n\n(Recipe id: ${recipeId})`,
        [{ text: "OK" }]
      );
    };

    const run = (url: string | null | undefined) => {
      if (inFlight.current) return;
      inFlight.current = true;
      void handleShareDeepLink(url, {
        getRecipeById: (id) => databaseFacade.getRecipeById(id),
        navigate: (path) => router.push(path),
        alertNotInLibrary,
        emitOpened: emitShareLinkOpened,
      }).finally(() => {
        inFlight.current = false;
      });
    };

    // Cold start: resolve the URL the app was launched with.
    Linking.getInitialURL()
      .then(run)
      .catch(() => {
        /* best-effort; foreground listener still arms below */
      });

    // Foreground: arm the listener for app-links while already running.
    const sub = Linking.addEventListener("url", ({ url }) => run(url));

    return () => {
      sub.remove();
    };
  }, [router]);
}

/**
 * Whether the deep-link ingestion surface is active on this platform. Kept as
 * an explicit gate so web (which has no custom-scheme handling) can no-op
 * cleanly rather than registering listeners that never fire.
 */
export const DEEP_LINK_SHARING_ENABLED = Platform.OS === "ios" || Platform.OS === "android";
