import { useEffect, useRef, useState } from "react";
import { Linking, Alert, Platform } from "react-native";
import {
  useNavigationContainerRef,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner-native";
import { handleShareDeepLink } from "~/utils/deep-link-share";
import { parseRecipeDeepLink } from "~/utils/recipe-share";
import { parseRecipeShareLink } from "~/utils/recipe-share-link";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { fetchRecipeShare } from "~/data/api/recipeShareApi";
import { storageFacade as storage } from "~/data/storage";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import { emitShareLinkOpened } from "~/lib/analytics/funnel-events";
import { resolveSharedRecipe } from "~/lib/resolve-shared-recipe";
import { findMatchingSharedRecipe } from "~/lib/find-matching-shared-recipe";
import { getResolvedRecipeShareId, rememberResolvedRecipeShareId } from "~/lib/recipe-share-cache";

export { handleShareDeepLink } from "~/utils/deep-link-share";
export type { HandleShareDeepLinkDeps } from "~/utils/deep-link-share";
export const DEEP_LINK_SHARING_ENABLED = Platform.OS === "ios" || Platform.OS === "android";
const PENDING_KEY = "pending_cookkit_recipe_link";

/** Persist incoming links through cold launch/onboarding; import once the navigator is ready. */
export function useDeepLinkShare(): void {
  const router = useRouter();
  const navigation = useNavigationContainerRef();
  const root = useRootNavigationState();
  const segments = useSegments();
  const queries = useQueryClient();
  const [pending, setPending] = useState(() => storage.get<string>(PENDING_KEY));
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(() => navigation.isReady());
  const running = useRef(false);
  const mounted = useRef(false);
  const lastReceived = useRef({ key: "", time: 0 });

  useEffect(() => {
    if (!DEEP_LINK_SHARING_ENABLED) return;
    mounted.current = true;
    const receive = (url: string | null | undefined) => {
      if (!mounted.current || !url) return;
      const token = parseRecipeShareLink(url);
      if (!token && parseRecipeDeepLink(url).kind !== "recipe") return;
      const key = token ?? url;
      const last = lastReceived.current;
      if (last.key === key && Date.now() - last.time < 1500) return;
      lastReceived.current = { key, time: Date.now() };
      storage.set(PENDING_KEY, url);
      setPending(url);
      setRevision((value) => value + 1);
    };
    void Linking.getInitialURL()
      .then(receive)
      .catch(() => {});
    const links = Linking.addEventListener("url", ({ url }) => receive(url));
    const state = navigation.addListener("state", () => setReady(navigation.isReady()));
    setReady(navigation.isReady());
    return () => {
      mounted.current = false;
      toast.dismiss("open-shared-recipe");
      links.remove();
      state();
    };
  }, [navigation]);

  const canOpen =
    !!root?.key &&
    ready &&
    navigation.isReady() &&
    storage.get<boolean>(ONBOARDING_COMPLETED_KEY) === true &&
    segments[0] !== "onboarding";
  useEffect(() => {
    if (!DEEP_LINK_SHARING_ENABLED || !canOpen || !pending || running.current) return;
    running.current = true;
    const toastId = "open-shared-recipe";
    void (async () => {
      try {
        const token = parseRecipeShareLink(pending);
        if (token) {
          toast.loading("Opening shared recipe…", { id: toastId, duration: Infinity });
          const id = await resolveSharedRecipe(token, {
            getRecipeById: (id) => databaseFacade.getRecipeById(id),
            fetchSnapshot: fetchRecipeShare,
            findMatchingRecipe: (snapshot) => findMatchingSharedRecipe(snapshot, databaseFacade),
            getResolvedRecipeId: getResolvedRecipeShareId,
            rememberResolvedRecipeId: rememberResolvedRecipeShareId,
            createRecipe: (data) => databaseFacade.createRecipe(data),
          });
          if (!mounted.current) return;
          await queries.invalidateQueries({ queryKey: ["recipes"] });
          if (!mounted.current) return;
          emitShareLinkOpened(id, false);
          router.push(`/recipes/${id}`);
          toast.dismiss(toastId);
        } else {
          await handleShareDeepLink(pending, {
            getRecipeById: (id) => databaseFacade.getRecipeById(id),
            navigate: (path) => {
              if (mounted.current) router.push(path as never);
            },
            alertNotInLibrary: () =>
              Alert.alert(
                "Recipe unavailable",
                "Ask the sender to share a new recipe link from Cookkit."
              ),
            emitOpened: emitShareLinkOpened,
          });
        }
        if (storage.get<string>(PENDING_KEY) === pending) storage.delete(PENDING_KEY);
      } catch (error) {
        if (!mounted.current) return;
        // Leave the persisted link for another launch, with an immediate retry too.
        toast.error(error instanceof Error ? error.message : "Couldn't open this recipe.", {
          id: toastId,
          duration: 12000,
          action: { label: "Try again", onClick: () => setRevision((value) => value + 1) },
        });
      } finally {
        running.current = false;
        if (mounted.current) {
          const next = storage.get<string>(PENDING_KEY);
          setPending(next);
          if (next && next !== pending) setRevision((value) => value + 1);
        }
      }
    })();
  }, [pending, canOpen, revision, router, queries]);
}
